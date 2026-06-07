import { type GameQuestion } from "~/types/question";

export interface RoundData {
  question: GameQuestion;
  guessLat: number | null;
  guessLng: number | null;
  guessYear: number;
  guessIndex: number | null;
  distanceKm: number | null;
  locationPts: number;
  yearPts: number;
  quizPts: number;
  total: number;
  isCorrect?: boolean;
  timedOut?: boolean;
}
