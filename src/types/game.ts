import { type GameQuestion } from "~/types/question";

export interface RoundData {
  question: GameQuestion;
  guessLat: number | null;
  guessLng: number | null;
  guessYear: number;
  distanceKm: number | null;
  locationPts: number;
  yearPts: number;
  total: number;
}
