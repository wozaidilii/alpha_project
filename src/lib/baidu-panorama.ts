import { CHINA_BOUNDS } from "~/lib/china-map";
import {
  pickTuxunFallbackLocations,
  type TuxunLocation,
} from "~/lib/tuxun-locations";

export const BAIDU_MAP_AK = process.env.NEXT_PUBLIC_BAIDU_MAP_AK;

export interface BaiduPoint {
  lng: number;
  lat: number;
}

export interface BaiduPanoramaInstance {
  setId?: (id: string) => void;
  setPosition: (point: BaiduPoint) => void;
  setPov?: (pov: { heading: number; pitch: number }) => void;
}

export interface BaiduMapClickEvent {
  point: BaiduPoint;
}

export interface BaiduMapInstance {
  centerAndZoom: (point: BaiduPoint, zoom: number) => void;
  enableScrollWheelZoom?: (enabled?: boolean) => void;
  addEventListener: (
    type: "click",
    handler: (event: BaiduMapClickEvent) => void,
  ) => void;
  removeEventListener?: (
    type: "click",
    handler: (event: BaiduMapClickEvent) => void,
  ) => void;
  addOverlay: (overlay: BaiduMarkerInstance) => void;
  clearOverlays: () => void;
  checkResize?: () => void;
}

export interface BaiduMarkerInstance {
  setPosition?: (point: BaiduPoint) => void;
}

interface BaiduPanoramaService {
  getPanoramaByLocation: (
    point: BaiduPoint,
    radius: number,
    callback: (data: unknown) => void,
  ) => void;
}

export interface BaiduMapApi {
  Point: new (lng: number, lat: number) => BaiduPoint;
  Map: new (container: HTMLElement) => BaiduMapInstance;
  Marker: new (point: BaiduPoint) => BaiduMarkerInstance;
  Panorama?: new (container: HTMLElement) => BaiduPanoramaInstance;
  PanoramaService?: new () => BaiduPanoramaService;
}

declare global {
  interface Window {
    BMap?: BaiduMapApi;
    __histoguessrBaiduMapReady?: () => void;
    __histoguessrBaiduMapPromise?: Promise<void>;
  }
}

interface RandomRegion {
  label: string;
  province: string;
  city: string;
  center: BaiduPoint;
  radiusKm: number;
}

interface CandidatePoint {
  point: BaiduPoint;
  region: RandomRegion;
}

interface PanoramaLookupResult {
  point: BaiduPoint;
  panoId?: string;
}

export interface TuxunLocationGenerationResult {
  locations: TuxunLocation[];
  usedFallback: boolean;
  message?: string;
}

interface StaticPanoramaUrlOptions {
  lng: number;
  lat: number;
  width?: number;
  height?: number;
  heading?: number;
  pitch?: number;
  fov?: number;
  coordtype?: "bd09ll" | "wgs84ll";
}

interface StaticMapUrlOptions {
  lng: number;
  lat: number;
  width?: number;
  height?: number;
  zoom?: number;
  scale?: 1 | 2;
}

type BaiduMapFeature = "map" | "panorama";

const RANDOM_REGIONS: RandomRegion[] = [
  {
    label: "北京",
    province: "北京",
    city: "北京",
    center: { lat: 39.9042, lng: 116.4074 },
    radiusKm: 55,
  },
  {
    label: "上海",
    province: "上海",
    city: "上海",
    center: { lat: 31.2304, lng: 121.4737 },
    radiusKm: 45,
  },
  {
    label: "广州",
    province: "广东",
    city: "广州",
    center: { lat: 23.1291, lng: 113.2644 },
    radiusKm: 45,
  },
  {
    label: "深圳",
    province: "广东",
    city: "深圳",
    center: { lat: 22.5431, lng: 114.0579 },
    radiusKm: 38,
  },
  {
    label: "杭州",
    province: "浙江",
    city: "杭州",
    center: { lat: 30.2741, lng: 120.1551 },
    radiusKm: 40,
  },
  {
    label: "南京",
    province: "江苏",
    city: "南京",
    center: { lat: 32.0603, lng: 118.7969 },
    radiusKm: 45,
  },
  {
    label: "苏州",
    province: "江苏",
    city: "苏州",
    center: { lat: 31.2989, lng: 120.5853 },
    radiusKm: 40,
  },
  {
    label: "成都",
    province: "四川",
    city: "成都",
    center: { lat: 30.5728, lng: 104.0668 },
    radiusKm: 55,
  },
  {
    label: "重庆",
    province: "重庆",
    city: "重庆",
    center: { lat: 29.563, lng: 106.5516 },
    radiusKm: 55,
  },
  {
    label: "武汉",
    province: "湖北",
    city: "武汉",
    center: { lat: 30.5928, lng: 114.3055 },
    radiusKm: 55,
  },
  {
    label: "西安",
    province: "陕西",
    city: "西安",
    center: { lat: 34.3416, lng: 108.9398 },
    radiusKm: 45,
  },
  {
    label: "青岛",
    province: "山东",
    city: "青岛",
    center: { lat: 36.0671, lng: 120.3826 },
    radiusKm: 45,
  },
  {
    label: "长沙",
    province: "湖南",
    city: "长沙",
    center: { lat: 28.2282, lng: 112.9388 },
    radiusKm: 45,
  },
  {
    label: "厦门",
    province: "福建",
    city: "厦门",
    center: { lat: 24.4798, lng: 118.0894 },
    radiusKm: 32,
  },
  {
    label: "昆明",
    province: "云南",
    city: "昆明",
    center: { lat: 25.0389, lng: 102.7183 },
    radiusKm: 45,
  },
  {
    label: "天津",
    province: "天津",
    city: "天津",
    center: { lat: 39.3434, lng: 117.3616 },
    radiusKm: 50,
  },
];

