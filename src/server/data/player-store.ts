import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { type TransactionSql } from "postgres";
import { displayNameFromEmail } from "~/lib/email-login-code";
import { env } from "~/env";
import { sendEmailVerificationCode } from "~/server/email/verification-code";
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
  email: string | null;
  name: string;
  avatar_icon: string;
  avatar_color: string;
  profile_completed: boolean;
  solo_high_score: number;
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

interface EmailVerificationCodeRow {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: Date | string;
  consumed_at: Date | string | null;
  created_at: Date | string;
}

type ActivityPayload = Record<string, string | number | boolean | null>;

interface RecordActivityInput {
  token?: string;
  playerId?: string;
  email?: string;
  eventType: string;
  payload?: ActivityPayload;
  route?: string;
  userAgent?: string | null;
}

export interface EmailLoginCodeRequestResult {
  expiresInSeconds: number;
  delivery: "email" | "debug";
  debugCode?: string;
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
const EMAIL_CODE_EXPIRES_IN_SECONDS = 10 * 60;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

function toIso(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toPublicPlayer(row: PlayerRow): PlayerProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: normalizeAvatar({
      icon: row.avatar_icon,
      color: row.avatar_color,
    }),
    profileCompleted: row.profile_completed,
    soloHighScore: row.solo_high_score,
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getEmailVerificationSecret() {
  if (env.EMAIL_VERIFICATION_SECRET) return env.EMAIL_VERIFICATION_SECRET;
  if (env.NODE_ENV === "production") {
    throw new Error("Email verification secret is not configured");
  }
  return "dev-email-verification-secret";
}

function generateEmailVerificationCode() {
  return String(randomInt(100000, 1000000));
}

function hashEmailVerificationCode(email: string, code: string) {
  return createHmac("sha256", getEmailVerificationSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

function isVerificationCodeExpired(row: EmailVerificationCodeRow) {
  return new Date(row.expires_at).getTime() <= Date.now();
}

function isVerificationCodeMatch(row: EmailVerificationCodeRow, code: string) {
  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashEmailVerificationCode(row.email, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function normalizeWechatOpenId(openId: string) {
  const normalized = openId.trim();
  if (normalized.length === 0) {
    throw new Error("Invalid WeChat openid");
  }
  return normalized;
}

async function getPlayerByToken(token: string): Promise<PlayerRow | null> {
  const [row] = await sql<PlayerRow[]>`
    select
      p.id,
      p.email,
      p.name,
      p.avatar_icon,
      p.avatar_color,
      p.profile_completed,
      p.solo_high_score,
      p.created_at,
      p.updated_at
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

async function createSessionForPlayer(
  tx: TransactionSql,
  playerId: string,
  now: Date,
) {
  const token = randomUUID();

  await tx`
    insert into player_sessions (token, player_id, created_at)
    values (${token}, ${playerId}, ${now})
  `;

  await tx`
    delete from player_sessions
    where player_id = ${playerId}
      and token not in (
        select token
        from player_sessions
        where player_id = ${playerId}
        order by created_at desc
        limit ${MAX_SESSIONS}
      )
  `;

  return token;
}

export async function recordPlayerActivity(
  input: RecordActivityInput,
): Promise<{ ok: true }> {
  let playerId = input.playerId;
  let email = input.email ? normalizeEmail(input.email) : undefined;

  if (input.token) {
    const player = await requirePlayerByToken(input.token);
    playerId = player.id;
    email ??= player.email ?? undefined;
  }

  await sql`
    insert into player_activity_events (
      id,
      player_id,
      email,
      event_type,
      event_payload,
      route,
      user_agent,
      created_at
    )
    values (
      ${randomUUID()},
      ${playerId ?? null},
      ${email ?? null},
      ${input.eventType},
      ${sql.json(input.payload ?? {})},
      ${input.route ?? null},
      ${input.userAgent ?? null},
      ${new Date()}
    )
  `;

  return { ok: true };
}

export async function requestEmailLoginCode(
  emailInput: string,
  meta: { userAgent?: string | null } = {},
): Promise<EmailLoginCodeRequestResult> {
  const now = new Date();
  const email = normalizeEmail(emailInput);
  const code = generateEmailVerificationCode();
  const expiresAt = new Date(
    now.getTime() + EMAIL_CODE_EXPIRES_IN_SECONDS * 1000,
  );

  await sql`
    update player_email_verification_codes
    set consumed_at = ${now}
    where email = ${email}
      and consumed_at is null
      and expires_at <= ${now}
  `;

  const id = randomUUID();
  await sql`
    insert into player_email_verification_codes (
      id,
      email,
      code_hash,
      attempts,
      expires_at,
      created_at
    )
    values (
      ${id},
      ${email},
      ${hashEmailVerificationCode(email, code)},
      0,
      ${expiresAt},
      ${now}
    )
  `;

  try {
    const delivery = await sendEmailVerificationCode({ email, code });
    await recordPlayerActivity({
      email,
      eventType: "email_code_requested",
      payload: { delivery: delivery.mode },
      userAgent: meta.userAgent,
    });

    return {
      expiresInSeconds: EMAIL_CODE_EXPIRES_IN_SECONDS,
      delivery: delivery.mode,
      debugCode: delivery.debugCode,
    };
  } catch (error) {
    await sql`
      update player_email_verification_codes
      set consumed_at = ${new Date()}
      where id = ${id}
    `;
    throw error;
  }
}

export async function verifyEmailLoginCode(
  emailInput: string,
  code: string,
  meta: { userAgent?: string | null } = {},
): Promise<PlayerSession> {
  const now = new Date();
  const email = normalizeEmail(emailInput);

  const [verification] = await sql<EmailVerificationCodeRow[]>`
    select
      id,
      email,
      code_hash,
      attempts,
      expires_at,
      consumed_at,
      created_at
    from player_email_verification_codes
    where email = ${email}
      and consumed_at is null
    order by created_at desc
    limit 1
  `;

  if (!verification) {
    throw new Error("Invalid email verification code");
  }

  if (isVerificationCodeExpired(verification)) {
    await sql`
      update player_email_verification_codes
      set consumed_at = ${now}
      where id = ${verification.id}
    `;
    throw new Error("Email verification code expired");
  }

  if (verification.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await sql`
      update player_email_verification_codes
      set consumed_at = ${now}
      where id = ${verification.id}
    `;
    throw new Error("Too many email verification attempts");
  }

  if (!isVerificationCodeMatch(verification, code)) {
    const attempts = verification.attempts + 1;
    await sql`
      update player_email_verification_codes
      set
        attempts = ${attempts},
        consumed_at = case
          when ${attempts} >= ${EMAIL_CODE_MAX_ATTEMPTS} then ${now}
          else consumed_at
        end
      where id = ${verification.id}
    `;
    throw new Error("Invalid email verification code");
  }

  const id = randomUUID();
  const avatar = normalizeAvatar();
  const name = normalizeName(displayNameFromEmail(email));

  const { token, user } = await sql.begin(async (tx) => {
    await tx`
      update player_email_verification_codes
      set consumed_at = ${now}
      where id = ${verification.id}
    `;

    const [player] = await tx<PlayerRow[]>`
      insert into players (
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        created_at,
        updated_at
      )
      values (
        ${id},
        ${email},
        ${name},
        ${avatar.icon},
        ${avatar.color},
        true,
        0,
        ${now},
        ${now}
      )
      on conflict (email) do update
      set
        name = case
          when players.profile_completed then players.name
          else excluded.name
        end,
        profile_completed = true,
        updated_at = excluded.updated_at
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        created_at,
        updated_at
    `;

    const token = await createSessionForPlayer(tx, player!.id, now);

    return {
      token,
      user: toPublicPlayer(player!),
    };
  });

  await recordPlayerActivity({
    playerId: user.id,
    email,
    eventType: "email_login_completed",
    payload: { method: "email_code" },
    userAgent: meta.userAgent,
  });

  return { token, user };
}

export async function loginPlayerByWechatOpenId(
  openIdInput: string,
): Promise<PlayerSession> {
  const now = new Date();
  const openId = normalizeWechatOpenId(openIdInput);
  const id = randomUUID();
  const avatar = normalizeAvatar();
  const name = normalizeName("微信玩家");

  const { token, user } = await sql.begin(async (tx) => {
    const [player] = await tx<PlayerRow[]>`
      insert into players (
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        wechat_openid,
        created_at,
        updated_at
      )
      values (
        ${id},
        null,
        ${name},
        ${avatar.icon},
        ${avatar.color},
        true,
        0,
        ${openId},
        ${now},
        ${now}
      )
      on conflict (wechat_openid) do update
      set updated_at = players.updated_at
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        created_at,
        updated_at
    `;

    const token = await createSessionForPlayer(tx, player!.id, now);

    return {
      token,
      user: toPublicPlayer(player!),
    };
  });

  return { token, user };
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

  const { token, user } = await sql.begin(async (tx) => {
    const [player] = await tx<PlayerRow[]>`
      insert into players (
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        created_at,
        updated_at
      )
      values (
        ${id},
        null,
        ${name},
        ${avatar.icon},
        ${avatar.color},
        true,
        0,
        ${now},
        ${now}
      )
      on conflict (id) do update
      set
        name = excluded.name,
        avatar_icon = excluded.avatar_icon,
        avatar_color = excluded.avatar_color,
        profile_completed = true,
        updated_at = excluded.updated_at
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        created_at,
        updated_at
    `;

    const token = await createSessionForPlayer(tx, player!.id, now);

    return {
      token,
      user: toPublicPlayer(player!),
    };
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
      profile_completed = true,
      updated_at = now()
    where id = (
      select player_id from player_sessions where token = ${input.token}
    )
    returning
      id,
      email,
      name,
      avatar_icon,
      avatar_color,
      profile_completed,
      solo_high_score,
      created_at,
      updated_at
  `;

  if (!player) {
    throw new Error("Invalid player session");
  }

  return toPublicPlayer(player);
}

export async function updateSoloHighScore(input: {
  token: string;
  score: number;
}): Promise<PlayerProfile> {
  const score = Math.max(0, Math.round(input.score));
  const [player] = await sql<PlayerRow[]>`
    update players
    set
      solo_high_score = greatest(solo_high_score, ${score}),
      updated_at = case
        when ${score} > solo_high_score then now()
        else updated_at
      end
    where id = (
      select player_id from player_sessions where token = ${input.token}
    )
    returning
      id,
      email,
      name,
      avatar_icon,
      avatar_color,
      profile_completed,
      solo_high_score,
      created_at,
      updated_at
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
