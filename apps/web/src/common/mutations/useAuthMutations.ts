import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  login,
  logout,
  requestLoginOtp,
  stopFieldExecutiveTracking,
  verifyLoginOtp,
} from "../services/auth.api";
import { clearStoredRefreshToken, saveRefreshToken } from "../authSession";
import type { AuthTokens, LoginResponse } from "../authSchemas";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearCredentials, setCredentials } from "../../store/slices/authSlice";

interface LoginMutationInput {
  credentials: Parameters<typeof login>[0];
  rememberMe?: boolean;
}

interface VerifyLoginOtpMutationInput {
  payload: Parameters<typeof verifyLoginOtp>[0];
  rememberMe?: boolean;
}

function isAuthTokens(result: LoginResponse): result is AuthTokens {
  return "accessToken" in result && "refreshToken" in result && "user" in result;
}

export const useLoginMutation = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: ({ credentials }: LoginMutationInput) => login(credentials),

    onSuccess: (result, variables) => {
      if (!isAuthTokens(result)) {
        return;
      }

      queryClient.clear();
      saveRefreshToken(result.refreshToken, variables.rememberMe !== false);
      dispatch(
        setCredentials({
          accessToken: result.accessToken,
          user: result.user,
        }),
      );
    },
  });
};

export const useRequestLoginOtpMutation = () =>
  useMutation({
    gcTime: 0,
    mutationFn: requestLoginOtp,
  });

export const useVerifyLoginOtpMutation = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: ({ payload }: VerifyLoginOtpMutationInput) =>
      verifyLoginOtp(payload),

    onSuccess: (tokens, variables) => {
      queryClient.clear();
      saveRefreshToken(tokens.refreshToken, variables.rememberMe !== false);
      dispatch(
        setCredentials({
          accessToken: tokens.accessToken,
          user: tokens.user,
        }),
      );
    },
  });
};

export const useLogoutMutation = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (user?.role === "SALES_AGENT") {
        await stopFieldExecutiveTracking().catch(() => undefined);
      }
      return logout();
    },

    onSettled: () => {
      clearStoredRefreshToken();
      dispatch(clearCredentials());
      queryClient.clear();
    },
  });
};
