import { useEffect } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useGoogleMapsRuntimeConfig } from "../../common/queries/useGoogleMapsIntegration";

declare let google: any;

import type { FieldExecutiveVisit } from "./useFieldExecutive";

const defaultCenter = { lat: 19.076, lng: 72.8777 };
export type RouteOrigin = { lat: number; lng: number };

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function getProjectMarkerLabel(stop: FieldExecutiveVisit) {
  const labelSource = stop.projectName?.trim() || stop.leadName?.trim() || "V";
  return labelSource.match(/[a-z0-9]/i)?.[0]?.toUpperCase() ?? "V";
}

function ProjectVisitMarkers({ stops }: { stops: FieldExecutiveVisit[] }) {
  return (
    <>
      {stops.map((stop) => {
        const lat = parseCoordinate(stop.projectLatitude);
        const lng = parseCoordinate(stop.projectLongitude);
        if (lat === null || lng === null) return null;

        const label = getProjectMarkerLabel(stop);
        return (
          <Marker
            key={stop.id}
            position={{ lat, lng }}
            title={stop.projectName ?? stop.leadName ?? "Site visit"}
            label={{
              text: label,
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "700",
            }}
          />
        );
      })}
    </>
  );
}

function getStopDestination(stop: FieldExecutiveVisit) {
  const lat = parseCoordinate(stop.projectLatitude);
  const lng = parseCoordinate(stop.projectLongitude);
  return lat !== null && lng !== null
    ? { lat, lng }
    : stop.location ?? stop.projectName ?? defaultCenter;
}

function DirectionsLayer({
  stops,
  origin,
}: {
  stops: FieldExecutiveVisit[];
  origin: RouteOrigin | null;
}) {
  const map = useMap();
  const routes = useMapsLibrary("routes");

  useEffect(() => {
    if (
      !map ||
      !routes ||
      !stops.length ||
      !google?.maps?.DirectionsRenderer ||
      !google?.maps?.DirectionsService
    ) {
      return undefined;
    }
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
    });
    const service = new google.maps.DirectionsService();
    const destination = getStopDestination(stops[stops.length - 1]);
    if (!destination) return () => renderer.setMap(null);
    service.route(
      {
        origin: origin ?? getStopDestination(stops[0]),
        destination,
        waypoints: stops
          .slice(1, -1)
          .map((stop) => ({ location: getStopDestination(stop), stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === "OK" && result) {
          renderer.setDirections(result);
        }
      },
    );
    return () => renderer.setMap(null);
  }, [map, origin, routes, stops]);

  return null;
}

export function RouteMap({
  stops,
  routeStarted,
  origin,
}: {
  stops: FieldExecutiveVisit[];
  routeStarted: boolean;
  origin: RouteOrigin | null;
}) {
  const { apiKey, isLoading, isError, refetch } =
    useGoogleMapsRuntimeConfig();

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-muted-foreground">
        Loading map configuration...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-muted-foreground">
        <span>Map configuration could not be loaded.</span>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-secondary"
          onClick={() => void refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-muted-foreground">
        Ask a workspace administrator to configure Google Maps to enable the
        live route map.
      </div>
    );
  }

  return (
    <APIProvider key={apiKey} apiKey={apiKey} libraries={["routes"]}>
      <div className="h-72 overflow-hidden rounded-lg border border-slate-200">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI
        >
          <DirectionsLayer stops={stops} origin={routeStarted ? origin : null} />
          <ProjectVisitMarkers stops={stops} />
        </Map>
      </div>
    </APIProvider>
  );
}
