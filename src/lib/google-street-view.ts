import {
  DEFAULT_FOREIGN_COUNTRY,
  clampToBounds,
  isPointInsideBounds,
  type ForeignCountryConfig,
  type ForeignRandomRegion,
  type LatLng,
} from "~/lib/foreign-map";
import { type TuxunLocation } from "~/lib/tuxun-locations";

export const GOOGLE_MAP_AK = process.env.NEXT_PUBLIC_GOOGLE_MAP_AK;

interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

interface GoogleMapMouseEvent {
  latLng?: GoogleLatLng;
}

interface GoogleMapsListener {
  remove: () => void;
}

export interface GoogleMapInstance {
  addListener: (
    type: "click",
    handler: (event: GoogleMapMouseEvent) => void,
  ) => GoogleMapsListener;
  fitBounds: (bounds: GoogleLatLngBoundsInstance) => void;
  panTo?: (point: LatLng) => void;
  setZoom?: (zoom: number) => void;
}

export interface GoogleStreetViewPanoramaInstance {
  setVisible?: (visible: boolean) => void;
}

export interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

export interface GooglePolylineInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

export interface GoogleLatLngBoundsInstance {
  extend: (point: LatLng) => void;
}

interface GoogleStreetViewLocation {
  latLng?: GoogleLatLng;
  pano?: string;
}

interface GoogleStreetViewPanoramaData {
  location?: GoogleStreetViewLocation;
}

interface GoogleStreetViewRequest {
  location: LatLng;
  radius: number;
}

interface GoogleStreetViewService {
  getPanorama: (
    request: GoogleStreetViewRequest,
    callback: (
      data: GoogleStreetViewPanoramaData | null,
      status: string,
    ) => void,
  ) => void;
}

export interface GoogleMapsApi {
  Map: new (
    container: HTMLElement,
    options: {
      center: LatLng;
      zoom: number;
      restriction?: {
        latLngBounds: {
          south: number;
          west: number;
          north: number;
          east: number;
        };
        strictBounds: boolean;
      };
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
      clickableIcons?: boolean;
    },
  ) => GoogleMapInstance;
  Marker: new (options: {
    position: LatLng;
    map: GoogleMapInstance;
    title?: string;
    label?: string;
  }) => GoogleMarkerInstance;
  Polyline: new (options: {
    path: LatLng[];
    map: GoogleMapInstance;
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
  }) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
  StreetViewPanorama: new (
    container: HTMLElement,
    options: {
      pano?: string;
      position?: LatLng;
      pov: { heading: number; pitch: number };
      zoom?: number;
      visible?: boolean;
      addressControl?: boolean;
      fullscreenControl?: boolean;
      motionTracking?: boolean;
      motionTrackingControl?: boolean;
    },
  ) => GoogleStreetViewPanoramaInstance;
  StreetViewService: new () => GoogleStreetViewService;
  StreetViewStatus: {
    OK: string;
  };
  event?: {
    clearInstanceListeners?: (instance: object) => void;
  };
}

interface GoogleGlobal {
  maps?: GoogleMapsApi;
}

declare global {
  interface Window {
    google?: GoogleGlobal;
    __histoguessrGoogleMapsReady?: () => void;
    __histoguessrGoogleMapsPromise?: Promise<void>;
  }
}

interface GoogleStreetViewLookupResult {
  point: LatLng;
  panoId?: string;
}

interface CandidatePoint {
  point: LatLng;
  region: ForeignRandomRegion;
}

export interface ForeignLocationGenerationResult {
  locations: TuxunLocation[];
  usedFallback: false;
  message?: string;
}

export function getGoogleMapsApi(): GoogleMapsApi | undefined {
  return window.google?.maps;
}

function hasGoogleMapsApi() {
  const api = typeof window === "undefined" ? undefined : getGoogleMapsApi();
  return Boolean(
    api?.Map &&
    api.Marker &&
    api.Polyline &&
    api.StreetViewPanorama &&
    api.StreetViewService,
  );
}

function assertGoogleMapsApi() {
  if (hasGoogleMapsApi()) return;
  throw new Error("Google Maps JavaScript API 未加载");
}

export function googleBoundsForCountry(country: ForeignCountryConfig) {
  return {
    south: country.bounds.southWest.lat,
    west: country.bounds.southWest.lng,
    north: country.bounds.northEast.lat,
    east: country.bounds.northEast.lng,
  };
}

export function loadGoogleMapsScript(
  ak: string | undefined = GOOGLE_MAP_AK,
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("浏览器环境不可用"));
  }
  if (!ak) {
    return Promise.reject(
      new Error("未配置 Google Maps AK，请配置 NEXT_PUBLIC_GOOGLE_MAP_AK"),
    );
  }
  if (hasGoogleMapsApi()) return Promise.resolve();
  if (window.__histoguessrGoogleMapsPromise) {
    return window.__histoguessrGoogleMapsPromise.then(assertGoogleMapsApi);
  }

  window.__histoguessrGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-jsapi");
    const timer = window.setTimeout(() => {
      reject(new Error("Google Maps JavaScript API 加载超时"));
    }, 10000);

    window.__histoguessrGoogleMapsReady = () => {
      window.clearTimeout(timer);
      if (hasGoogleMapsApi()) {
        resolve();
      } else {
        reject(new Error("Google Maps JavaScript API 未加载"));
      }
    };

    existing?.remove();

    const params = new URLSearchParams({
      key: ak,
      callback: "__histoguessrGoogleMapsReady",
      v: "weekly",
    });
    const script = document.createElement("script");
    script.id = "google-maps-jsapi";
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Google Maps JavaScript API 加载失败"));
    };
    document.head.appendChild(script);
  });

  return window.__histoguessrGoogleMapsPromise.then(assertGoogleMapsApi);
}

