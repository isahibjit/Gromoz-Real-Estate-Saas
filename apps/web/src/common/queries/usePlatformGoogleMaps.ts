export function usePlatformGoogleMaps() {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  )?.trim();

  return { apiKey };
}
