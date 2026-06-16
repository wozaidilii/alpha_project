export interface LocationTuxunQuestion {
  id: string;
  sourceId: string;
  location: string;
  modernName: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  title: string;
  aspect?: string;
  hint: string;
  funfact?: string[];
  difficulty?: number;
  qualityFlags: string[];
  year?: number;
  yearEnd?: number;
  yearNote?: string;
  category: string;
  subjectNote?: string;
  locationScope?: string;
  locationNote?: string;
  ancientNames: string[];
}

export interface LocationTuxunStreetViewScene {
  lat: number;
  lng: number;
  panoId?: string;
}

export interface LocationTuxunPuzzle {
  puzzleId: string;
  location: string;
  answerName: string;
  answerContext: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  clues: string[];
  funfact: string[];
  difficulty?: number;
  year?: number;
  questionIds: string[];
  streetViewScene?: LocationTuxunStreetViewScene;
}
