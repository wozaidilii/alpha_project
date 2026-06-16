import {
  type LocationTuxunPuzzle,
  type LocationTuxunStreetViewScene,
} from "~/types/location-tuxun";
import { BAIDU_MAP_AK, findBaiduPanoramaNear } from "~/lib/baidu-panorama";

export const HISTORY_TUXUN_SCENE_RADIUS_KM = 5;
export const HISTORY_TUXUN_CLUE_INTERVAL_SECONDS = 10;
const PANORAMA_CANDIDATE_ATTEMPTS = 5;
const PANORAMA_LOOKUP_RADIUS_METERS = 1600;

export interface HistoryTuxunScene {
  lat: number;
  lng: number;
  panoId?: string;
}

export interface HistoryTuxunPlayState {
  puzzleId: string;
  location: string;
  answerName: string;
  answerContext: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  clues: string[];
  funfact: string[];
  sceneLat: number;
  sceneLng: number;
  scenePanoId?: string;
  heading: number;
  pitch: number;
  fov: number;
}

export function randomPointAroundCenter(
  center: { lat: number; lng: number },
  radiusKm: number,
): { lat: number; lng: number } {
  const angle = Math.random() * Math.PI * 2;
  const distanceKm = Math.sqrt(Math.random()) * radiusKm;
  const latOffset = (Math.cos(angle) * distanceKm) / 111;
  const lngOffset =
    (Math.sin(angle) * distanceKm) /
    (111 * Math.cos((center.lat * Math.PI) / 180));

  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset,
  };
}

function panoramaSearchRadiusKm(puzzle: LocationTuxunPuzzle) {
  return Math.min(puzzle.radiusKm, HISTORY_TUXUN_SCENE_RADIUS_KM);
}

export function getCachedHistoryTuxunScene(
  puzzle: LocationTuxunPuzzle,
): HistoryTuxunScene | null {
  if (!puzzle.streetViewScene) return null;

  return {
    lat: puzzle.streetViewScene.lat,
    lng: puzzle.streetViewScene.lng,
    panoId: puzzle.streetViewScene.panoId,
  };
}

export function buildHistoryTuxunPanoramaCandidates(
  puzzle: LocationTuxunPuzzle,
): LocationTuxunStreetViewScene[] {
  const center = { lat: puzzle.centerLat, lng: puzzle.centerLng };
  const searchRadiusKm = panoramaSearchRadiusKm(puzzle);

  return [
    center,
    ...Array.from({ length: PANORAMA_CANDIDATE_ATTEMPTS }, () =>
      randomPointAroundCenter(center, searchRadiusKm),
    ),
  ];
}

export async function findHistoryTuxunScene(
  puzzle: LocationTuxunPuzzle,
): Promise<HistoryTuxunScene | null> {
  if (!BAIDU_MAP_AK) {
    throw new Error("未配置百度地图 AK，无法匹配有街景的历史题。");
  }

  const baiduMapAk = BAIDU_MAP_AK;
  const candidates = buildHistoryTuxunPanoramaCandidates(puzzle);

  for (const candidate of candidates) {
    const panorama = await findBaiduPanoramaNear(
      baiduMapAk,
      { lat: candidate.lat, lng: candidate.lng },
      PANORAMA_LOOKUP_RADIUS_METERS,
    );

    if (!panorama) continue;

    return {
      lat: panorama.point.lat,
      lng: panorama.point.lng,
      panoId: panorama.panoId,
    };
  }

  return null;
}

export function buildHistoryTuxunPlayState(
  puzzle: LocationTuxunPuzzle,
  scene: HistoryTuxunScene,
): HistoryTuxunPlayState {
  return {
    puzzleId: puzzle.puzzleId,
    location: puzzle.location,
    answerName: puzzle.answerName,
    answerContext: puzzle.answerContext,
    centerLat: puzzle.centerLat,
    centerLng: puzzle.centerLng,
    radiusKm: puzzle.radiusKm,
    clues: puzzle.clues,
    funfact: puzzle.funfact,
    sceneLat: scene.lat,
    sceneLng: scene.lng,
    scenePanoId: scene.panoId,
    heading: Math.floor(Math.random() * 360),
    pitch: 0,
    fov: 90 + Math.floor(Math.random() * 8),
  };
}
