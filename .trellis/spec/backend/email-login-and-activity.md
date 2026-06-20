# Email Login And Player Activity

## Scenario: Email Code Login And Player Activity Events

### 1. Scope / Trigger

- Trigger: adding or changing web email login, verification-code delivery, session creation, or per-player behavior tracking.
- Applies to `player` tRPC procedures, `players`, `player_sessions`, `player_email_verification_codes`, `player_activity_events`, and login/gameplay UI that records behavior.

### 2. Signatures

- `player.requestEmailLoginCode`
  - Input: `{ email: string }`
  - Output: `{ expiresInSeconds: number, delivery: "email" | "debug", debugCode?: string }`
- `player.verifyEmailLoginCode`
  - Input: `{ email: string, code: string }` where `code` is exactly six digits.
  - Output: `PlayerSession`
- `player.registerWithPassword`
  - Input: `{ email: string, username: string, password: string }` where `username` is 1-12 chars and `password` is 8-128 chars.
  - Output: `PlayerSession`
- `player.loginWithPassword`
  - Input: `{ identifier: string, password: string }` where `identifier` is either email or username.
  - Output: `PlayerSession`
- `player.requestPasswordResetCode`
  - Input: `{ email: string }`
  - Output: `{ expiresInSeconds: number, delivery: "email" | "debug", debugCode?: string }`
- `player.resetPasswordWithCode`
  - Input: `{ email: string, code: string, password: string }`
  - Output: `PlayerSession`
- `player.recordActivity`
  - Input: `{ token: string, eventType: string, payload?: Record<string, string | number | boolean | null>, route?: string }`
  - Output: `{ ok: true }`
- `player.updateProfile`
  - Input: `{ token: string, name: string, avatar: PlayerAvatar, countryCode?: string | null }`
  - Output: `PlayerProfile`
- `player.leaderboard`
  - Input: optional `{ token?: string, limit?: number }`
  - Output: `{ entries: LeaderboardEntry[], currentUserEntry?: LeaderboardEntry }`
- DB:
  - `players.username text` stores the display username for password accounts.
  - `players.username_key text` stores the normalized username lookup key and must have a unique index where non-null.
  - `players.password_hash text` stores password hashes for password accounts and remains nullable for code/WeChat-only accounts.
  - `players.country_code text` stores the user-editable ISO 3166-1 alpha-2 country/region code used for profile and leaderboard display.
  - `player_email_verification_codes(id, email, code_hash, attempts, expires_at, consumed_at, created_at)`
  - `player_activity_events(id, player_id, email, event_type, event_payload, route, user_agent, created_at)`
- Env:
  - `RESEND_API_KEY` and `EMAIL_FROM` enable real email delivery.
  - `EMAIL_VERIFICATION_SECRET` signs code hashes and is required in production.

### 3. Contracts

- Public web email-code login must use the two-step code flow. Do not expose direct email-to-session login.
- Password login is the default web login path and accepts either email or username plus password; do not require email-code delivery for normal login.
- Password registration uses email as the account identity and stores the unique display username in `players.username`, normalized lookup key in `players.username_key`, and canonical battle display name in `players.name`.
- Password registration may claim an existing email-code-only account when that row has `password_hash = null`: set `username`, `username_key`, `name`, and `password_hash` on the existing player instead of returning a duplicate-email error.
- `players.username_key` is case-insensitive unique for non-null values. Existing non-password or legacy players may have null username fields.
- Profile updates must apply the same username uniqueness rule to all authenticated users, including Google/email-code users that initially have null `username_key`.
- Registration and Google/email-code login may infer an initial `players.country_code` from trusted edge headers such as `x-vercel-ip-country` or `cf-ipcountry`, but external identity providers should not be treated as a reliable source of country/region.
- Users must be able to override `players.country_code` from profile settings; leaderboard flag display must use the stored profile value, not the gameplay country field.
- Passwords are never stored in plaintext; store only salted `scrypt` hashes in `players.password_hash`.
- Existing email-code or WeChat users may have `password_hash = null`; password login must reject those rows without changing their account.
- Verification codes are never stored in plaintext; store only an HMAC hash keyed by `EMAIL_VERIFICATION_SECRET`.
- Codes expire after 10 minutes, are consumed on success, and are consumed after too many failed attempts.
- Development may return `debugCode` when no email provider is configured. Production must not return debug codes and must fail if delivery or signing is not configured, even when the requested reset email does not belong to an account.
- Verification-code emails default to English copy unless a caller explicitly adds a locale contract. Password reset subjects should read like `Your AniGuessr password reset code`; do not send Chinese reset email by default.
- Successful email verification creates or reuses a `players.email` record, creates a `player_sessions.token`, and records `email_login_completed`.
- Password reset may use email verification codes, but the UI must present it as a separate "forgot password" flow and not as the default login path. Reset-code requests should send to any existing `players.email` account, including legacy rows without `password_hash`; if the email is unknown, return the same generic success shape without creating a usable code.
- Game clients may record player behavior only with a valid session token. Invalid tokens must return unauthorized errors and must not write activity rows.
- Event payloads must remain shallow JSON primitives to keep analytics queries predictable.
- Anime leaderboard entries are derived from each authenticated user's best `game_sessions` row where `mode = 'anime'`, `rounds` matches the selected tab, and `difficulty_tier` exactly matches the selected difficulty tab. Sort by score descending and played time ascending as the tie-breaker. Guest sessions may be stored for analytics but must not appear as named leaderboard entries.

