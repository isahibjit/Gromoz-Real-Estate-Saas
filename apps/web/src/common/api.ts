import axios, { isCancel } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import store from "../store";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import { AuthTokensSchema } from "./authSchemas";
import {
  clearStoredRefreshToken,
  getRefreshPayload,
  saveRefreshToken,
} from "./authSession";

import toast from "react-hot-toast";
import {
  ACTIVE_ORGANIZATION_KEY,
  assertCurrentOrganization,
  currentOrganizationId,
} from "./tenantRequestScope";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _organizationId?: string | null;
}

const getEnvVar = (key: string): string | undefined => {
  try {
    if (key === "VITE_API_URL") {
      return (
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
        process.env.VITE_API_URL
      );
    }
    return process.env[key];
  } catch {
    return process.env[key];
  }
};

export const api = axios.create({
  baseURL: getEnvVar("VITE_API_URL") ?? "/api",
  withCredentials: true,
});

let refreshRequest: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const scopedConfig = config as RetryableRequestConfig;
  assertCurrentOrganization(scopedConfig._organizationId);
  if (scopedConfig._organizationId === undefined) {
    scopedConfig._organizationId = currentOrganizationId();
  }
  const accessToken = store.getState().auth.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const activeOrgId = scopedConfig._organizationId;
  if (activeOrgId) {
    config.headers["x-organization-id"] = activeOrgId;
  } else {
    config.headers.delete("x-organization-id");
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    assertCurrentOrganization(
      (response.config as RetryableRequestConfig)._organizationId,
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    assertCurrentOrganization(originalRequest?._organizationId);
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";
    const errorMessage = error.response?.data?.message;

    if (
      status === 401 &&
      !requestUrl.includes("/auth/login") &&
      typeof errorMessage === "string" &&
      (errorMessage.toLowerCase().includes("account is deactivated") ||
        errorMessage.toLowerCase().includes("account has been deactivated"))
    ) {
      clearStoredRefreshToken();
      store.dispatch(clearCredentials());
      toast.error(errorMessage);
      return Promise.reject(error);
    }

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/otp") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    refreshRequest ??= api
      .post("/auth/refresh", getRefreshPayload())
      .then((response) => {
        const tokens = AuthTokensSchema.parse(response.data);
        saveRefreshToken(tokens.refreshToken);

        store.dispatch(
          setCredentials({
            accessToken: tokens.accessToken,
            user: tokens.user,
          }),
        );

        return tokens.accessToken;
      })
      .catch((refreshError) => {
        if (isCancel(refreshError)) throw refreshError;
        clearStoredRefreshToken();
        store.dispatch(clearCredentials());
        throw refreshError;
      })
      .finally(() => {
        refreshRequest = null;
      });

    const accessToken = await refreshRequest;
    assertCurrentOrganization(originalRequest._organizationId);

    if (accessToken) {
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    }

    return api(originalRequest);
  },
);

// Tenant changes in another tab invalidate all in-memory query/UI state here.
// In this tab, the existing workspace-entry/exit handlers already hard-navigate.
window.addEventListener("storage", (event) => {
  if (
    (event.key === ACTIVE_ORGANIZATION_KEY &&
      event.oldValue !== event.newValue) ||
    event.key === null
  ) {
    window.location.reload();
  }
});
