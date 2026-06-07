/** 中国范围（WGS84），用于限制拖拽与默认视野 */
export const CHINA_BOUNDS = {
  southWest: { lat: 17.5, lng: 73.5 },
  northEast: { lat: 53.6, lng: 135.1 },
} as const;

export const CHINA_MAP_CENTER = { lat: 35, lng: 103 };
export const CHINA_MAP_ZOOM = 4;

export interface LatLng {
  lat: number;
  lng: number;
}

export function clampToChina({ lat, lng }: LatLng): LatLng {
  return {
    lat: Math.min(
      CHINA_BOUNDS.northEast.lat,
      Math.max(CHINA_BOUNDS.southWest.lat, lat),
    ),
    lng: Math.min(
      CHINA_BOUNDS.northEast.lng,
      Math.max(CHINA_BOUNDS.southWest.lng, lng),
    ),
  };
}
