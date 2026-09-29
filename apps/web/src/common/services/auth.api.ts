import {
  AuthTokensSchema,
  LoginResponseSchema,
  LoginOtpRequestResponseSchema,
  LoginOtpRequestSchema,
  LoginOtpVerifySchema,
  LoginSchema,
  type AuthTokens,
  type LoginInput,
  type LoginResponse,
  type LoginOtpRequestInput,
  type LoginOtpRequestResponse,
  type LoginOtpVerifyInput,
} from "../authSchemas";

import { api } from "../api";
import { getRefreshPayload } from "../authSession";
import { getLoginLocation } from "../loginLocation";

export const login = async (payload: LoginInput): Promise<LoginResponse> => {
  const loginPayload = LoginSchema.parse({ ...payload, location: await getLoginLocation() });

  const { data } = await api.post("/auth/login", loginPayload);

  return LoginResponseSchema.parse(data);
};

export const requestLoginOtp = async (
  payload: LoginOtpRequestInput,
): Promise<LoginOtpRequestResponse> => {
  const requestPayload = LoginOtpRequestSchema.parse(payload);
  const { data } = await api.post("/auth/otp/request", requestPayload);

  return LoginOtpRequestResponseSchema.parse(data);
};

export const verifyLoginOtp = async (
  payload: LoginOtpVerifyInput,
): Promise<AuthTokens> => {
  const verifyPayload = LoginOtpVerifySchema.parse({ ...payload, location: await getLoginLocation() });
  const { data } = await api.post("/auth/otp/verify", verifyPayload);

  return AuthTokensSchema.parse(data);
};

export const refreshSession = async (): Promise<AuthTokens> => {
  const refreshPayload = getRefreshPayload();
  const { data } = refreshPayload
    ? await api.post("/auth/refresh", refreshPayload)
    : await api.post("/auth/refresh");

  return AuthTokensSchema.parse(data);
};

export const getSessionUser = async (): Promise<AuthTokens["user"]> => {
  const { data } = await api.get("/auth/session");

  return AuthTokensSchema.shape.user.parse(data);
};

export const logout = async (): Promise<{ success: boolean }> => {
  const refreshPayload = getRefreshPayload();
  const { data } = refreshPayload
    ? await api.post("/auth/logout", refreshPayload)
    : await api.post("/auth/logout");

  return data;
};

export const stopFieldExecutiveTracking = async (): Promise<void> => {
  await api.post("/site-visits/tracking/stop");
};