function hasBaiduFeature(
  api: BaiduMapApi | undefined,
  feature: BaiduMapFeature,
) {
  if (!api?.Point) return false;
  if (feature === "map") return Boolean(api.Map);
  return Boolean(api.Panorama);
}

function assertBaiduFeature(feature: BaiduMapFeature) {
  if (hasBaiduFeature(window.BMap, feature)) return;

  throw new Error(
    feature === "map" ? "百度地图 JS API 未加载" : "百度地图全景 API 未加载",
  );
}

export function loadBaiduMapScript(
  ak: string,
  feature: BaiduMapFeature = "panorama",
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("浏览器环境不可用"));
  }
  if (hasBaiduFeature(window.BMap, feature)) return Promise.resolve();
  if (window.__histoguessrBaiduMapPromise) {
    return window.__histoguessrBaiduMapPromise.then(() =>
      assertBaiduFeature(feature),
    );
  }

  window.__histoguessrBaiduMapPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("baidu-map-jsapi");
    const timer = window.setTimeout(() => {
      reject(new Error("百度地图 JS API 加载超时"));
    }, 8000);

    window.__histoguessrBaiduMapReady = () => {
      window.clearTimeout(timer);
      if (window.BMap?.Map || window.BMap?.Panorama) {
        resolve();
      } else {
        reject(new Error("百度地图 JS API 未加载"));
      }
    };

    if (existing) return;

    const script = document.createElement("script");
    script.id = "baidu-map-jsapi";
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${encodeURIComponent(
      ak,
    )}&callback=__histoguessrBaiduMapReady`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("百度地图 JS API 加载失败"));
    };
    document.head.appendChild(script);
  });

  return window.__histoguessrBaiduMapPromise.then(() =>
    assertBaiduFeature(feature),
  );
}

export function buildBaiduStaticPanoramaUrl({
  lng,
  lat,
  width = 1024,
  height = 512,
  heading = 0,
  pitch = 0,
  fov = 90,
  coordtype = "bd09ll",
}: StaticPanoramaUrlOptions): string | null {
  if (!BAIDU_MAP_AK) return null;

  const params = new URLSearchParams({
    ak: BAIDU_MAP_AK,
    width: String(width),
    height: String(height),
    location: `${lng},${lat}`,
    coordtype,
    heading: String(heading),
    pitch: String(pitch),
    fov: String(fov),
  });

  return `https://api.map.baidu.com/panorama/v2?${params.toString()}`;
}

