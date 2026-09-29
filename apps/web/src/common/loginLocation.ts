export async function getLoginLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | undefined> {
  if (!navigator.geolocation || !window.isSecureContext) return undefined;
  return new Promise((resolve) => {
    const deadline = window.setTimeout(() => resolve(undefined), 8000);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.clearTimeout(deadline);
        resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
      },
      () => { window.clearTimeout(deadline); resolve(undefined); },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 },
    );
  });
}
