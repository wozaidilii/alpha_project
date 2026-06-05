import "server-only";

import { randomUUID } from "crypto";
import { sql } from "~/server/db/client";
import {
  type BattleHistoryRecord,
  type BattleOutcome,
  type PlayerAvatar,
  type PlayerProfile,
  type PlayerSession,
  normalizeAvatar,
} from "~/types/player";

interface PlayerRow {
  id: string;
  name: string;
  avatar_icon: string;
  avatar_color: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BattleHistoryRow {
  id: string;
  room_id: string;
  played_at: Date | string;
  outcome: BattleOutcome;
  player_name: string;
  player_avatar_icon: string;
  player_avatar_color: string;
  opponent_name: string;
  opponent_avatar_icon: string;
  opponent_avatar_color: string;
  total_score: number;
  opponent_score: number;
  remaining_hp: number;
  opponent_hp: number;
  rounds_played: number;
}

interface RecordBattleInput {
  roomId: string;
  outcome: BattleOutcome;
  opponentName: string;
  opponentAvatar: PlayerAvatar;
  totalScore: number;
  opponentScore: number;
  remainingHp: number;
  opponentHp: number;
  roundsPlayed: number;
}

const MAX_HISTORY = 50;
const MAX_SESSIONS = 10;

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toPublicPlayer(row: PlayerRow): PlayerProfile {
  return {
    id: row.id,
    name: row.name,
    avatar: normalizeAvatar({
      icon: row.avatar_icon,
      color: row.avatar_color,
    }),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function toHistoryRecord(row: BattleHistoryRow): BattleHistoryRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    playedAt: toIso(row.played_at),
    outcome: row.outcome,
    playerName: row.player_name,
    playerAvatar: normalizeAvatar({
      icon: row.player_avatar_icon,
      color: row.player_avatar_color,
    }),
    opponentName: row.opponent_name,
    opponentAvatar: normalizeAvatar({
      icon: row.opponent_avatar_icon,
      color: row.opponent_avatar_color,
    }),
    totalScore: row.total_score,
    opponentScore: row.opponent_score,
    remainingHp: row.remaining_hp,
    opponentHp: row.opponent_hp,
    roundsPlayed: row.rounds_played,
  };
}

function normalizeName(name: string) {
  return name.trim().slice(0, 12) || "玩家";
}

async function getPlayerByToken(token: string): Promise<PlayerRow | null> {
  const [row] = await sql<PlayerRow[]>`
    select p.id, p.name, p.avatar_icon, p.avatar_color, p.created_at, p.updated_at
    from players p
    inner join player_sessions s on s.player_id = p.id
    where s.token = ${token}
    limit 1
  `;

  return row ?? null;
}

async function requirePlayerByToken(token: string): Promise<PlayerRow> {
  const player = await getPlayerByToken(token);
  if (!player) {
    throw new Error("Invalid player session");
  }
  return player;
}

export async function loginPlayer(input: {
  userId?: string;
  name: string;
  avatar?: PlayerAvatar;
}): Promise<PlayerSession> {
  const now = new Date();
  const id = input.userId ?? randomUUID();
  const name = normalizeName(input.name);
  const avatar = normalizeAvatar(input.avatar);
  const token = randomUUID();

  const user = await sql.begin(async (tx) => {
    const [player] = await tx<PlayerRow[]>`
      insert into players (
        id,
        name,
        avatar_icon,
        avatar_color,
        created_at,
        updated_at
      )
      values (
        ${id},
        ${name},
        ${avatar.icon},
        ${avatar.color},
        ${now},
        ${now}
      )
      on conflict (id) do update
      set
        name = excluded.name,
        avatar_icon = excluded.avatar_icon,
        avatar_color = excluded.avatar_color,
        updated_at = excluded.updated_at
      returning id, name, avatar_icon, avatar_color, created_at, updated_at
    `;

    await tx`
      insert into player_sessions (token, player_id, created_at)
      values (${token}, ${player!.id}, ${now})
    `;

    await tx`
      delete from player_sessions
      where player_id = ${player!.id}
        and token not in (
          select token
          from player_sessions
          where player_id = ${player!.id}
          order by created_at desc
          limit ${MAX_SESSIONS}
        )
    `;

    return toPublicPlayer(player!);
  });

  return { token, user };
}

export async function getPlayerProfile(token: string): Promise<PlayerProfile> {
  return toPublicPlayer(await requirePlayerByToken(token));
}

export async function updatePlayerProfile(input: {
  token: string;
  name: string;
  avatar: PlayerAvatar;
}): Promise<PlayerProfile> {
  const name = normalizeName(input.name);
  const avatar = normalizeAvatar(input.avatar);

  const [player] = await sql<PlayerRow[]>`
    update players
    set
      name = ${name},
      avatar_icon = ${avatar.icon},
      avatar_color = ${avatar.color},
      updated_at = now()
    where id = (
      select player_id from player_sessions where token = ${input.token}
    )
    returning id, name, avatar_icon, avatar_color, created_at, updated_at
  `;

  if (!player) {
    throw new Error("Invalid player session");
  }

  return toPublicPlayer(player);
}

export async function getBattleHistory(
  token: string,
): Promise<BattleHistoryRecord[]> {
  const player = await requirePlayerByToken(token);
  const rows = await sql<BattleHistoryRow[]>`
    select
      id,
      room_id,
      played_at,
      outcome,
      player_name,
      player_avatar_icon,
      player_avatar_color,
      opponent_name,
      opponent_avatar_icon,
      opponent_avatar_color,
      total_score,
      opponent_score,
      remaining_hp,
      opponent_hp,
      rounds_played
    from battle_history_records
    where player_id = ${player.id}
    order by played_at desc
    limit ${MAX_HISTORY}
  `;

  return rows.map(toHistoryRecord);
}

export async function recordBattleHistory(input: {
  token: string;
  record: RecordBattleInput;
}): Promise<BattleHistoryRecord> {
  const player = await requirePlayerByToken(input.token);
  const opponentAvatar = normalizeAvatar(input.record.opponentAvatar);
  const playerAvatar = normalizeAvatar({
    icon: player.avatar_icon,
    color: player.avatar_color,
  });

  const [record] = await sql<BattleHistoryRow[]>`
    insert into battle_history_records (
      id,
      player_id,
      room_id,
      played_at,
      outcome,
      player_name,
      player_avatar_icon,
      player_avatar_color,
      opponent_name,
      opponent_avatar_icon,
      opponent_avatar_color,
      total_score,
      opponent_score,
      remaining_hp,
      opponent_hp,
      rounds_played
    )
    values (
      ${randomUUID()},
      ${player.id},
      ${input.record.roomId},
      ${new Date()},
      ${input.record.outcome},
      ${player.name},
      ${playerAvatar.icon},
      ${playerAvatar.color},
      ${normalizeName(input.record.opponentName)},
      ${opponentAvatar.icon},
      ${opponentAvatar.color},
      ${Math.max(0, Math.round(input.record.totalScore))},
      ${Math.max(0, Math.round(input.record.opponentScore))},
      ${Math.max(0, Math.round(input.record.remainingHp))},
      ${Math.max(0, Math.round(input.record.opponentHp))},
      ${Math.max(1, Math.round(input.record.roundsPlayed))}
    )
    returning
      id,
      room_id,
      played_at,
      outcome,
      player_name,
      player_avatar_icon,
      player_avatar_color,
      opponent_name,
      opponent_avatar_icon,
      opponent_avatar_color,
      total_score,
      opponent_score,
      remaining_hp,
      opponent_hp,
      rounds_played
  `;

  return toHistoryRecord(record!);
}
