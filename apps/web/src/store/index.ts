// store/index.ts

import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import authReducer from "./slices/authSlice";
export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
}

const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
