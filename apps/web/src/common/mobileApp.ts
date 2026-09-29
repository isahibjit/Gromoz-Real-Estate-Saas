import { useQuery } from "@tanstack/react-query";

export interface MobileAppRelease {
  id: string;
  versionName: string;
  buildNumber: number;
  originalName: string;
  sizeBytes: number;
  sha256: string;
  releaseNotes: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface ReleaseHistory {
  data: (MobileAppRelease & { state: "draft" | "published" | "previous" })[];
  meta: { page: number; limit: number; total: number };
  currentRelease: MobileAppRelease | null;
}

export const mobileAppApiBase = `${(import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "")}/public/mobile-app`;
export const mobileAppQueryKey = ["public-mobile-app"];
export const releaseHistoryKey = ["mobile-app-releases"];
export const maxApkBytes = 200 * 1024 * 1024;

export function formatApkSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function usePublishedMobileApp() {
  return useQuery({
    queryKey: mobileAppQueryKey,
    queryFn: async ({ signal }): Promise<{ release: MobileAppRelease | null }> => {
      const response = await fetch(mobileAppApiBase, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("We could not check the latest app release. Please try again.");
      return response.json();
    },
    retry: 1,
    staleTime: 0,
  });
}
