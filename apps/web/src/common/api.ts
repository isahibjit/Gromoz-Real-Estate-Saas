import axios from "axios";
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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const getEnvVar = (key: string): string | undefined => {
  try {
    if (key === "VITE_API_URL") {
      return (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || process.env.VITE_API_URL;
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
  const accessToken = store.getState().auth.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const activeOrgId = localStorage.getItem("active_organization_id");
  if (activeOrgId) {
    config.headers["x-organization-id"] = activeOrgId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
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
        clearStoredRefreshToken();
        store.dispatch(clearCredentials());
        throw refreshError;
      })
      .finally(() => {
        refreshRequest = null;
      });

    const accessToken = await refreshRequest;

    if (accessToken) {
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    }

    return api(originalRequest);
  },
);