### 4. Validation & Error Matrix

- Invalid email or non-six-digit code -> tRPC validation error.
- Duplicate password registration email with an existing password hash -> `BAD_REQUEST` with "This email is already registered. Log in instead."
- Password registration email with an existing email-code-only row -> update that row with password credentials and return `PlayerSession`.
- Duplicate username -> `BAD_REQUEST` with "This username is already taken. Try another one."
- Wrong password, unknown identifier, or no password hash for that account -> `UNAUTHORIZED` with "Incorrect account or password."
- No active code for email -> `BAD_REQUEST` with "The code is incorrect."
- Expired code -> `BAD_REQUEST` with "The code has expired. Request a new one."
- Too many failed attempts -> `TOO_MANY_REQUESTS`.
- Missing production `EMAIL_VERIFICATION_SECRET`, `RESEND_API_KEY`, or `EMAIL_FROM` -> `SERVICE_UNAVAILABLE`.
- Resend API failure -> `BAD_GATEWAY`.
- Invalid activity token -> `UNAUTHORIZED`.
- Duplicate profile username -> `BAD_REQUEST` with "This username is already taken. Try another one."
- Invalid leaderboard token -> `UNAUTHORIZED`; missing token should still return the public leaderboard.

### 5. Good/Base/Bad Cases

- Good: a user logs in with either `name@example.com` or `sakura` plus the same password; both resolve to the same account.
- Good: a new user registers with email, unique username, and password; `players.name` is used later in battle mode display and `players.password_hash` contains only a salted hash.
- Good: a legacy email-code-only player registers with the same email, unique username, and password; the existing player row is upgraded instead of creating a duplicate or blocking the user.
- Good: a Google login creates a player with `provider = 'google'`, optional `avatar_url`, inferred `country_code` when a trusted edge header is present, and later lets the user change username and country from profile.
- Good: a logged-in player completes a beginner anime game; only the beginner leaderboard shows that score, with their stored display name and country flag from `players.country_code`.
- Good: production has Resend credentials and a strong verification secret; a user requests a password reset code, enters it once, receives a session, and later gameplay records are linked by `player_id`.
- Base: development lacks email credentials; the request returns `delivery: "debug"` and `debugCode`, allowing local testing without bypassing the verification-code path.
- Bad: a tRPC procedure that accepts only an email and returns a `PlayerSession`; this bypasses code verification.
- Bad: storing a plaintext or reversibly encrypted password in `players`.
- Bad: showing email-code login as the primary login path in production without a configured mail provider.

### 6. Tests Required

- Unit tests for client/server shared code helpers:
  - Pasted code normalization keeps six digits.
  - Code validation rejects non-six-digit values.
  - Email display-name derivation is deterministic.
- Project checks:
  - `npm run check`
  - `npm test`
  - `npm run build`
- Database migration must be applied before browser-testing the full request/verify flow against a real database.

### 7. Wrong vs Correct

Wrong:

```typescript
// One-step login lets anyone create a session for an email address.
const session = await loginPlayerByEmail(email);
```

Correct:

```typescript
await requestEmailLoginCode(email);
const session = await verifyEmailLoginCode(email, code);
```

Wrong:

```typescript
await sql`insert into players (email, password_hash) values (${email}, ${password})`;
```

Correct:

```typescript
const passwordHash = await hashPassword(password);
await sql`
  insert into players (email, username, username_key, name, password_hash)
  values (${email}, ${username}, ${usernameKey}, ${username}, ${passwordHash})
`;
```

Wrong:

```typescript
// Avoid nested or unbounded analytics payloads.
recordActivity({ payload: { result: { score, rounds } } });
```

Correct:

```typescript
recordActivity({
  eventType: "anime_round_submitted",
  payload: { score, round, distanceKm },
});
```

## Scenario: Guest Retention, Google Login, And Game Sessions

### 1. Scope / Trigger

- Trigger: changing the default play flow, guest quota, Google OAuth login, PostHog analytics, or durable per-game score storage.
- Applies to `/game/anime`, `/login`, `/api/auth/google/*`, `players`, `player_sessions`, `game_sessions`, `player_activity_events`, and client-side LocalStorage guest progress.

### 2. Signatures

- `GET /api/auth/google/start?next=/path`
  - Redirects to Google OAuth with `scope=openid email profile`.
  - Uses HTTP-only `aniguessr_google_oauth_state` and `aniguessr_google_oauth_next` cookies.
- `GET /api/auth/google/callback`
  - Validates OAuth `state`, exchanges `code`, fetches Google profile, calls `loginPlayerWithGoogle`, writes the resulting `PlayerSession` into browser LocalStorage via a no-store bridge page, then redirects to the sanitized `next` path.
