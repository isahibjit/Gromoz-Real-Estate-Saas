import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthTokens } from "@truroot/shared/auth";

export interface AuthState {
  accessToken: string | null;
  user: AuthTokens["user"] | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<Pick<AuthTokens, "accessToken" | "user">>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },

    updateSessionUser: (state, action: PayloadAction<AuthTokens["user"]>) => {
      state.user = action.payload;
    },

    clearCredentials: (state) => {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, updateSessionUser, clearCredentials } =
  authSlice.actions;

export default authSlice.reducer;