function randomPointAround(region: ForeignRandomRegion): LatLng {
  const angle = Math.random() * Math.PI * 2;
  const distanceKm = Math.sqrt(Math.random()) * region.radiusKm;
  const latOffset = (Math.cos(angle) * distanceKm) / 111;
  const lngOffset =
    (Math.sin(angle) * distanceKm) /
    (111 * Math.cos((region.center.lat * Math.PI) / 180));

  return {
    lat: region.center.lat + latOffset,
    lng: region.center.lng + lngOffset,
  };
}

function randomCandidatePoint(country: ForeignCountryConfig): CandidatePoint {
  const region =
    country.randomRegions[
      Math.floor(Math.random() * country.randomRegions.length)
    ] ?? country.randomRegions[0]!;
  return {
    point: clampToBounds(randomPointAround(region), country.bounds),
    region,
  };
}

function approximateDistanceKm(a: LatLng, b: LatLng) {
  const latKm = (a.lat - b.lat) * 111;
  const lngKm =
    (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) * Math.PI) / 360);
  return Math.sqrt(latKm * latKm + lngKm * lngKm);
}

function isDistinctLocation(
  locations: TuxunLocation[],
  point: LatLng,
  panoId?: string,
) {
  return locations.every((location) => {
    if (panoId && location.panoId === panoId) return false;
    return approximateDistanceKm(location, point) > 1.2;
  });
}

function extractStreetViewResult(
  data: GoogleStreetViewPanoramaData | null,
  country: ForeignCountryConfig,
): GoogleStreetViewLookupResult | null {
  const latLng = data?.location?.latLng;
  if (!latLng) return null;

  const point = {
    lat: latLng.lat(),
    lng: latLng.lng(),
  };
  if (!isPointInsideBounds(point, country.bounds)) return null;

  return {
    point,
    panoId: data.location?.pano,
  };
}

function getStreetViewNear(
  api: GoogleMapsApi,
  country: ForeignCountryConfig,
  candidate: LatLng,
): Promise<GoogleStreetViewLookupResult | null> {
  return new Promise((resolve) => {
    let service: GoogleStreetViewService;
    try {
      service = new api.StreetViewService();
    } catch {
      resolve(null);
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, 2400);

    try {
      service.getPanorama(
        {
          location: candidate,
          radius: country.streetViewSearchRadiusMeters,
        },
        (data, status) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (status !== api.StreetViewStatus.OK) {
            resolve(null);
            return;
          }
          resolve(extractStreetViewResult(data, country));
        },
      );
    } catch {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(null);
    }
  });
}

function makeRandomLocation(
  country: ForeignCountryConfig,
  result: GoogleStreetViewLookupResult,
  region: ForeignRandomRegion,
  index: number,
): TuxunLocation {
  const latId = Math.round(result.point.lat * 100000);
  const lngId = Math.round(result.point.lng * 100000);

  return {
    id: `google-${country.slug}-${result.panoId ?? `${latId}-${lngId}`}-${index}`,
    title: `${country.label} · ${region.label}附近随机街景`,
    province: country.label,
    city: region.city,
    lat: result.point.lat,
    lng: result.point.lng,
    panoId: result.panoId,
    heading: Math.floor(Math.random() * 360),
    pitch: 0,
    source: "google-random",
    hint: `该点由 ${region.label} 附近随机候选坐标生成，并经 Google Street View 服务确认可用。`,
  };
}

function unavailableResult(message: string): ForeignLocationGenerationResult {
  return {
    locations: [],
    usedFallback: false,
    message,
  };
}

export async function generateRandomForeignLocations(
  count: number,
  country: ForeignCountryConfig = DEFAULT_FOREIGN_COUNTRY,
): Promise<ForeignLocationGenerationResult> {
  if (!GOOGLE_MAP_AK) {
    return unavailableResult(
      "未配置 Google Maps AK，无法生成 Google 街景点；请配置 NEXT_PUBLIC_GOOGLE_MAP_AK 后重试。",
    );
  }

  try {
    await loadGoogleMapsScript(GOOGLE_MAP_AK);
  } catch {
    return unavailableResult(
      "Google Maps JavaScript API 加载失败，无法生成 Google 街景点。",
    );
  }

  const api = getGoogleMapsApi();
  if (!api?.StreetViewService) {
    return unavailableResult(
      "当前 Google Maps AK 未加载到 Street View 服务，无法生成街景点。",
    );
  }

  const locations: TuxunLocation[] = [];
  const batchSize = 8;
  const maxBatches = 10;

  for (
    let batchIndex = 0;
    batchIndex < maxBatches && locations.length < count;
    batchIndex++
  ) {
    const candidates = Array.from({ length: batchSize }, () =>
      randomCandidatePoint(country),
    ).filter((candidate) =>
      isPointInsideBounds(candidate.point, country.bounds),
    );

    const batchResults = await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        result: await getStreetViewNear(api, country, candidate.point).catch(
          () => null,
        ),
      })),
    );

    for (const { candidate, result } of batchResults) {
      if (!result) continue;
      if (!isDistinctLocation(locations, result.point, result.panoId)) continue;

      locations.push(
        makeRandomLocation(country, result, candidate.region, locations.length),
      );
      if (locations.length >= count) break;
    }
  }

  if (locations.length >= count) {
    return { locations, usedFallback: false };
  }

  return {
    locations: [],
    usedFallback: false,
    message:
      locations.length > 0
        ? `只匹配到 ${locations.length} / ${count} 个 Google 街景点，未开始本局；请重新生成。`
        : "多次随机后没有找到可用 Google 街景点，请重新生成。",
  };
}
