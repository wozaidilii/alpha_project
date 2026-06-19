import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { type TransactionSql } from "postgres";
import { displayNameFromEmail } from "~/lib/email-login-code";
import { env } from "~/env";
import {
  isEmailIdentifier,
  normalizeUsername,
  normalizeUsernameKey,
} from "~/server/auth/player-credentials";
import { type GoogleProfile } from "~/server/auth/google-oauth";
import { classifyPlayerUniqueViolation } from "~/server/data/postgres-errors";
import { hashPassword, verifyPassword } from "~/server/auth/password";
import { sendEmailVerificationCode } from "~/server/email/verification-code";
import { sql } from "~/server/db/client";
import { normalizeCountryCode } from "~/lib/country";
import {
  type BattleHistoryRecord,
  type BattleOutcome,
  type LeaderboardEntry,
  type LeaderboardResult,
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
  provider?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PasswordPlayerRow extends PlayerRow {
  username: string | null;
  username_key: string | null;
  password_hash: string | null;
  google_sub?: string | null;
}

interface LeaderboardRow {
  rank: number;
  user_id: string;
  name: string;
  avatar_icon: string;
  avatar_color: string;
  avatar_url: string | null;
  country_code: string | null;
  score: number;
  rounds: number;
  played_at: Date | string;
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

interface RecordGameSessionInput {
  token?: string;
  guestId?: string;
  score: number;
  country: string;
  mode: string;
  rounds: number;
}

interface RegistrationMeta {
  userAgent?: string | null;
  countryCode?: string | null;
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
    avatarUrl: row.avatar_url ?? null,
    provider: row.provider ?? null,
    countryCode: row.country_code ?? null,
    profileCompleted: row.profile_completed,
    soloHighScore: row.solo_high_score,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function toLeaderboardEntry(
  row: LeaderboardRow,
  currentUserId?: string,
): LeaderboardEntry {
  return {
    rank: row.rank,
    userId: row.user_id,
    name: row.name,
    avatar: normalizeAvatar({
      icon: row.avatar_icon,
      color: row.avatar_color,
    }),
    avatarUrl: row.avatar_url,
    countryCode: row.country_code,
    score: row.score,
    rounds: row.rounds,
    playedAt: toIso(row.played_at),
    isCurrentUser: row.user_id === currentUserId,
  };
}

function normalizeOptionalCountryCode(value: string | null | undefined) {
  return normalizeCountryCode(value);
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
  return normalizeUsername(name) || "玩家";
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

function assertEmailVerificationRequestConfigured() {
  getEmailVerificationSecret();

  if (
    env.NODE_ENV === "production" &&
    (!env.RESEND_API_KEY || !env.EMAIL_FROM)
  ) {
    throw new Error("Email delivery is not configured");
  }
}

async function createEmailVerificationCode(email: string, now: Date) {
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

  return { id, code };
}

async function consumeEmailVerificationCode(
  email: string,
  code: string,
  now: Date,
) {
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

  await sql`
    update player_email_verification_codes
    set consumed_at = ${now}
    where id = ${verification.id}
  `;
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
      p.provider,
      p.avatar_url,
      p.country_code,
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

export async function recordGameSession(
  input: RecordGameSessionInput,
): Promise<{ ok: true }> {
  let playerId: string | null = null;
  let email: string | undefined;

  if (input.token) {
    const player = await requirePlayerByToken(input.token);
    playerId = player.id;
    email = player.email ?? undefined;
  }

  const normalizedGuestId = input.guestId?.trim();
  const guestId =
    normalizedGuestId && normalizedGuestId.length > 0
      ? normalizedGuestId
      : null;
  if (!playerId && !guestId) {
    throw new Error("Invalid game session owner");
  }

  await sql`
    insert into game_sessions (
      id,
      user_id,
      guest_id,
      score,
      country,
      mode,
      rounds,
      played_at
    )
    values (
      ${randomUUID()},
      ${playerId},
      ${guestId},
      ${Math.max(0, Math.round(input.score))},
      ${input.country.trim().slice(0, 80) || "global"},
      ${input.mode.trim().slice(0, 40) || "anime"},
      ${Math.max(0, Math.round(input.rounds))},
      ${new Date()}
    )
  `;

  if (playerId) {
    await recordPlayerActivity({
      playerId,
      email,
      eventType: "game_session_recorded",
      payload: {
        score: Math.max(0, Math.round(input.score)),
        country: input.country,
        mode: input.mode,
        rounds: Math.max(0, Math.round(input.rounds)),
      },
    });
  }

  return { ok: true };
}

export async function getAnimeLeaderboard(
  input: {
    token?: string;
    limit?: number;
    rounds?: number;
  } = {},
): Promise<LeaderboardResult> {
  const limit = Math.min(Math.max(Math.round(input.limit ?? 20), 1), 50);
  const rounds = input.rounds === 10 ? 10 : 5;
  const currentUser = input.token
    ? await requirePlayerByToken(input.token)
    : null;
  const currentUserId = currentUser?.id;

  const rows = await sql<LeaderboardRow[]>`
    with best_sessions as (
      select
        gs.user_id,
        gs.score,
        gs.rounds,
        gs.played_at,
        row_number() over (
          partition by gs.user_id
          order by gs.score desc, gs.played_at asc
        ) as best_rank
      from game_sessions gs
      where gs.user_id is not null
        and gs.mode = 'anime'
        and gs.rounds = ${rounds}
    ),
    ranked as (
      select
        (row_number() over (
          order by bs.score desc, bs.played_at asc, p.id
        ))::int as rank,
        p.id as user_id,
        p.name,
        p.avatar_icon,
        p.avatar_color,
        p.avatar_url,
        p.country_code,
        bs.score,
        bs.rounds,
        bs.played_at
      from best_sessions bs
      inner join players p on p.id = bs.user_id
      where bs.best_rank = 1
    )
    select *
    from ranked
    order by rank asc
    limit ${limit}
  `;

  const entries = rows.map((row) => toLeaderboardEntry(row, currentUserId));
  let currentUserEntry = entries.find(
    (entry) => entry.userId === currentUserId,
  );

  if (currentUserId && !currentUserEntry) {
    const [row] = await sql<LeaderboardRow[]>`
      with best_sessions as (
        select
          gs.user_id,
          gs.score,
          gs.rounds,
          gs.played_at,
          row_number() over (
            partition by gs.user_id
            order by gs.score desc, gs.played_at asc
          ) as best_rank
        from game_sessions gs
        where gs.user_id is not null
          and gs.mode = 'anime'
          and gs.rounds = ${rounds}
      ),
      ranked as (
        select
          (row_number() over (
            order by bs.score desc, bs.played_at asc, p.id
          ))::int as rank,
          p.id as user_id,
          p.name,
          p.avatar_icon,
          p.avatar_color,
          p.avatar_url,
          p.country_code,
          bs.score,
          bs.rounds,
          bs.played_at
        from best_sessions bs
        inner join players p on p.id = bs.user_id
        where bs.best_rank = 1
      )
      select *
      from ranked
      where user_id = ${currentUserId}
      limit 1
    `;
    currentUserEntry = row ? toLeaderboardEntry(row, currentUserId) : undefined;
  }

  return currentUserEntry ? { entries, currentUserEntry } : { entries };
}

export async function requestEmailLoginCode(
  emailInput: string,
  meta: { userAgent?: string | null } = {},
): Promise<EmailLoginCodeRequestResult> {
  const now = new Date();
  const email = normalizeEmail(emailInput);

  assertEmailVerificationRequestConfigured();
  const verification = await createEmailVerificationCode(email, now);

  try {
    const delivery = await sendEmailVerificationCode({
      email,
      code: verification.code,
      purpose: "login",
    });
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
      where id = ${verification.id}
    `;
    throw error;
  }
}

export async function requestPasswordResetCode(
  emailInput: string,
  meta: { userAgent?: string | null } = {},
): Promise<EmailLoginCodeRequestResult> {
  const now = new Date();
  const email = normalizeEmail(emailInput);

  assertEmailVerificationRequestConfigured();
  const [player] = await sql<{ id: string }[]>`
    select id
    from players
    where email = ${email}
    limit 1
  `;

  if (!player) {
    await recordPlayerActivity({
      email,
      eventType: "password_reset_requested",
      payload: { existingAccount: false },
      userAgent: meta.userAgent,
    });

    return {
      expiresInSeconds: EMAIL_CODE_EXPIRES_IN_SECONDS,
      delivery: "email",
    };
  }

  const verification = await createEmailVerificationCode(email, now);

  try {
    const delivery = await sendEmailVerificationCode({
      email,
      code: verification.code,
      purpose: "password_reset",
    });
    await recordPlayerActivity({
      playerId: player.id,
      email,
      eventType: "password_reset_requested",
      payload: { delivery: delivery.mode, existingAccount: true },
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
      where id = ${verification.id}
    `;
    throw error;
  }
}

export async function verifyEmailLoginCode(
  emailInput: string,
  code: string,
  meta: RegistrationMeta = {},
): Promise<PlayerSession> {
  const now = new Date();
  const email = normalizeEmail(emailInput);
  const countryCode = normalizeOptionalCountryCode(meta.countryCode);

  await consumeEmailVerificationCode(email, code, now);

  const id = randomUUID();
  const avatar = normalizeAvatar();
  const name = normalizeName(displayNameFromEmail(email));

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
        provider,
        country_code,
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
        'email',
        ${countryCode},
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
        provider = coalesce(players.provider, 'email'),
        country_code = coalesce(players.country_code, excluded.country_code),
        updated_at = excluded.updated_at
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        provider,
        avatar_url,
        country_code,
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

export async function registerPlayerWithPassword(
  input: {
    email: string;
    username: string;
    password: string;
  },
  meta: RegistrationMeta = {},
): Promise<PlayerSession> {
  const now = new Date();
  const id = randomUUID();
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const usernameKey = normalizeUsernameKey(username);
  const name = normalizeName(username);
  const avatar = normalizeAvatar();
  const countryCode = normalizeOptionalCountryCode(meta.countryCode);
  const passwordHash = await hashPassword(input.password);

  try {
    const { token, user } = await sql.begin(async (tx) => {
      const [existingEmail] = await tx<
        { id: string; password_hash: string | null }[]
      >`
        select id, password_hash
        from players
        where email = ${email}
        limit 1
      `;

      const [existingUsername] = await tx<{ id: string }[]>`
        select id
        from players
        where username_key = ${usernameKey}
        limit 1
      `;

      if (existingUsername && existingUsername.id !== existingEmail?.id) {
        throw new Error("Username already registered");
      }

      if (existingEmail?.password_hash) {
        throw new Error("Email already registered");
      }

      if (existingEmail) {
        const [player] = await tx<PlayerRow[]>`
          update players
          set
            username = ${username},
            username_key = ${usernameKey},
            name = ${name},
            avatar_icon = ${avatar.icon},
            avatar_color = ${avatar.color},
            profile_completed = true,
            solo_high_score = greatest(solo_high_score, 0),
            password_hash = ${passwordHash},
            provider = 'password',
            country_code = coalesce(country_code, ${countryCode}),
            updated_at = ${now}
          where id = ${existingEmail.id}
          returning
            id,
            email,
            name,
            avatar_icon,
            avatar_color,
            profile_completed,
            solo_high_score,
            provider,
            avatar_url,
            country_code,
            created_at,
            updated_at
        `;

        const token = await createSessionForPlayer(tx, player!.id, now);

        return {
          token,
          user: toPublicPlayer(player!),
        };
      }

      const [player] = await tx<PlayerRow[]>`
        insert into players (
          id,
          email,
          username,
          username_key,
          name,
          avatar_icon,
          avatar_color,
          profile_completed,
          solo_high_score,
          password_hash,
          provider,
          country_code,
          created_at,
          updated_at
        )
        values (
          ${id},
          ${email},
          ${username},
          ${usernameKey},
          ${name},
          ${avatar.icon},
          ${avatar.color},
          true,
          0,
          ${passwordHash},
          'password',
          ${countryCode},
          ${now},
          ${now}
        )
        returning
          id,
          email,
          name,
          avatar_icon,
          avatar_color,
          profile_completed,
          solo_high_score,
          provider,
          avatar_url,
          country_code,
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
      eventType: "password_registration_completed",
      payload: { method: "password" },
      userAgent: meta.userAgent,
    });

    return { token, user };
  } catch (error) {
    const uniqueTarget = classifyPlayerUniqueViolation(error);
    if (uniqueTarget === "email") {
      throw new Error("Email already registered");
    }
    if (uniqueTarget === "username" || uniqueTarget === "unknown") {
      throw new Error("Username already registered");
    }
    throw error;
  }
}

export async function loginPlayerWithPassword(
  input: {
    identifier: string;
    password: string;
  },
  meta: { userAgent?: string | null } = {},
): Promise<PlayerSession> {
  const now = new Date();
  const identifier = input.identifier.trim();
  const email = isEmailIdentifier(identifier)
    ? normalizeEmail(identifier)
    : null;
  const usernameKey = normalizeUsernameKey(identifier);

  const [player] = await sql<PasswordPlayerRow[]>`
    select
      id,
      email,
      username,
      username_key,
      name,
      avatar_icon,
      avatar_color,
      profile_completed,
      solo_high_score,
      password_hash,
      provider,
      avatar_url,
      country_code,
      created_at,
      updated_at
    from players
    where password_hash is not null
      and (
        (${email}::text is not null and email = ${email})
        or username_key = ${usernameKey}
      )
    limit 1
  `;

  if (
    !player ||
    !(await verifyPassword(input.password, player.password_hash))
  ) {
    throw new Error("Invalid account or password");
  }

  const token = await sql.begin((tx) =>
    createSessionForPlayer(tx, player.id, now),
  );
  const user = toPublicPlayer(player);

  await recordPlayerActivity({
    playerId: user.id,
    email: user.email ?? email ?? undefined,
    eventType: "password_login_completed",
    payload: { method: "password" },
    userAgent: meta.userAgent,
  });

  return { token, user };
}

export async function loginPlayerWithGoogle(
  profile: GoogleProfile,
  meta: RegistrationMeta = {},
): Promise<PlayerSession> {
  const now = new Date();
  const email = normalizeEmail(profile.email);
  const name = normalizeName(profile.name || displayNameFromEmail(email));
  const avatar = normalizeAvatar();
  const countryCode = normalizeOptionalCountryCode(meta.countryCode);

  const { token, user } = await sql.begin(async (tx) => {
    const [existing] = await tx<PasswordPlayerRow[]>`
      select
        id,
        email,
        username,
        username_key,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        password_hash,
        google_sub,
        provider,
        avatar_url,
        country_code,
        created_at,
        updated_at
      from players
      where google_sub = ${profile.sub}
        or email = ${email}
      limit 1
    `;

    if (existing) {
      const [player] = await tx<PlayerRow[]>`
        update players
        set
          email = coalesce(email, ${email}),
          google_sub = ${profile.sub},
          provider = 'google',
          avatar_url = ${profile.picture ?? null},
          name = case
            when profile_completed then players.name
            else ${name}
          end,
          avatar_icon = case
            when profile_completed then players.avatar_icon
            else ${avatar.icon}
          end,
          avatar_color = case
            when profile_completed then players.avatar_color
            else ${avatar.color}
          end,
          country_code = coalesce(country_code, ${countryCode}),
          profile_completed = true,
          updated_at = ${now}
        where id = ${existing.id}
        returning
          id,
          email,
          name,
          avatar_icon,
          avatar_color,
          profile_completed,
          solo_high_score,
          provider,
          avatar_url,
          country_code,
          created_at,
          updated_at
      `;

      const token = await createSessionForPlayer(tx, player!.id, now);

      return {
        token,
        user: toPublicPlayer(player!),
      };
    }

    const [player] = await tx<PlayerRow[]>`
      insert into players (
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        google_sub,
        provider,
        avatar_url,
        country_code,
        created_at,
        updated_at
      )
      values (
        ${randomUUID()},
        ${email},
        ${name},
        ${avatar.icon},
        ${avatar.color},
        true,
        0,
        ${profile.sub},
        'google',
        ${profile.picture ?? null},
        ${countryCode},
        ${now},
        ${now}
      )
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        provider,
        avatar_url,
        country_code,
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
    eventType: "google_login_completed",
    payload: { method: "google" },
    userAgent: meta.userAgent,
  });

  return { token, user };
}

export async function resetPlayerPasswordWithCode(
  input: {
    email: string;
    code: string;
    password: string;
  },
  meta: { userAgent?: string | null } = {},
): Promise<PlayerSession> {
  const now = new Date();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  await consumeEmailVerificationCode(email, input.code, now);

  const { token, user } = await sql.begin(async (tx) => {
    const [player] = await tx<PlayerRow[]>`
      update players
      set
        password_hash = ${passwordHash},
        updated_at = ${now}
      where email = ${email}
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        provider,
        avatar_url,
        country_code,
        created_at,
        updated_at
    `;

    if (!player) {
      throw new Error("Invalid password reset account");
    }

    const token = await createSessionForPlayer(tx, player.id, now);

    return {
      token,
      user: toPublicPlayer(player),
    };
  });

  await recordPlayerActivity({
    playerId: user.id,
    email,
    eventType: "password_reset_completed",
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
        provider,
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
        'wechat',
        ${now},
        ${now}
      )
      on conflict (wechat_openid) do update
      set
        provider = coalesce(players.provider, 'wechat'),
        updated_at = players.updated_at
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        provider,
        avatar_url,
        country_code,
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
        provider,
        avatar_url,
        country_code,
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
        null,
        null,
        null,
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
        provider,
        avatar_url,
        country_code,
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
  countryCode?: string | null;
}): Promise<PlayerProfile> {
  const name = normalizeName(input.name);
  const usernameKey = normalizeUsernameKey(name);
  const avatar = normalizeAvatar(input.avatar);
  const countryCode = normalizeOptionalCountryCode(input.countryCode);

  const [currentPlayer] = await sql<{ id: string }[]>`
    select p.id
    from players p
    inner join player_sessions s on s.player_id = p.id
    where s.token = ${input.token}
    limit 1
  `;

  if (!currentPlayer) {
    throw new Error("Invalid player session");
  }

  const [existing] = await sql<{ id: string }[]>`
    select id
    from players
    where username_key = ${usernameKey}
      and id <> ${currentPlayer.id}
    limit 1
  `;

  if (existing) {
    throw new Error("Username already registered");
  }

  try {
    const [player] = await sql<PlayerRow[]>`
      update players
      set
        name = ${name},
        username = ${name},
        username_key = ${usernameKey},
        avatar_icon = ${avatar.icon},
        avatar_color = ${avatar.color},
        country_code = ${countryCode},
        profile_completed = true,
        updated_at = now()
      where id = ${currentPlayer.id}
      returning
        id,
        email,
        name,
        avatar_icon,
        avatar_color,
        profile_completed,
        solo_high_score,
        provider,
        avatar_url,
        country_code,
        created_at,
        updated_at
    `;

    return toPublicPlayer(player!);
  } catch (error) {
    if (classifyPlayerUniqueViolation(error) !== null) {
      throw new Error("Username already registered");
    }
    throw error;
  }
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
      provider,
      avatar_url,
      country_code,
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
