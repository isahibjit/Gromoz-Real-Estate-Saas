import { CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../../../../common/api";
import { useAppSelector } from "../../../../store";

interface FollowUpsCountResponse {
  meta?: {
    total?: number;
  };
}

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getDayBoundary(dateValue: string, boundary: "start" | "end") {
  const date = new Date(`${dateValue}T00:00:00`);
  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  }
  return date.toISOString();
}

function getFollowUpsPath(role?: string) {
  if (role === "TELECALLER") return "/telecaller/follow-ups";
  if (role === "SALES_AGENT") return "/field-executive/follow-ups";
  return "/leads/follow-up";
}

function shouldShowForPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/telecaller/dashboard") ||
    pathname.startsWith("/telecaller/leads") ||
    pathname.startsWith("/telecaller/follow-ups") ||
    pathname.startsWith("/field-executive/dashboard") ||
    pathname.startsWith("/field-executive/leads") ||
    pathname.startsWith("/field-executive/follow-ups")
  );
}

function isFollowUpsPath(pathname: string) {
  return (
    pathname.startsWith("/leads/follow-up") ||
    pathname.startsWith("/telecaller/follow-ups") ||
    pathname.startsWith("/field-executive/follow-ups")
  );
}

export function TodayFollowUpsFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const today = toDateInputValue(new Date());
  const visible = shouldShowForPath(location.pathname);
  const onFollowUpsPage = isFollowUpsPath(location.pathname);
  const followUpsPath = getFollowUpsPath(user?.role);

  const todayFollowUpsQuery = useQuery({
    queryKey: ["follow-ups", "today-floating-count", today, user?.id],
    queryFn: async () => {
      const { data } = await api.get<FollowUpsCountResponse>(
        "/leads/follow-ups",
        {
          params: {
            dateFrom: getDayBoundary(today, "start"),
            dateTo: getDayBoundary(today, "end"),
            status: "pending",
            limit: 1,
          },
        },
      );
      return data.meta?.total ?? 0;
    },
    enabled:
      visible &&
      ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "TELECALLER", "SALES_AGENT"].includes(
        user?.role ?? "",
      ),
    staleTime: 60_000,
  });

  if (!visible || (!onFollowUpsPage && todayFollowUpsQuery.isError)) {
    return null;
  }

  const count = todayFollowUpsQuery.data ?? 0;
  const hasPending = count > 0;

  return (
    <button
      type="button"
      aria-label={`Open today's follow-ups. ${count} pending.`}
      onClick={() => navigate(`${followUpsPath}?queue=today-pending`)}
      className="fixed bottom-8 right-8 z-[70] flex h-24 w-24 flex-col items-center justify-center rounded-full border border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {hasPending ? (
        <span className="absolute right-2 top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
      ) : null}
      <CalendarDays className="mb-1 h-4 w-4 text-blue-100" />
      <span className="text-2xl font-extrabold leading-none">
        {todayFollowUpsQuery.isLoading ? "--" : count}
      </span>
      <span className="mt-1 max-w-[72px] text-center text-[10px] font-bold leading-tight text-blue-50">
        Today's Follow-Ups
      </span>
    </button>
  );
}