- `player.recordGameSession`
  - Input: `{ token?: string, guestId?: string, score: number, country: string, mode: string, rounds: number }`
  - Output: `{ ok: true }`
- DB:
  - `players.google_sub text` unique where non-null.
  - `players.provider text` stores `email`, `password`, `google`, or `wechat` when known.
  - `players.avatar_url text` stores profile image URLs from external identity providers.
  - `game_sessions(id, user_id, guest_id, score, country, mode, rounds, played_at)`.
- Client env:
  - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is the preferred PostHog project token env key, matching the official Next.js docs.
  - `NEXT_PUBLIC_POSTHOG_KEY` remains a legacy-compatible alias for existing deployments.
  - `NEXT_PUBLIC_POSTHOG_TOKEN` is accepted as a compatibility alias when a host labels the public write-only token generically.
  - `NEXT_PUBLIC_POSTHOG_HOST` optionally overrides the capture host.
- Server env:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optional `GOOGLE_REDIRECT_URI` enable Google login.

### 3. Contracts

- The homepage primary CTA must go directly to `/game/anime`; it must not force `/login` before first play.
- The homepage login/profile entry must not attach `next=/game/anime`. A plain `/login` visit, including Google login started from that page, should default to `/` after success; only game retention prompts and battle entry should pass an explicit `next`.
- Guest mode stores quota, best score, and recent history in LocalStorage under `aniguessr_guest_progress`.
- Unauthenticated guests may start at most 3 games per local calendar day. A new local day resets only `startedToday`, not best score or history.
- Guest completion should save the score locally and may write an anonymous `game_sessions.guest_id` row for aggregate analytics.
- Logged-in completion must write `game_sessions.user_id` and may also record `player_activity_events`.
- Retention prompts should appear only at retention points: new local record, leaderboard intent, history-save intent, or daily guest quota exhausted.
- PostHog capture is optional and must be no-op when none of the supported public token env keys are present; analytics failures must never block gameplay.
- PostHog browser setup must initialize the official JS snippet once from the root layout when a supported public token env key is present. Keep `person_profiles = 'identified_only'`, disable automatic pageview/autocapture, and track only the project-owned events from `POSTHOG_EVENTS`.
- Client events must go through `capturePostHogEvent`; do not call `window.posthog.capture` directly from pages or components. The helper must prefer the browser SDK and keep a direct early-load fallback to PostHog's ingestion endpoint `${NEXT_PUBLIC_POSTHOG_HOST}/i/v0/e/`.
- After a user session is created or restored, call `identifyPostHogUser` so PostHog links future events to `players.id`. On logout, call `resetPostHogUser` and restore guest registration.
- Do not include passwords, verification codes, room invite codes, raw OAuth tokens, or nested objects in PostHog event properties. Email/name/provider/country may be sent only as PostHog identify person properties, not as arbitrary event payloads.
- Google OAuth must sanitize `next` paths, reject external redirects, and fall back to `/` when no valid `next` is present.

### 4. Validation & Error Matrix

- Missing `GOOGLE_CLIENT_ID` on `/api/auth/google/start` -> `503` JSON error.
- Missing `GOOGLE_CLIENT_SECRET` during callback -> redirect back to `/login?...&error=google`.
- OAuth state missing or mismatched -> redirect back to `/login?...&error=google`.
- `player.recordGameSession` without either `token` or `guestId` -> error.
- Invalid session token passed to `recordGameSession` -> `UNAUTHORIZED` through the existing session error mapper.
- Guest quota exhausted -> render quota/auth prompt, not a crash or silent redirect.

### 5. Good/Base/Bad Cases

- Good: first-time visitor clicks homepage start, enters `/game/anime`, plays as guest, completes a game, shares score, and is prompted to log in only if they want persistence or rankings.
- Good: Google login links a matching email account instead of creating a duplicate user row.
- Base: PostHog env is absent; gameplay and tests still pass with capture calls acting as no-op.
- Bad: redirecting all unauthenticated users to `/login` before they can try the game.
- Bad: storing OAuth state in readable client storage or accepting arbitrary external `next` URLs.

### 6. Tests Required

- Unit tests for guest daily reset, remaining quota, and new-record local history behavior.
- Unit tests for Google OAuth URL/state helper behavior and `next` path sanitization.
- Unit tests for PostHog public token env aliases and the direct ingestion fallback URL.
- Project checks:
  - `npm run check`
  - `npm test`
  - `npm run build`
- Database migration must be applied before relying on Google login or `game_sessions` in production.

### 7. Wrong vs Correct

Wrong:

```typescript
const PLAY_URL = "/login?next=/game/anime";
```

Correct:

```typescript
const PLAY_URL = "/game/anime";
```

Wrong:

```typescript
const loginUrl = `/login?next=${encodeURIComponent("/game/anime")}`;
```

Correct:

```typescript
const loginUrl = "/login";
```

Wrong:

```typescript
location.href = new URLSearchParams(location.search).get("next")!;
```

Correct:

```typescript
const next = sanitizeNextPath(request.cookies.get("next")?.value);
```
