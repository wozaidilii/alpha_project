import { type LocationTuxunPuzzle } from "~/types/location-tuxun";

export const HISTORY_TUXUN_SCENE_RADIUS_KM = 5;

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
