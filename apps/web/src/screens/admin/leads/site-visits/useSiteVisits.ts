import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "../../../../common/api";
import type { SiteVisitStatus } from "../details/leadDetailsTypes";

export interface ApiSiteVisitRow {
  id: string;
  displayId?: string;
  leadId: string;
  leadDisplayId?: string;
  leadName?: string;
  leadPhone?: string;
  leadSource?: string;
  leadStatus?: string;
  leadStage?: string;
  projectId?: string;
  unitId?: string;
  projectName?: string;
  projectLocation?: string;
  projectLatitude?: string | number | null;
  projectLongitude?: string | number | null;
  projectGeofenceRadiusM?: number | null;
  projectImageUrl?: string | null;
  projectImageGallery?: string[];
  unitLabel?: string;
  unitImageUrl?: string | null;
  unitImageGallery?: string[];
  status: SiteVisitStatus;
  visitType: string;
  scheduledAt: string;
  durationMinutes?: number;
  assignedExecutiveId?: string;
  assignedExecutiveName?: string;
  assignedExecutiveImage?: string;
  assignedExecutiveRole?: string;
  meetingPoint?: string;
  transportMode?: string;
  visitorCount?: number;
  specialRequest?: string;
  notes?: string;
  feedback?: string;
  rating?: number | null;
  reminderEnabled?: boolean;
  reminderAt?: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  createdAt: string;
}

export interface SiteVisitExecutiveOption {
  id: string;
  name: string;
  email?: string;
  role: string;
  image?: string;
}

export interface SiteVisitLeadOption {
  id: string;
  displayId: string;
  name: string;
  phone: string;
  sourceId?: string | null;
  sourceName?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  statusId?: string | null;
  statusName?: string | null;
  preferredProjectId?: string | null;
  preferredLocation?: string | null;
  configuration?: string | null;
  budgetRange?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  telecallerId?: string | null;
  telecallerName?: string | null;
  fieldExecutiveId?: string | null;
  fieldExecutiveName?: string | null;
}

export interface SiteVisitProjectOption {
  id: string;
  name: string;
  location: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  geofenceRadiusM?: number | null;
  priceRange?: string;
  salesOwner?: string;
  imageUrl?: string | null;
  imageGallery?: string[];
  units: Array<{
    id: string;
    tower?: string | null;
    unitNumber: string;
    configuration?: string | null;
    price?: string | number | null;
    availability: string;
    bookingStatus: string;
    imageUrl?: string | null;
    imageGallery?: string[];
  }>;
}

export interface SiteVisitOptionsResponse {
  executives: SiteVisitExecutiveOption[];
  leads: SiteVisitLeadOption[];
  projects: SiteVisitProjectOption[];
}

export function useSiteVisits(
  search: string,
  limit = 100,
  leadId?: string,
): UseQueryResult<{ rows: ApiSiteVisitRow[]; total: number }, Error> {
  return useQuery({
    queryKey: ["site-visits", search, limit, leadId],
    queryFn: async () => {
      const { data } = await api.get("/site-visits", {
        params: { limit, search: search || undefined, leadId },
      });
      return {
        rows: data.data as ApiSiteVisitRow[],
        total: data.meta.total as number,
      };
    },
  });
}

export function useSiteVisitOptions(
  search = "",
): UseQueryResult<SiteVisitOptionsResponse, Error> {
  return useQuery({
    queryKey: ["site-visits", "options", search],
    queryFn: async () => {
      const { data } = await api.get("/site-visits/options", {
        params: { search: search || undefined },
      });
      return data as SiteVisitOptionsResponse;
    },
  });
}

export function useSiteVisit(
  visitId: string,
): UseQueryResult<ApiSiteVisitRow, Error> {
  return useQuery({
    queryKey: ["site-visits", "detail", visitId],
    queryFn: async () => {
      const { data } = await api.get(`/site-visits/${visitId}`);
      return data.data as ApiSiteVisitRow;
    },
    enabled: Boolean(visitId),
  });
}

export function useSiteVisitMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["site-visits"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-timeline"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-details"] });
    void queryClient.invalidateQueries({ queryKey: ["field-executive"] });
  };

  return {
    createVisit: useMutation({
      mutationFn: async (payload: Record<string, unknown>) =>
        (await api.post("/site-visits", payload)).data,
      onSuccess: invalidate,
    }),
    updateVisit: useMutation({
      mutationFn: async ({
        id,
        payload,
      }: {
        id: string;
        payload: Record<string, unknown>;
      }) => (await api.patch(`/site-visits/${id}`, payload)).data,
      onSuccess: invalidate,
    }),
  };
}
