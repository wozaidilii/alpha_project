export const AVATAR_ICONS = [
  "🧭",
  "🏯",
  "⚔️",
  "🗺️",
  "🏛️",
  "⛵",
  "📜",
  "🛡️",
  "🏺",
  "📚",
] as const;

export const AVATAR_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#84cc16",
] as const;

export interface PlayerAvatar {
  icon: string;
  color: string;
}

export interface PlayerProfile {
  id: string;
  email: string | null;
  name: string;
  avatar: PlayerAvatar;
  avatarUrl?: string | null;
  provider?: string | null;
  profileCompleted: boolean;
  soloHighScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerSession {
  token: string;
  user: PlayerProfile;
}

export interface AnimeRoundResultSummary {
  id: string;
  score: number;
  maxScore: number;
  rounds: number;
  playedAt: string;
}

export type BattleOutcome = "win" | "loss" | "draw";

export interface BattleHistoryRecord {
  id: string;
  roomId: string;
  playedAt: string;
  outcome: BattleOutcome;
  playerName: string;
  playerAvatar: PlayerAvatar;
  opponentName: string;
  opponentAvatar: PlayerAvatar;
  totalScore: number;
  opponentScore: number;
  remainingHp: number;
  opponentHp: number;
  roundsPlayed: number;
}

export const DEFAULT_AVATAR: PlayerAvatar = {
  icon: AVATAR_ICONS[0],
  color: AVATAR_COLORS[0],
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeAvatar(avatar?: Partial<PlayerAvatar> | null) {
  const icon =
    avatar?.icon && avatar.icon.trim().length > 0
      ? avatar.icon.trim().slice(0, 4)
      : DEFAULT_AVATAR.icon;
  const color =
    avatar?.color && HEX_COLOR_PATTERN.test(avatar.color)
      ? avatar.color
      : DEFAULT_AVATAR.color;

  return { icon, color };
}

export function isPlayerAvatar(value: unknown): value is PlayerAvatar {
  if (!isRecord(value)) return false;
  return typeof value.icon === "string" && typeof value.color === "string";
}

export function isPlayerProfile(value: unknown): value is PlayerProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (typeof value.email === "string" || value.email === null) &&
    typeof value.name === "string" &&
    isPlayerAvatar(value.avatar) &&
    (value.avatarUrl === undefined ||
      typeof value.avatarUrl === "string" ||
      value.avatarUrl === null) &&
    (value.provider === undefined ||
      typeof value.provider === "string" ||
      value.provider === null) &&
    typeof value.profileCompleted === "boolean" &&
    (value.soloHighScore === undefined ||
      typeof value.soloHighScore === "number") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isPlayerSession(value: unknown): value is PlayerSession {
  if (!isRecord(value)) return false;
  return typeof value.token === "string" && isPlayerProfile(value.user);
}
