import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { type GameQuestion, type QuestionType } from "~/types/question";

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
  character?: CharacterConfig;
  hp: number;
  isHost: boolean;
}

export interface BattleSettings {
  rounds: number;
  timePerRound: number; // seconds
  startingHp: number;
  /** 与个人模式一致的题型 */
  questionType: QuestionType;
}

export interface PlayerGuess {
  lat: number;
  lng: number;
  year: number;
  guessIndex?: number | null;
  locationPts: number;
  yearPts: number;
  quizPts: number;
  total: number; // after speed multiplier
  distanceKm: number;
  speedMultiplier: number; // 1.0 – 2.0
  isCorrect?: boolean;
}

export interface BattleRoundResult {
  roundIndex: number;
  question: GameQuestion;
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
  character?: CharacterConfig;
}

/** 房主广播大厅设置，供加入方同步 */
export interface PusherRoomSettings {
  settings: BattleSettings;
}

/** 加入方请求房主同步大厅设置 */
export interface PusherRequestRoomSettings {
  playerId: string;
}

export interface PusherGameStarted {
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
  /** 仅同步 ID，加入方本地拉取完整题目，避免 Pusher 消息过大 */
  questionIds: string[];
  roundIndex: number;
  startTime: number;
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
  guessIndex?: number | null;
  submittedAt: number; // Date.now() when player clicked submit
}

export interface PusherRoundResults {
  result: BattleRoundResult;
}

export interface PusherGameOver {
  results: BattleRoundResult[];
  finalHp: Record<string, number>;
}
