import { useQuery } from "@tanstack/react-query";

import { api } from "../api";

export type DashboardRankingRange =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly"
  | "custom";

export type DashboardRankingMode = "users" | "teams" | "both";

export interface DashboardRankingBreakdown {
  statusId: string;
  statusName: string;
  points: number;
  count: number;
}

export interface DashboardUserRanking {
  rank: number;
  userId: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  image?: string | null;
  teamId?: string | null;
  teamName: string;
  points: number;
  statusBreakdown: DashboardRankingBreakdown[];
  lastScoredActivityAt?: string | null;
}

export interface DashboardTeamRanking {
  rank: number;
  teamId: string;
  teamName: string;
  leaderName: string;
  memberCount: number;
  points: number;
  statusBreakdown: DashboardRankingBreakdown[];
  lastScoredActivityAt?: string | null;
}

export interface DashboardRankingsResponse {
  meta: {
    range: DashboardRankingRange;
    mode: DashboardRankingMode;
    dateFrom: string;
    dateTo: string;
    label: string;
    scopedToTeam: boolean;
    peerRole?: "TELECALLER" | "SALES_AGENT" | null;
    rankingScopeTeamIds: string[];
    rankingScopeTeamNames: string[];
    rankingScopeLabel: string;
  };
  summary: {
    currentUserRank: number | null;
    currentTeamRank: number | null;
    currentUserPoints: number;
    currentTeamPoints: number;
    totalScore: number;
    topUser: DashboardUserRanking | null;
    topTeam: DashboardTeamRanking | null;
  };
  userRankings: DashboardUserRanking[];
  teamRankings: DashboardTeamRanking[];
  filters: {
    canViewAll: boolean;
    users: Array<{ id: string; name: string; role: string; teamId?: string | null }>;
    teams: Array<{ id: string; name: string }>;
  };
}

export interface DashboardRankingParams {
  range: DashboardRankingRange;
  dateFrom?: string;
  dateTo?: string;
  teamId?: string;
  userId?: string;
  mode?: DashboardRankingMode;
  enabled?: boolean;
}

export function useDashboardRankings(params: DashboardRankingParams) {
  const { enabled = true, ...queryParams } = params;
  return useQuery<DashboardRankingsResponse>({
    queryKey: ["dashboard", "rankings", queryParams],
    queryFn: async () => {
      const { data } = await api.get<DashboardRankingsResponse>(
        "/dashboard/rankings",
        { params: queryParams },
      );
      return data;
    },
    enabled,
  });
}
