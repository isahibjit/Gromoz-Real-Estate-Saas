const REFRESH_TOKEN_STORAGE_KEY = "truroot_refresh_token";

let inMemoryRefreshToken: string | null = null;

function getStorage(type: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveRefreshToken(
  refreshToken: string,
  persist = shouldPersistRefreshToken(),
): void {
  inMemoryRefreshToken = refreshToken;

  const primaryStorage = getStorage(persist ? "local" : "session");
  const secondaryStorage = getStorage(persist ? "session" : "local");

  primaryStorage?.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  secondaryStorage?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

function shouldPersistRefreshToken(): boolean {
  if (getStorage("local")?.getItem(REFRESH_TOKEN_STORAGE_KEY)) return true;
  if (getStorage("session")?.getItem(REFRESH_TOKEN_STORAGE_KEY)) return false;
  return true;
}

export function getStoredRefreshToken(): string | null {
  if (inMemoryRefreshToken) return inMemoryRefreshToken;

  const sessionToken = getStorage("session")?.getItem(
    REFRESH_TOKEN_STORAGE_KEY,
  );
  if (sessionToken) {
    inMemoryRefreshToken = sessionToken;
    return sessionToken;
  }

  const localToken = getStorage("local")?.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (localToken) {
    inMemoryRefreshToken = localToken;
    return localToken;
  }

  return null;
}

export function clearStoredRefreshToken(): void {
  inMemoryRefreshToken = null;
  getStorage("session")?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  getStorage("local")?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getRefreshPayload(): { refreshToken: string } | undefined {
  const refreshToken = getStoredRefreshToken();
  return refreshToken ? { refreshToken } : undefined;
}
