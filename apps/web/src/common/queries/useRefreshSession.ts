import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";
import { getSessionUser, refreshSession } from "../services/auth.api";
import { clearStoredRefreshToken, saveRefreshToken } from "../authSession";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  clearCredentials,
  setCredentials,
  updateSessionUser,
} from "../../store/slices/authSlice";

const REFRESH_SAFETY_WINDOW_MS = 60 * 1000;
const MIN_REFRESH_DELAY_MS = 15 * 1000;
const ACCESS_SYNC_INTERVAL_MS = 15 * 1000;

function getJwtExpiryMs(token: string | null): number | null {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    if (typeof window === "undefined") return null;

    const decoded = window.atob(normalizedPayload);
    const parsed = JSON.parse(decoded) as { exp?: number };

    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface UseRefreshSessionOptions {
  enabled?: boolean;
}

export const useRefreshSession = ({
  enabled = true,
}: UseRefreshSessionOptions = {}) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated,
  );

  const query = useQuery({
    queryKey: queryKeys.auth.session,

    queryFn: refreshSession,

    retry: false,

    staleTime: 1000 * 60 * 10,

    enabled,

    refetchOnMount: true,

    refetchOnReconnect: false,

    refetchOnWindowFocus: false,
  });

  const sessionUserQuery = useQuery({
    queryKey: queryKeys.auth.sessionUser,
    queryFn: getSessionUser,
    enabled: enabled && isAuthenticated,
    retry: false,
    staleTime: 0,
    refetchInterval: ACCESS_SYNC_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

  const accessTokenExpiryMs = useMemo(
    () => getJwtExpiryMs(accessToken),
    [accessToken],
  );

  useEffect(() => {
    if (!enabled) return;
    if (query.isSuccess) {
      saveRefreshToken(query.data.refreshToken);
      dispatch(
        setCredentials({
          accessToken: query.data.accessToken,
          user: query.data.user,
        }),
      );
    }
  }, [dispatch, enabled, query.data, query.isSuccess]);

  useEffect(() => {
    if (!enabled || !sessionUserQuery.data) return;
    dispatch(updateSessionUser(sessionUserQuery.data));
  }, [dispatch, enabled, sessionUserQuery.data]);

  useEffect(() => {
    if (!enabled) return;
    if (!isAuthenticated || !accessTokenExpiryMs) return;

    const refreshDelay = Math.max(
      accessTokenExpiryMs - Date.now() - REFRESH_SAFETY_WINDOW_MS,
      MIN_REFRESH_DELAY_MS,
    );

    const timer = window.setTimeout(() => {
      void query.refetch().then((result) => {
        if (result.isError) {
          clearStoredRefreshToken();
          dispatch(clearCredentials());
        }
      });
    }, refreshDelay);

    return () => window.clearTimeout(timer);
  }, [accessTokenExpiryMs, dispatch, enabled, isAuthenticated, query]);

  return query;
};
