import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  APIProvider,
  Circle,
  Map,
  Marker,
  type MapMouseEvent,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Crosshair, LocateFixed, MapPinned } from "lucide-react";
import { Badge, Button, Input, SearchInput } from "ui";
import { useGoogleMapsRuntimeConfig } from "../../../common/queries/useGoogleMapsIntegration";

declare const google: any;

const defaultCenter = { lat: 19.076, lng: 72.8777 };

type GeofenceField = "latitude" | "longitude" | "geofenceRadiusM";
type LatLng = { lat: number; lng: number };
type PlacePrediction = {
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  description?: string;
};

type GeocodeResultLike = {
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

type ProjectGeofencePickerProps = {
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
  errors?: Partial<Record<GeofenceField, string>>;
  onChange: (field: GeofenceField, value: string) => void;
};

function MapViewportSync({
  center,
  zoom,
}: {
  center: LatLng;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [center, map, zoom]);

  return null;
}

function GeofenceSearch({
  onResolvedCoordinates,
}: {
  onResolvedCoordinates: (coords: LatLng) => void;
}) {
  const places = useMapsLibrary("places");
  const geocoding = useMapsLibrary("geocoding");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const requestIdRef = useRef(0);
  const resolutionCompletedRef = useRef(false);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (!places || !geocoding) return;
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new places.AutocompleteService();
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new geocoding.Geocoder();
    }
  }, [places, geocoding]);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !autocompleteServiceRef.current) {
      setResults([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timerId = window.setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        { input: trimmedQuery },
        (predictions: PlacePrediction[] | null, status: string) => {
          if (requestId !== requestIdRef.current) return;
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !predictions?.length
          ) {
            setResults([]);
            return;
          }
          setResults(predictions);
          setOpen(true);
        },
      );
    }, 220);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [query]);

  const resolveCoordinates = (
    request: { placeId?: string; address?: string },
    onSuccess: (coords: LatLng) => void,
  ) => {
    if (request.placeId && places) {
      try {
        const dummyDiv = document.createElement("div");
        const placesService = new places.PlacesService(dummyDiv);
        placesService.getDetails(
          { placeId: request.placeId, fields: ["geometry"] },
          (placeResult: any, status: string) => {
            if (
              (status === "OK" || status === google?.maps?.places?.PlacesServiceStatus?.OK) &&
              placeResult?.geometry?.location
            ) {
              const loc = placeResult.geometry.location;
              const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
              const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                onSuccess({ lat, lng });
                return;
              }
            }
            // Fallback to geocoder if PlacesService fails
            fallbackGeocoder(request, onSuccess);
          },
        );
        return;
      } catch {
        // Fallback to geocoder on error
      }
    }
    fallbackGeocoder(request, onSuccess);
  };

  const fallbackGeocoder = (
    request: { placeId?: string; address?: string },
    onSuccess: (coords: LatLng) => void,
  ) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode(
      request,
      (geocodeResults: GeocodeResultLike[] | null, status: string) => {
        if (
          (status !== "OK" && status !== google?.maps?.GeocoderStatus?.OK) ||
          !geocodeResults?.length
        ) {
          return;
        }
        const location = geocodeResults[0]?.geometry?.location;
        if (!location) return;
        const lat = typeof location.lat === "function" ? location.lat() : Number(location.lat);
        const lng = typeof location.lng === "function" ? location.lng() : Number(location.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          onSuccess({ lat, lng });
        }
      },
    );
  };

  const syncDropdownPosition = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropdownStyle({
      left: rect.left,
      top: rect.bottom + 6,
      width: rect.width,
    });
  };

  const handleSelect = (prediction: PlacePrediction) => {
    const nextQuery =
      prediction.description ??
      prediction.structured_formatting?.main_text ??
      "";
    skipSearchRef.current = true;
    setQuery(nextQuery);
    setResults([]);
    setOpen(false);
    setIsResolving(true);
    resolutionCompletedRef.current = false;

    const finalizeSuccess = (coords: LatLng) => {
      resolutionCompletedRef.current = true;
      setIsResolving(false);
      onResolvedCoordinates(coords);
    };

    const finalizeFailure = () => {
      if (resolutionCompletedRef.current) return;
      setIsResolving(false);
    };

    if (prediction.place_id) {
      resolveCoordinates({ placeId: prediction.place_id }, (coords) => {
        finalizeSuccess(coords);
      });

      window.setTimeout(() => {
        if (!resolutionCompletedRef.current && nextQuery) {
          resolveCoordinates({ address: nextQuery }, (coords) => {
            finalizeSuccess(coords);
          });
          window.setTimeout(finalizeFailure, 1200);
        } else if (!resolutionCompletedRef.current) {
          finalizeFailure();
        }
      }, 500);
      return;
    }

    if (nextQuery) {
      resolveCoordinates({ address: nextQuery }, (coords) => {
        finalizeSuccess(coords);
      });
      window.setTimeout(finalizeFailure, 1200);
    } else {
      finalizeFailure();
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (inputRef.current?.contains(target)) return;
      const dropdown = document.getElementById("project-geofence-results");
      if (dropdown?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleViewportChange = () => syncDropdownPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    syncDropdownPosition();

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  const showDropdown = open && results.length > 0;

  return (
    <div className="relative z-30">
      <SearchInput
        ref={inputRef}
        aria-label="Search place on Google Maps"
        value={query}
        placeholder="Search address, landmark, or building on Google Maps"
        className="h-11 rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
        onFocus={() => {
          syncDropdownPosition();
          if (results.length > 0) setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          syncDropdownPosition();
          setOpen(true);
        }}
      />
      {showDropdown ? (
        <div
          id="project-geofence-results"
          onPointerDown={(event) => event.stopPropagation()}
          style={dropdownStyle ?? undefined}
          className="fixed z-[1000] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,37,68,0.14)]"
        >
          <div className="max-h-72 overflow-y-auto py-1">
            {results.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelect(prediction);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelect(prediction);
                }}
              >
                <span className="text-sm font-extrabold text-secondary">
                  {prediction.structured_formatting?.main_text ??
                    prediction.description}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {prediction.structured_formatting?.secondary_text ?? ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {isResolving ? (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Fetching location details...
        </p>
      ) : null}
    </div>
  );
}

export function ProjectGeofencePicker({
  latitude,
  longitude,
  geofenceRadiusM,
  errors,
  onChange,
}: ProjectGeofencePickerProps) {
  const { apiKey, isLoading: mapsConfigLoading, isError: mapsConfigError } =
    useGoogleMapsRuntimeConfig();
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pulseFrame, setPulseFrame] = useState(0);
  const [mapCenter, setMapCenter] = useState<LatLng>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(11);

  const parsedCoordinates = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [latitude, longitude]);

  const radius = useMemo(() => {
    const next = Number(geofenceRadiusM);
    return Number.isFinite(next) && next > 0 ? next : 150;
  }, [geofenceRadiusM]);
  const pulseProgress = (Math.sin((pulseFrame / 60) * Math.PI * 2) + 1) / 2;
  const animatedRadius = Math.max(24, radius * (1 + pulseProgress * 0.05));
  const animatedFillOpacity = 0.08 + pulseProgress * 0.08;
  const animatedStrokeOpacity = 0.16 + pulseProgress * 0.2;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPulseFrame((current) => (current + 1) % 60);
    }, 90);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (parsedCoordinates) {
      setMapCenter(parsedCoordinates);
      setMapZoom(16);
      return;
    }
    setMapCenter(defaultCenter);
    setMapZoom(11);
  }, [parsedCoordinates]);

  const setCoordinates = (coords: LatLng) => {
    setMapCenter(coords);
    setMapZoom(16);
    onChange("latitude", coords.lat.toFixed(6));
    onChange("longitude", coords.lng.toFixed(6));
  };

  const handleMapClick = (event: MapMouseEvent) => {
    if (!event.detail.latLng) return;
    setCoordinates(event.detail.latLng);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Browser geolocation is not supported on this device.");
      return;
    }
    setLocationPending(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationPending(false);
      },
      () => {
        setLocationPending(false);
        setLocationError(
          "Unable to read your current location. Try place search or map pinning.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-card md:col-span-2">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-base font-extrabold text-secondary">
            Visit geofence
          </p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Add coordinates manually or pin the exact project spot on Google
            Maps for field-visit verification.
          </p>
        </div>
        <Badge className="border-0 bg-blue-50 text-blue-700">Optional</Badge>
      </div>

      <div className="mt-5">
        {apiKey ? (
          <APIProvider key={apiKey} apiKey={apiKey} libraries={["places"]}>
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-secondary">
                        Coordinates
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Enter exact latitude and longitude if you already have them.
                      </p>
                    </div>
                    {parsedCoordinates ? (
                      <Badge className="border-0 bg-emerald-50 text-emerald-700">
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-extrabold text-secondary">
                      Latitude
                      <Input
                        aria-label="Project latitude"
                        type="number"
                        inputMode="decimal"
                        step="0.000001"
                        value={latitude}
                        placeholder="19.076090"
                        invalid={Boolean(errors?.latitude)}
                        className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                        onChange={(event) => onChange("latitude", event.target.value)}
                      />
                      {errors?.latitude ? (
                        <span className="block text-xs font-bold text-destructive">
                          {errors.latitude}
                        </span>
                      ) : null}
                    </label>
                    <label className="space-y-2 text-sm font-extrabold text-secondary">
                      Longitude
                      <Input
                        aria-label="Project longitude"
                        type="number"
                        inputMode="decimal"
                        step="0.000001"
                        value={longitude}
                        placeholder="72.877426"
                        invalid={Boolean(errors?.longitude)}
                        className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                        onChange={(event) => onChange("longitude", event.target.value)}
                      />
                      {errors?.longitude ? (
                        <span className="block text-xs font-bold text-destructive">
                          {errors.longitude}
                        </span>
                      ) : null}
                    </label>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
                  <label className="space-y-2 text-sm font-extrabold text-secondary">
                    Radius (m)
                    <Input
                      aria-label="Project geofence radius"
                      type="number"
                      min={1}
                      step={1}
                      value={geofenceRadiusM}
                      placeholder="150"
                      invalid={Boolean(errors?.geofenceRadiusM)}
                      className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                      onChange={(event) =>
                        onChange("geofenceRadiusM", event.target.value)
                      }
                    />
                    {errors?.geofenceRadiusM ? (
                      <span className="block text-xs font-bold text-destructive">
                        {errors.geofenceRadiusM}
                      </span>
                    ) : null}
                  </label>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-muted-foreground">
                    Search above or click the map to pin the site entrance.
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-start rounded-md px-4 text-sm font-bold shadow-none"
                    onClick={useCurrentLocation}
                    disabled={locationPending}
                  >
                    <LocateFixed className="size-4" />
                    {locationPending ? "Locating..." : "Use current location"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-start rounded-md px-4 text-sm font-bold shadow-none"
                    onClick={() => {
                      onChange("latitude", "");
                      onChange("longitude", "");
                    }}
                  >
                    <Crosshair className="size-4" />
                    Clear coordinates
                  </Button>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <MapPinned className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-secondary">
                        Current pin
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {parsedCoordinates
                          ? `${parsedCoordinates.lat.toFixed(6)}, ${parsedCoordinates.lng.toFixed(6)}`
                          : "No geofence coordinates selected yet."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {locationError ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <p className="text-xs font-bold text-destructive">
                    {locationError}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {apiKey ? (
                  <GeofenceSearch
                    onResolvedCoordinates={setCoordinates}
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-muted-foreground">
                    Configure Google Maps in Workspace Settings to enable place
                    search and click-to-pin geofence selection.
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      Map picker
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Search a place or click the map to pin the project entrance.
                    </p>
                  </div>
                  <Badge className="border-0 bg-slate-100 text-slate-700">
                    Radius {radius} m
                  </Badge>
                </div>

                <div
                  className="relative z-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card"
                >
                  <Map
                    defaultCenter={parsedCoordinates ?? defaultCenter}
                    defaultZoom={parsedCoordinates ? 16 : 11}
                    gestureHandling="greedy"
                    disableDefaultUI
                    className="h-[360px] w-full"
                    onClick={handleMapClick}
                  >
                    <MapViewportSync center={mapCenter} zoom={mapZoom} />
                    {parsedCoordinates ? (
                      <>
                        <Circle
                          center={parsedCoordinates}
                          radius={animatedRadius}
                          strokeColor="#2563eb"
                          strokeOpacity={animatedStrokeOpacity}
                          strokeWeight={1}
                          fillColor="#2563eb"
                          fillOpacity={animatedFillOpacity}
                        />
                        <Marker position={parsedCoordinates} />
                        <Circle
                          center={parsedCoordinates}
                          radius={radius}
                          strokeColor="#2563eb"
                          strokeOpacity={0.85}
                          strokeWeight={2}
                          fillColor="#2563eb"
                          fillOpacity={0.14}
                        />
                      </>
                    ) : null}
                  </Map>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      {parsedCoordinates ? "Geofence active" : "Waiting for pin"}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Radius
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      {radius} m
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Method
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      Search or map pin
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </APIProvider>
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-muted-foreground">
              {mapsConfigLoading
                ? "Loading this workspace's Google Maps configuration..."
                : mapsConfigError
                  ? "Google Maps configuration could not be loaded. You can still enter coordinates manually."
                  : "Configure Google Maps in Workspace Settings to enable place search and click-to-pin geofence selection."}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
              <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3">
                  <p className="text-sm font-extrabold text-secondary">
                    Coordinates
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Enter exact latitude and longitude if you already have them.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-extrabold text-secondary">
                    Latitude
                    <Input
                      aria-label="Project latitude"
                      type="number"
                      inputMode="decimal"
                      step="0.000001"
                      value={latitude}
                      placeholder="19.076090"
                      invalid={Boolean(errors?.latitude)}
                      className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                      onChange={(event) => onChange("latitude", event.target.value)}
                    />
                    {errors?.latitude ? (
                      <span className="block text-xs font-bold text-destructive">
                        {errors.latitude}
                      </span>
                    ) : null}
                  </label>
                  <label className="space-y-2 text-sm font-extrabold text-secondary">
                    Longitude
                    <Input
                      aria-label="Project longitude"
                      type="number"
                      inputMode="decimal"
                      step="0.000001"
                      value={longitude}
                      placeholder="72.877426"
                      invalid={Boolean(errors?.longitude)}
                      className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                      onChange={(event) => onChange("longitude", event.target.value)}
                    />
                    {errors?.longitude ? (
                      <span className="block text-xs font-bold text-destructive">
                        {errors.longitude}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
                <label className="space-y-2 text-sm font-extrabold text-secondary">
                  Radius (m)
                  <Input
                    aria-label="Project geofence radius"
                    type="number"
                    min={1}
                    step={1}
                    value={geofenceRadiusM}
                    placeholder="150"
                    invalid={Boolean(errors?.geofenceRadiusM)}
                    className="h-11 rounded-md bg-white text-sm font-semibold shadow-none"
                    onChange={(event) =>
                      onChange("geofenceRadiusM", event.target.value)
                    }
                  />
                  {errors?.geofenceRadiusM ? (
                    <span className="block text-xs font-bold text-destructive">
                      {errors.geofenceRadiusM}
                    </span>
                  ) : null}
                </label>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md px-4 text-sm font-bold shadow-none"
                  onClick={() => {
                    onChange("latitude", "");
                    onChange("longitude", "");
                  }}
                >
                  <Crosshair className="size-4" />
                  Clear coordinates
                </Button>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <MapPinned className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-secondary">
                      Current pin
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {parsedCoordinates
                        ? `${parsedCoordinates.lat.toFixed(6)}, ${parsedCoordinates.lng.toFixed(6)}`
                        : "No geofence coordinates selected yet."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex h-[340px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-white px-6 text-center text-sm font-semibold text-muted-foreground">
              {mapsConfigLoading
                ? "Loading map configuration..."
                : "Google Maps is unavailable, but manual latitude, longitude, and radius entry remains available."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
