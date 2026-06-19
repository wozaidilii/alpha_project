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
- DB:
  - `players.username text` stores the display username for password accounts.
  - `players.username_key text` stores the normalized username lookup key and must have a unique index where non-null.
  - `players.password_hash text` stores password hashes for password accounts and remains nullable for code/WeChat-only accounts.
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
- Passwords are never stored in plaintext; store only salted `scrypt` hashes in `players.password_hash`.
- Existing email-code or WeChat users may have `password_hash = null`; password login must reject those rows without changing their account.
- Verification codes are never stored in plaintext; store only an HMAC hash keyed by `EMAIL_VERIFICATION_SECRET`.
- Codes expire after 10 minutes, are consumed on success, and are consumed after too many failed attempts.
- Development may return `debugCode` when no email provider is configured. Production must not return debug codes and must fail if delivery or signing is not configured, even when the requested reset email does not belong to an account.
- Successful email verification creates or reuses a `players.email` record, creates a `player_sessions.token`, and records `email_login_completed`.
- Password reset may use email verification codes, but the UI must present it as a separate "forgot password" flow and not as the default login path. Reset-code requests should send to any existing `players.email` account, including legacy rows without `password_hash`; if the email is unknown, return the same generic success shape without creating a usable code.
- Game clients may record player behavior only with a valid session token. Invalid tokens must return unauthorized errors and must not write activity rows.
- Event payloads must remain shallow JSON primitives to keep analytics queries predictable.

### 4. Validation & Error Matrix

- Invalid email or non-six-digit code -> tRPC validation error.
- Duplicate password registration email with an existing password hash -> `BAD_REQUEST` with "该邮箱已注册，请直接登录".
- Password registration email with an existing email-code-only row -> update that row with password credentials and return `PlayerSession`.
- Duplicate username -> `BAD_REQUEST` with "该用户名已被使用，请换一个".
- Wrong password, unknown identifier, or no password hash for that account -> `UNAUTHORIZED` with "账号或密码不正确".
- No active code for email -> `BAD_REQUEST` with "验证码不正确".
- Expired code -> `BAD_REQUEST` with "验证码已过期，请重新获取".
- Too many failed attempts -> `TOO_MANY_REQUESTS`.
- Missing production `EMAIL_VERIFICATION_SECRET`, `RESEND_API_KEY`, or `EMAIL_FROM` -> `SERVICE_UNAVAILABLE`.
- Resend API failure -> `BAD_GATEWAY`.
- Invalid activity token -> `UNAUTHORIZED`.

### 5. Good/Base/Bad Cases

- Good: a user logs in with either `name@example.com` or `sakura` plus the same password; both resolve to the same account.
- Good: a new user registers with email, unique username, and password; `players.name` is used later in battle mode display and `players.password_hash` contains only a salted hash.
- Good: a legacy email-code-only player registers with the same email, unique username, and password; the existing player row is upgraded instead of creating a duplicate or blocking the user.
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
