import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";

import store from "../../store";
import { clearCredentials } from "../../store/slices/authSlice";
import { clearStoredRefreshToken } from "../authSession";

let socket: Socket | undefined;
let connectedToken: string | undefined;

function socketEndpoint() {
  const apiBase = import.meta.env.VITE_API_URL ?? "/api";
  if (/^https?:\/\//i.test(apiBase)) {
    const url = new URL(apiBase);
    const apiPath = url.pathname.replace(/\/$/, "");
    return {
      origin: url.origin,
      path: `${apiPath || ""}/socket.io`,
    };
  }

  const apiPath = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  return {
    origin: window.location.origin,
    path: `${apiPath.replace(/\/$/, "")}/socket.io`,
  };
}

export function connectRealtimeSocket(accessToken: string): Socket {
  if (socket && connectedToken === accessToken) return socket;

  disconnectRealtimeSocket();
  const endpoint = socketEndpoint();
  connectedToken = accessToken;
  socket = io(`${endpoint.origin}/realtime`, {
    path: endpoint.path,
    auth: { token: accessToken },
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
  });

  const handleSessionExpired = (data?: { reason?: string }) => {
    clearStoredRefreshToken();
    store.dispatch(clearCredentials());
    disconnectRealtimeSocket();
    toast.error(
      data?.reason || "Daily session expired at 7:30 PM. Please log in again.",
    );
  };

  socket.on("auth:logout", handleSessionExpired);
  socket.on("session_expired", handleSessionExpired);

  return socket;
}

export function disconnectRealtimeSocket() {
  socket?.disconnect();
  socket = undefined;
  connectedToken = undefined;
}