export function buildBaiduStaticMapUrl({
  lng,
  lat,
  width = 1024,
  height = 512,
  zoom = 16,
  scale = 2,
}: StaticMapUrlOptions): string | null {
  if (!BAIDU_MAP_AK) return null;

  const params = new URLSearchParams({
    ak: BAIDU_MAP_AK,
    width: String(width),
    height: String(height),
    center: `${lng},${lat}`,
    zoom: String(zoom),
    scale: String(scale),
  });

  return `https://api.map.baidu.com/staticimage/v2?${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === "number" && Number.isFinite(item) ? item : undefined;
}

function readString(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === "string" && item.trim() ? item.trim() : undefined;
}

function extractPoint(value: unknown): BaiduPoint | null {
  if (!isRecord(value)) return null;

  const directLng = readNumber(value, "lng");
  const directLat = readNumber(value, "lat");
  if (directLng !== undefined && directLat !== undefined) {
    return { lng: directLng, lat: directLat };
  }

  const nestedKeys = ["point", "position", "location"];
  for (const key of nestedKeys) {
    const nested = value[key];
    if (!isRecord(nested)) continue;

    const nestedLng = readNumber(nested, "lng");
    const nestedLat = readNumber(nested, "lat");
    if (nestedLng !== undefined && nestedLat !== undefined) {
      return { lng: nestedLng, lat: nestedLat };
    }

    const point = nested.point;
    if (isRecord(point)) {
      const pointLng = readNumber(point, "lng");
      const pointLat = readNumber(point, "lat");
      if (pointLng !== undefined && pointLat !== undefined) {
        return { lng: pointLng, lat: pointLat };
      }
    }
  }

  return null;
}

function extractPanoramaResult(value: unknown): PanoramaLookupResult | null {
  const point = extractPoint(value);
  if (!point || !isPointInsideChina(point)) return null;

  const record = isRecord(value) ? value : {};
  const panoId =
    readString(record, "id") ??
    readString(record, "panoId") ??
    readString(record, "pid");

  return { point, panoId };
}

function isPointInsideChina(point: BaiduPoint) {
  return (
    point.lat >= CHINA_BOUNDS.southWest.lat &&
    point.lat <= CHINA_BOUNDS.northEast.lat &&
    point.lng >= CHINA_BOUNDS.southWest.lng &&
    point.lng <= CHINA_BOUNDS.northEast.lng
  );
}

function randomPointAround(region: RandomRegion): BaiduPoint {
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

function randomCandidatePoint(): CandidatePoint {
  const region =
    RANDOM_REGIONS[Math.floor(Math.random() * RANDOM_REGIONS.length)] ??
    RANDOM_REGIONS[0]!;
  return { point: randomPointAround(region), region };
}

function approximateDistanceKm(a: BaiduPoint, b: BaiduPoint) {
  const latKm = (a.lat - b.lat) * 111;
  const lngKm =
    (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) * Math.PI) / 360);
  return Math.sqrt(latKm * latKm + lngKm * lngKm);
}

function isDistinctLocation(
  locations: TuxunLocation[],
  point: BaiduPoint,
  panoId?: string,
) {
  return locations.every((location) => {
    if (panoId && location.panoId === panoId) return false;
    return approximateDistanceKm(location, point) > 1.2;
  });
}

function makeRandomLocation(
  result: PanoramaLookupResult,
  region: RandomRegion,
  index: number,
): TuxunLocation {
  const latId = Math.round(result.point.lat * 100000);
  const lngId = Math.round(result.point.lng * 100000);

  return {
    id: `baidu-${result.panoId ?? `${latId}-${lngId}`}-${index}`,
    title: `${region.label}附近随机全景`,
    province: region.province,
    city: region.city,
    lat: result.point.lat,
    lng: result.point.lng,
    panoId: result.panoId,
    heading: Math.floor(Math.random() * 360),
    pitch: 0,
    source: "baidu-random",
    hint: "该点由随机候选坐标生成，并经百度全景服务确认可用；计分使用百度返回的真实全景坐标。",
  };
}

function getPanoramaByLocation(
  api: BaiduMapApi,
  candidate: BaiduPoint,
  radius: number,
): Promise<PanoramaLookupResult | null> {
  const ServiceCtor = api.PanoramaService;
  if (!ServiceCtor) return Promise.resolve(null);

  return new Promise((resolve) => {
    let service: BaiduPanoramaService;
    try {
      service = new ServiceCtor();
    } catch {
      resolve(null);
      return;
    }

    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, 2200);

    try {
      service.getPanoramaByLocation(
        new api.Point(candidate.lng, candidate.lat),
        radius,
        (data) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(extractPanoramaResult(data));
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

function fallbackResult(
  count: number,
  message: string,
): TuxunLocationGenerationResult {
  return {
    locations: pickTuxunFallbackLocations(count),
    usedFallback: true,
    message,
  };
}

export async function generateRandomTuxunLocations(
  count: number,
): Promise<TuxunLocationGenerationResult> {
  if (!BAIDU_MAP_AK) {
    return fallbackResult(
      count,
      "未配置百度地图 AK，当前使用本地备用点位；配置 NEXT_PUBLIC_BAIDU_MAP_AK 后会随机生成百度全景点。",
    );
  }

  try {
    await loadBaiduMapScript(BAIDU_MAP_AK);
  } catch {
    return fallbackResult(
      count,
      "百度地图 JS API 加载失败，当前使用本地备用点位。",
    );
  }

  const api = window.BMap;
  if (!api?.PanoramaService) {
    return fallbackResult(
      count,
      "当前 AK 未加载到百度全景检索服务，当前使用本地备用点位。",
    );
  }

  const locations: TuxunLocation[] = [];
  const batchSize = 8;
  const maxBatches = 5;

  for (
    let batchIndex = 0;
    batchIndex < maxBatches && locations.length < count;
    batchIndex++
  ) {
    const candidates = Array.from({ length: batchSize }, () =>
      randomCandidatePoint(),
    ).filter((candidate) => isPointInsideChina(candidate.point));

    const batchResults = await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        result: await getPanoramaByLocation(api, candidate.point, 1800).catch(
          () => null,
        ),
      })),
    );

    for (const { candidate, result } of batchResults) {
      if (!result) continue;
      if (!isDistinctLocation(locations, result.point, result.panoId)) continue;

      locations.push(
        makeRandomLocation(result, candidate.region, locations.length),
      );
      if (locations.length >= count) break;
    }
  }

  if (locations.length >= count) {
    return { locations, usedFallback: false };
  }

  const fallback = pickTuxunFallbackLocations(count - locations.length);
  return {
    locations: [...locations, ...fallback],
    usedFallback: true,
    message:
      locations.length > 0
        ? `已随机生成 ${locations.length} 个百度全景点，其余轮次使用备用点位。`
        : "多次随机后没有找到可用百度全景点，当前使用本地备用点位。",
  };
}
