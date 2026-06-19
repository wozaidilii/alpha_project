import { type AnimeTuxunPuzzle } from "~/types/anime-tuxun";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";
import { findGoogleStreetViewNear } from "~/lib/google-street-view";
import { randomPointAroundCenter } from "~/lib/history-tuxun-puzzle";
import { type TuxunLocation } from "~/lib/tuxun-locations";

export const ANIME_TUXUN_SCENE_RADIUS_KM = 5;
export { HISTORY_TUXUN_CLUE_INTERVAL_SECONDS as ANIME_TUXUN_CLUE_INTERVAL_SECONDS } from "~/lib/history-tuxun-puzzle";

export interface AnimeTuxunScene {
  lat: number;
  lng: number;
  panoId?: string;
}

export interface AnimeTuxunPlayState {
  puzzleId: string;
  location: string;
  answerName: string;
  answerContext: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  clues: string[];
  funfact: string[];
  animeTitles: string[];
  sceneLat: number;
  sceneLng: number;
  scenePanoId?: string;
  heading: number;
  pitch: number;
}

function panoramaSearchRadiusKm(puzzle: AnimeTuxunPuzzle) {
  return Math.min(puzzle.radiusKm, ANIME_TUXUN_SCENE_RADIUS_KM);
}

export function getCachedAnimeTuxunScene(
  puzzle: AnimeTuxunPuzzle,
): AnimeTuxunScene | null {
  if (!puzzle.streetViewScene) return null;

  return {
    lat: puzzle.streetViewScene.lat,
    lng: puzzle.streetViewScene.lng,
    panoId: puzzle.streetViewScene.panoId,
  };
}

export function buildAnimeTuxunStreetViewLocation(
  puzzle: AnimeTuxunPuzzle,
  scene: AnimeTuxunScene,
): TuxunLocation {
  return {
    id: `${puzzle.puzzleId}:${scene.panoId ?? `${scene.lat}-${scene.lng}`}`,
    title: puzzle.answerName,
    province: "日本",
    city: puzzle.answerName,
    lat: scene.lat,
    lng: scene.lng,
    panoId: scene.panoId,
    heading: Math.floor(Math.random() * 360),
    pitch: 0,
    source: "google-random",
    hint: puzzle.answerContext,
  };
}

export async function findAnimeTuxunScene(
  puzzle: AnimeTuxunPuzzle,
): Promise<AnimeTuxunScene | null> {
  const cached = getCachedAnimeTuxunScene(puzzle);
  if (cached) return cached;

  const center = { lat: puzzle.centerLat, lng: puzzle.centerLng };
  const searchRadiusKm = panoramaSearchRadiusKm(puzzle);

  const direct = await findGoogleStreetViewNear(
    center,
    searchRadiusKm,
    DEFAULT_FOREIGN_COUNTRY,
    1,
  );
  if (direct) {
    return {
      lat: direct.point.lat,
      lng: direct.point.lng,
      panoId: direct.panoId,
    };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomPointAroundCenter(center, searchRadiusKm);
    const result = await findGoogleStreetViewNear(
      candidate,
      Math.max(1.2, searchRadiusKm * 0.35),
      DEFAULT_FOREIGN_COUNTRY,
      1,
    );
    if (result) {
      return {
        lat: result.point.lat,
        lng: result.point.lng,
        panoId: result.panoId,
      };
    }
  }

  return null;
}

export function buildAnimeTuxunPlayState(
  puzzle: AnimeTuxunPuzzle,
  scene: AnimeTuxunScene,
): AnimeTuxunPlayState {
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
    animeTitles: puzzle.animeTitles,
    sceneLat: scene.lat,
    sceneLng: scene.lng,
    scenePanoId: scene.panoId,
    heading: Math.floor(Math.random() * 360),
    pitch: 0,
  };
}
