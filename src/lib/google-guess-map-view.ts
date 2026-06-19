import type { ForeignCountryConfig, LatLng } from "~/lib/foreign-map";
import type {
  GoogleLatLngBoundsInstance,
  GoogleMapInstance,
  GoogleMapsApi,
} from "~/lib/google-street-view";

interface GoogleGuessMapView {
  center: LatLng;
  zoom: number;
}

interface SyncGoogleGuessMapViewportOptions {
  map: GoogleMapInstance;
  api: Pick<GoogleMapsApi, "LatLngBounds">;
  country: ForeignCountryConfig;
  restrictToCountry: boolean;
  guess: LatLng | null;
  answer: LatLng | null;
}

export function getGoogleGuessMapInitialView(
  country: ForeignCountryConfig,
  restrictToCountry: boolean,
): GoogleGuessMapView {
  return {
    center: restrictToCountry ? country.center : { lat: 20, lng: 0 },
    zoom: restrictToCountry ? country.zoom : 2,
  };
}

export function resetGoogleGuessMapView(
  map: GoogleMapInstance,
  country: ForeignCountryConfig,
  restrictToCountry: boolean,
) {
  const initialView = getGoogleGuessMapInitialView(country, restrictToCountry);
  map.setCenter?.(initialView.center);
  if (!map.setCenter) map.panTo?.(initialView.center);
  map.setZoom?.(initialView.zoom);
}

export function syncGoogleGuessMapViewport({
  map,
  api,
  country,
  restrictToCountry,
  guess,
  answer,
}: SyncGoogleGuessMapViewportOptions) {
  if (guess && answer) {
    const bounds: GoogleLatLngBoundsInstance = new api.LatLngBounds();
    bounds.extend(guess);
    bounds.extend(answer);
    map.fitBounds(bounds);
    return;
  }

  if (answer) {
    map.panTo?.(answer);
    map.setZoom?.(9);
    return;
  }

  if (!guess) {
    resetGoogleGuessMapView(map, country, restrictToCountry);
  }
}
