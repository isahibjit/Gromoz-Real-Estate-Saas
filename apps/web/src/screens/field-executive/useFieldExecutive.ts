import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "../../common/api";
import { useAppSelector } from "../../store";

export interface FieldExecutiveVisit {
  id: string;
  displayId?: string;
  scheduledAt: string;
  time?: string;
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  projectId?: string;
  projectName?: string;
  location?: string;
  meetingPoint?: string;
  status: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  projectLatitude?: string | number | null;
  projectLongitude?: string | number | null;
  projectGeofenceRadiusM?: number | null;
}

export interface FieldExecutiveDashboardData {
  kpis: Record<string, number>;
  myDay: Record<string, number | string | null>;
  todaySchedule: FieldExecutiveVisit[];
  funnel: Array<{ label: string; value: number }>;
  checkInStatus: Record<string, number>;
  followUps: Array<{
    id: string;
    leadId: string;
    leadName: string;
    scheduledAt: string;
    nextAction: string;
  }>;
  recentActivities: Array<{
    id: string;
    title: string;
    description: string;
    occurredAt: string;
    type: string;
  }>;
}

export function useFieldExecutiveDashboard(): UseQueryResult<
  FieldExecutiveDashboardData,
  Error
> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<FieldExecutiveDashboardData>({
    queryKey: ["dashboard", "field-executive", userId, userRole],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api.get("/dashboard/field-executive")).data,
  });
}

export function useFieldExecutiveLeads(
  search: string,
): UseQueryResult<any, Error> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<any>({
    queryKey: ["field-executive", userId, userRole, "leads", search],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await api.get("/leads", {
          params: { limit: 100, search: search || undefined },
        })
      ).data,
  });
}

export function useFieldExecutiveVisits(
  search: string,
): UseQueryResult<FieldExecutiveVisit[], Error> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<FieldExecutiveVisit[]>({
    queryKey: ["field-executive", userId, userRole, "site-visits", search],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await api.get("/site-visits", {
          params: { limit: 100, search: search || undefined },
        })
      ).data,
  });
}

export function useFieldExecutiveFollowUps(
  search: string,
): UseQueryResult<any, Error> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<any>({
    queryKey: ["field-executive", userId, userRole, "follow-ups", search],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await api.get("/leads/field-executive/follow-ups", {
          params: {
            limit: 100,
            search: search || undefined,
            status: "pending",
          },
        })
      ).data,
  });
}

export interface LiveFieldExecutiveLocation {
  id: string;
  name: string;
  image?: string | null;
  role: string;
  isActive: boolean;
  tracking: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    trackedAt?: string;
    isTracking?: boolean;
  };
  activeVisit?: {
    id: string;
    displayId?: string;
    leadName: string;
    projectName?: string;
    scheduledAt: string;
    checkedInAt?: string;
  } | null;
  nextVisit?: {
    id: string;
    displayId?: string;
    leadName: string;
    projectName?: string;
    scheduledAt: string;
  } | null;
}

export function useLiveFieldExecutiveLocations(
  enabled = true,
): UseQueryResult<{ rows: LiveFieldExecutiveLocation[] }, Error> {
  return useQuery({
    queryKey: ["site-visits", "tracking", "live"],
    queryFn: async () => {
      const response = await api.get<{
        data?: LiveFieldExecutiveLocation[];
        rows?: LiveFieldExecutiveLocation[];
      }>("/site-visits/tracking/live");
      return { rows: response.data.rows ?? response.data.data ?? [] };
    },
    enabled,
    refetchInterval: enabled ? 25000 : false,
  });
}

export function useVisitAttendance(): {
  checkIn: UseMutationResult<
    any,
    Error,
    { id: string; position: GeolocationPosition }
  >;
  checkOut: UseMutationResult<
    any,
    Error,
    {
      id: string;
      position: GeolocationPosition;
      feedback: string;
      outcome?: string;
      rating?: string;
      nextAction?: string;
    }
  >;
} {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["dashboard", "field-executive"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["field-executive", "site-visits"],
    });
    void queryClient.invalidateQueries({ queryKey: ["site-visits"] });
  };
  const checkIn = useMutation({
    mutationFn: async ({
      id,
      position,
    }: {
      id: string;
      position: GeolocationPosition;
    }) =>
      (
        await api.post(`/site-visits/${id}/check-in`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      ).data,
    onSuccess: invalidate,
  });
  const checkOut = useMutation({
    mutationFn: async ({
      id,
      position,
      feedback,
      outcome,
      rating,
      nextAction,
    }: {
      id: string;
      position: GeolocationPosition;
      feedback: string;
      outcome?: string;
      rating?: string;
      nextAction?: string;
    }) =>
      (
        await api.post(`/site-visits/${id}/check-out`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          feedback,
          outcome,
          rating,
          nextAction,
        })
      ).data,
    onSuccess: invalidate,
  });
  return { checkIn, checkOut };
}

export interface FieldTrackingState {
  status:
    | "idle"
    | "active"
    | "permission-denied"
    | "unsupported"
    | "sync-failed";
  lastSyncedAt?: string;
  error?: string;
}

export function useFieldExecutiveLiveTracking(enabled: boolean) {
  const [state, setState] = useState<FieldTrackingState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return undefined;
    }
    if (!navigator.geolocation) {
      setState({
        status: "unsupported",
        error: "Location tracking is not available in this browser.",
      });
      return undefined;
    }

    let cancelled = false;

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          api
            .post("/site-visits/tracking/ping", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
            })
            .then(() => {
              if (!cancelled) {
                setState({
                  status: "active",
                  lastSyncedAt: new Date().toISOString(),
                });
              }
            })
            .catch(() => {
              if (!cancelled) {
                setState({
                  status: "sync-failed",
                  error: "Live location sync failed. Retrying automatically.",
                });
              }
            });
        },
        (error) => {
          if (cancelled) return;
          setState({
            status:
              error.code === error.PERMISSION_DENIED
                ? "permission-denied"
                : "sync-failed",
            error:
              error.code === error.PERMISSION_DENIED
                ? "Location permission is required for live tracking."
                : "Unable to read current location. Retrying automatically.",
          });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
      );
    };

    ping();
    const intervalId = window.setInterval(ping, 25000);

    const stopTracking = () => {
      navigator.sendBeacon?.(
        `${api.defaults.baseURL ?? "/api"}/site-visits/tracking/stop`,
      );
    };
    window.addEventListener("beforeunload", stopTracking);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", stopTracking);
    };
  }, [enabled]);

  return state;
}
