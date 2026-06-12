# Mini Program API

## Scenario: WeChat Mini Program Solo Trivia MVP

### 1. Scope / Trigger

- Trigger: Native WeChat Mini Program clients use dedicated Next.js route handlers instead of tRPC.
- Applies when adding or changing `/api/miniprogram/**` routes, WeChat login, score persistence, or Mini Program runtime env.

### 2. Signatures

- `POST /api/miniprogram/auth/login`
  - Body: `{ code: string }`
  - Response: `PlayerSession`
- `POST /api/miniprogram/funfact/start`
  - Body: `{ token: string }`
  - Response: `{ questions: FunfactQuestionRecord[], warning?: "INSUFFICIENT_QUESTIONS" }`
- `POST /api/miniprogram/player/high-score`
  - Body: `{ token: string, score: number }`
  - Response: `{ soloHighScore: number, user: PlayerProfile }`
- DB: `players.wechat_openid text` with unique index `players_wechat_openid_idx`.

### 3. Contracts

- `WECHAT_MINIPROGRAM_APP_ID` and `WECHAT_MINIPROGRAM_APP_SECRET` are optional env keys at build time, but login returns a 503 when either is missing at runtime.
- Login exchanges `wx.login` code through `https://api.weixin.qq.com/sns/jscode2session`.
- The client stores the returned `token` and sends it in Mini Program API request bodies.
- Funfact start requires a valid session token and returns existing funfact question shape, including `correctIndex`, matching current web solo-game behavior.
- High score writes through `updateSoloHighScore`, which only increases `solo_high_score`.

### 4. Validation & Error Matrix

- Missing or empty body field -> `400 { error: { code: "INVALID_BODY" } }`
- Invalid player token -> `401 { error: { code: "INVALID_SESSION" } }`
- Missing WeChat credentials -> `503 { error: { code: "SERVER_ERROR" } }`
- WeChat network or response failure -> `502 { error: { code: "SERVER_ERROR" } }`
- Fewer than 5 questions -> `200` with `warning: "INSUFFICIENT_QUESTIONS"` so the client can still decide whether to continue.

### 5. Good/Base/Bad Cases

- Good: Existing WeChat openid logs in again and receives a fresh session without resetting `soloHighScore`.
- Base: New WeChat openid creates a profile named `微信玩家`, with default avatar and `profileCompleted = true`.
- Bad: Client starts a round with an expired or unknown token; API must return `401` and must not leak questions.

### 6. Tests Required

- Type check route handlers and Mini Program request payloads.
- Unit or integration tests should cover:
  - `loginPlayerByWechatOpenId` preserves high score across repeated logins.
  - `funfact/start` rejects invalid tokens before loading questions.
  - `high-score` never lowers an existing high score.
- Build must list all `/api/miniprogram/**` routes as dynamic server routes.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Do not let the Mini Program call tRPC endpoints directly.
wx.request({ url: `${API_BASE_URL}/api/trpc/funfact.random` });
```

#### Correct

```typescript
// Use a stable Mini Program BFF route with a small JSON contract.
wx.request({
  url: `${API_BASE_URL}/api/miniprogram/funfact/start`,
  method: "POST",
  data: { token },
});
```
