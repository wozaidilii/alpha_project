import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { type GameQuestion } from "~/types/question";
import { type GameModeSlug } from "~/lib/game-mode";
import { type TuxunLocation } from "~/lib/tuxun-locations";
import { type HistoryTuxunPlayState } from "~/lib/history-tuxun-puzzle";
import { type AnimeTuxunPlayState } from "~/lib/anime-tuxun-puzzle";
import {
  type AnimeGuessrDifficultyTier,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";

export const BATTLE_MAX_PLAYERS = 8;

export interface BattleTuxunQuestion {
  id: string;
  type: "tuxun";
  title: string;
  location: TuxunLocation;
}

export interface BattleForeignQuestion {
  id: string;
  type: "foreign";
  title: string;
  location: TuxunLocation;
}

export interface BattleHistoryTuxunQuestion {
  id: string;
  type: "history-tuxun";
  title: string;
  playState: HistoryTuxunPlayState;
}

export interface BattleAnimeTuxunQuestion {
  id: string;
  type: "anime-tuxun";
  title: string;
  playState: AnimeTuxunPlayState;
}

export interface BattleAnimeQuestion {
  id: string;
  type: "anime";
  title: string;
  question: AnimeGuessrQuestion;
}

export type BattleQuestion =
  | GameQuestion
  | BattleTuxunQuestion
  | BattleForeignQuestion
  | BattleHistoryTuxunQuestion
  | BattleAnimeTuxunQuestion
  | BattleAnimeQuestion;

export type BattleRoomPhase = "lobby" | "starting" | "playing" | "closed";
export type BattleRoundStatus =
  | "playing"
  | "elimination"
  | "round-result"
  | "game-over";

export type BattlePhase =
  | "lobby" // waiting for 2nd player
  | "playing" // round in progress
  | "elimination" // player eliminated this round
  | "round-result" // showing results
  | "game-over"; // game ended

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
  /** 与个人模式一致的模式 */
  questionType: GameModeSlug;
  /** 动漫对战模式的难度档位，决定题库范围 */
  difficultyTier?: AnimeGuessrDifficultyTier;
}

export interface BattleRoomSnapshot {
  roomId: string;
  phase: BattleRoomPhase;
  roundStatus?: BattleRoundStatus;
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
  /** 普通题库模式仅同步 ID，加入方本地拉取完整题目，避免消息过大 */
  questionIds?: string[];
  /** 随机街景题需要同步完整题目，保证所有玩家看到同一处街景 */
  questions?: BattleQuestion[];
  guesses?: Record<string, PusherGuessSubmitted>;
  results?: BattleRoundResult[];
  roundReady?: Record<string, boolean>;
  finalHp?: Record<string, number>;
  roundIndex?: number;
  startTime?: number;
  updatedAt: number;
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
  speedCompensationPts?: number;
  elapsedSeconds?: number;
  submitted?: boolean;
  isCorrect?: boolean;
  /** 单人 anime 计分：100 秒内距离 ≥90 且总分突破常规满分上限（>100） */
  scoreBreakthrough?: boolean;
}

export interface BattleRoundResult {
  roundIndex: number;
  question: BattleQuestion;
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
  isHost?: boolean;
}

/** 房主广播大厅设置，供加入方同步 */
export interface PusherRoomSettings {
  settings: BattleSettings;
}

/** 加入方请求房主同步大厅设置 */
export interface PusherRequestRoomSettings {
  playerId: string;
}

export interface PusherGameStarting {
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
}

export interface PusherGameStarted {
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
  /** 普通题库模式仅同步 ID，加入方本地拉取完整题目，避免 Pusher 消息过大 */
  questionIds?: string[];
  /** 房主开局时由服务端保存的完整题组；Pusher 仅作信号，客户端以 HTTP 快照为准 */
  questions?: BattleQuestion[];
  /** 题组指纹，供客户端校验是否与服务端一致 */
  questionDeckKey?: string;
  roundIndex: number;
  startTime: number;
}

export interface PusherRoundStarted {
  roundIndex: number;
  startTime: number; // Date.now() on host
}

export interface PusherGuessSubmitted {
  playerId: string;
  roundIndex: number;
  lat: number;
  lng: number;
  year: number;
  guessIndex?: number | null;
  submittedAt: number; // Date.now() when player clicked submit
}

export interface PusherRoundResults {
  result: BattleRoundResult;
}

/** 结果页点击「准备」 */
export interface PusherRoundReady {
  playerId: string;
  roundIndex: number;
}

export interface PusherGameOver {
  results: BattleRoundResult[];
  finalHp: Record<string, number>;
}
