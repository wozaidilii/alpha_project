export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngBounds {
  southWest: LatLng;
  northEast: LatLng;
}

export interface ForeignRandomRegion {
  label: string;
  city: string;
  center: LatLng;
  radiusKm: number;
}

export interface ForeignCountryConfig {
  slug: "japan";
  label: string;
  mapLabel: string;
  center: LatLng;
  zoom: number;
  bounds: LatLngBounds;
  streetViewSearchRadiusMeters: number;
  randomRegions: ForeignRandomRegion[];
}

export const JAPAN_BOUNDS: LatLngBounds = {
  southWest: { lat: 24.0, lng: 122.9 },
  northEast: { lat: 45.8, lng: 153.99 },
};

export const FOREIGN_COUNTRIES: ForeignCountryConfig[] = [
  {
    slug: "japan",
    label: "日本",
    mapLabel: "日本地图",
    center: { lat: 36.2048, lng: 138.2529 },
    zoom: 5,
    bounds: JAPAN_BOUNDS,
    streetViewSearchRadiusMeters: 1800,
    randomRegions: [
      {
        label: "东京",
        city: "东京",
        center: { lat: 35.6762, lng: 139.6503 },
        radiusKm: 34,
      },
      {
        label: "大阪",
        city: "大阪",
        center: { lat: 34.6937, lng: 135.5023 },
        radiusKm: 28,
      },
      {
        label: "京都",
        city: "京都",
        center: { lat: 35.0116, lng: 135.7681 },
        radiusKm: 24,
      },
      {
        label: "名古屋",
        city: "名古屋",
        center: { lat: 35.1815, lng: 136.9066 },
        radiusKm: 28,
      },
      {
        label: "札幌",
        city: "札幌",
        center: { lat: 43.0618, lng: 141.3545 },
        radiusKm: 30,
      },
      {
        label: "福冈",
        city: "福冈",
        center: { lat: 33.5902, lng: 130.4017 },
        radiusKm: 26,
      },
      {
        label: "广岛",
        city: "广岛",
        center: { lat: 34.3853, lng: 132.4553 },
        radiusKm: 26,
      },
      {
        label: "仙台",
        city: "仙台",
        center: { lat: 38.2682, lng: 140.8694 },
        radiusKm: 28,
      },
      {
        label: "那霸",
        city: "那霸",
        center: { lat: 26.2124, lng: 127.6792 },
        radiusKm: 18,
      },
    ],
  },
];

export const DEFAULT_FOREIGN_COUNTRY = FOREIGN_COUNTRIES[0]!;

export type ForeignCountrySlug = ForeignCountryConfig["slug"];

export function isForeignCountrySlug(
  value: string,
): value is ForeignCountrySlug {
  return FOREIGN_COUNTRIES.some((country) => country.slug === value);
}

export function getForeignCountry(
  slug: string,
): ForeignCountryConfig | undefined {
  return FOREIGN_COUNTRIES.find((country) => country.slug === slug);
}

export function isPointInsideBounds(point: LatLng, bounds: LatLngBounds) {
  return (
    point.lat >= bounds.southWest.lat &&
    point.lat <= bounds.northEast.lat &&
    point.lng >= bounds.southWest.lng &&
    point.lng <= bounds.northEast.lng
  );
}

export function clampToBounds(point: LatLng, bounds: LatLngBounds): LatLng {
  return {
    lat: Math.min(
      bounds.northEast.lat,
      Math.max(bounds.southWest.lat, point.lat),
    ),
    lng: Math.min(
      bounds.northEast.lng,
      Math.max(bounds.southWest.lng, point.lng),
    ),
  };
}
