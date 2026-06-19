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
- `player.recordActivity`
  - Input: `{ token: string, eventType: string, payload?: Record<string, string | number | boolean | null>, route?: string }`
  - Output: `{ ok: true }`
- DB:
  - `player_email_verification_codes(id, email, code_hash, attempts, expires_at, consumed_at, created_at)`
  - `player_activity_events(id, player_id, email, event_type, event_payload, route, user_agent, created_at)`
- Env:
  - `RESEND_API_KEY` and `EMAIL_FROM` enable real email delivery.
  - `EMAIL_VERIFICATION_SECRET` signs code hashes and is required in production.

### 3. Contracts

- Public web login must use the two-step code flow. Do not expose direct email-to-session login.
- Verification codes are never stored in plaintext; store only an HMAC hash keyed by `EMAIL_VERIFICATION_SECRET`.
- Codes expire after 10 minutes, are consumed on success, and are consumed after too many failed attempts.
- Development may return `debugCode` when no email provider is configured. Production must not return debug codes and must fail if delivery or signing is not configured.
- Successful email verification creates or reuses a `players.email` record, creates a `player_sessions.token`, and records `email_login_completed`.
- Game clients may record player behavior only with a valid session token. Invalid tokens must return unauthorized errors and must not write activity rows.
- Event payloads must remain shallow JSON primitives to keep analytics queries predictable.

### 4. Validation & Error Matrix

- Invalid email or non-six-digit code -> tRPC validation error.
- No active code for email -> `BAD_REQUEST` with "验证码不正确".
- Expired code -> `BAD_REQUEST` with "验证码已过期，请重新获取".
- Too many failed attempts -> `TOO_MANY_REQUESTS`.
- Missing production `EMAIL_VERIFICATION_SECRET`, `RESEND_API_KEY`, or `EMAIL_FROM` -> `SERVICE_UNAVAILABLE`.
- Resend API failure -> `BAD_GATEWAY`.
- Invalid activity token -> `UNAUTHORIZED`.

### 5. Good/Base/Bad Cases

- Good: production has Resend credentials and a strong verification secret; a user requests a code, enters it once, receives a session, and later gameplay records are linked by `player_id`.
- Base: development lacks email credentials; the request returns `delivery: "debug"` and `debugCode`, allowing local testing without bypassing the verification-code path.
- Bad: a tRPC procedure that accepts only an email and returns a `PlayerSession`; this bypasses code verification.

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
