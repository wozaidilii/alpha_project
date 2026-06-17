export interface AnimeTuxunQuestion {
  id: string;
  sourceId: string;
  location: string;
  modernName: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  title: string;
  animeTitle: string;
  aspect?: string;
  hint: string;
  funfact?: string[];
  difficulty?: number;
  qualityFlags: string[];
  year?: number;
  yearEnd?: number;
  yearNote?: string;
  category: string;
  region?: string;
  prefectures: string[];
  subjectNote?: string;
  locationScope?: string;
  locationNote?: string;
  realPlaceName?: string;
  fictionalPlaceNames: string[];
}

export interface AnimeTuxunStreetViewScene {
  lat: number;
  lng: number;
  panoId?: string;
}

export interface AnimeTuxunPuzzle {
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
  difficulty?: number;
  year?: number;
  yearEnd?: number;
  questionIds: string[];
  streetViewScene?: AnimeTuxunStreetViewScene;
}
