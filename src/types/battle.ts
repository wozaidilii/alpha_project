import { type HistoricalEvent } from "~/types/event";
import { type PlayerAvatar } from "~/types/player";

export type BattlePhase =
  | "lobby"        // waiting for 2nd player
  | "playing"      // round in progress
  | "round-result" // showing results
  | "game-over";   // game ended

export interface BattlePlayer {
  id: string;
  userId?: string;
  name: string;
  avatar: PlayerAvatar;
  hp: number;
  isHost: boolean;
}

export interface BattleSettings {
  rounds: number;
  timePerRound: number; // seconds
  startingHp: number;
}

export interface PlayerGuess {
  lat: number;
  lng: number;
  year: number;
  locationPts: number;
  yearPts: number;
  total: number; // after speed multiplier
  distanceKm: number;
  speedMultiplier: number; // 1.0 – 2.0
}

export interface BattleRoundResult {
  roundIndex: number;
  event: HistoricalEvent;
  guesses: Record<string, PlayerGuess>; // keyed by playerId
  hpAfter: Record<string, number>;
  damage: Record<string, number>; // hp lost this round per player
}

// ─── Pusher event shapes ────────────────────────────────────────────────────

export interface PusherPlayerJoined {
  playerId: string;
  userId?: string;
  name: string;
  avatar: PlayerAvatar;
}

export interface PusherGameStarted {
  settings: BattleSettings;
  events: HistoricalEvent[];
  players: Record<string, BattlePlayer>;
}

export interface PusherRoundStarted {
  roundIndex: number;
  startTime: number; // Date.now() on host
}

export interface PusherGuessSubmitted {
  playerId: string;
  lat: number;
  lng: number;
  year: number;
  submittedAt: number; // Date.now() when player clicked submit
}

export interface PusherRoundResults {
  result: BattleRoundResult;
}

export interface PusherGameOver {
  results: BattleRoundResult[];
  finalHp: Record<string, number>;
}
