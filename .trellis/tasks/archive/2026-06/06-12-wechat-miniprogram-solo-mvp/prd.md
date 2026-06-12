# WeChat Mini Program Solo Quiz MVP

## Goal

Build a WeChat Mini Program MVP for the existing game that focuses on single-player quiz play. The MVP should reuse the current question bank and scoring concepts while avoiding high-risk features such as panorama street-view, real-time battle, and complex character systems.

## What I Already Know

- The current web game is a Next.js / React app with tRPC, PostgreSQL, and Pusher.
- Existing enabled solo modes are:
  - `historical`: history geography questions with map + year guessing.
  - `funfact`: history trivia questions with multiple-choice and true/false formats.
- Current solo web flow uses 5 rounds per game and a 30-second timer.
- Historical and funfact records already support `difficulty` from 1 to 5.
- The backend already exposes tRPC queries for random historical events and random funfact questions.
- The backend already stores player sessions and a `solo_high_score`.
- Current map implementation uses Leaflet and DOM, which is not suitable for a native Mini Program implementation.
- Current panorama modes rely on Baidu JS panorama, which is out of scope for the Mini Program MVP.

## Requirements

- Create a WeChat Mini Program single-player quiz MVP scope.
- Reuse the existing backend question data where practical.
- First MVP includes only `funfact` questions: multiple-choice and true/false history trivia.
- Place the Mini Program code in this repository so backend API, shared types, scoring logic, and task artifacts can evolve together.
- Use native WeChat Mini Program WXML/WXSS/TypeScript for the client rather than Taro, uni-app, or web-view.
- Include one round-based solo game loop with result and final score screens.
- Prioritize native Mini Program UX patterns and touch-first interaction.
- Keep historical map/year guessing, panorama street-view, and real-time battle out of the MVP.

## Recommended MVP Scope

- User entry:
  - WeChat silent login through Mini Program login flow.
  - Backend associates the Mini Program user identity with a player record.
  - No full profile onboarding in MVP unless required for a fallback display name.
- Mode selection:
  - Single history trivia / funfact mode for MVP.
  - No historical geography, year slider, or map mode in the first release.
- Gameplay:
  - 5 questions per game.
  - No difficulty selection in MVP; start immediately with mixed/random trivia.
  - Questions use four-option multiple-choice or true/false answer controls.
  - Per-round answer submission.
  - Per-round result with explanation / funfact when available.
  - Final score summary and restart.
  - Final score page includes a share action such as "I scored X, come challenge me."
- Backend:
  - Add Mini Program-friendly HTTP endpoints or a thin BFF layer rather than exposing the web tRPC client directly.
  - Reuse existing stores and scoring rules where possible.
  - Persist and update the player's solo high score on the backend.
- UI:
  - Mobile-first, touch-first Mini Program screens.
  - Minimum 44px tappable targets.
  - No hover-only interactions.
  - Keep primary actions fixed and obvious.

## Acceptance Criteria

- [ ] The task has a confirmed MVP scope and out-of-scope list.
- [ ] The Mini Program app can start a solo quiz game.
- [ ] The app can load `funfact_questions` records from the existing backend data source through Mini Program-compatible APIs.
- [ ] The player can answer multiple-choice and true/false questions.
- [ ] The player can see whether each answer was correct and read the explanation / funfact when available.
- [ ] The app shows a final score after the last round.
- [ ] The app supports replaying a new game.
- [ ] The final score page supports sharing a result-based challenge.
- [ ] The backend can associate scores with a Mini Program user identity.
- [ ] The app can update and display the player's solo high score.
- [ ] Login failure, question load failure, score update failure, and insufficient question data show clear retry or fallback states.
- [ ] The MVP does not include historical map/year guessing, panorama, real-time battle, or character progression.

## Open Questions

- None. Requirements are ready for final confirmation.

## Out Of Scope

- Baidu panorama / street-view gameplay.
- Historical tuxun mode.
- Historical geography questions.
- Historical year guessing.
- Native Mini Program map guessing.
- Real-time battle / Pusher.
- Character selection and character sync.
- Full leaderboard and social ranking, unless later promoted into MVP.
- Native mobile app builds.
- Guest-only local scoring as the primary MVP mode.
- Full profile onboarding with nickname/avatar editing.
- Home-page sharing as a separate MVP requirement.

## Decisions

### MVP Question Type

**Decision**: The first Mini Program MVP includes only `funfact` history trivia questions.

**Consequences**:
- The first release can focus on WeChat entry, question loading, answer submission, result display, final scoring, and sharing.
- The app avoids native map, year-slider, and panorama migration risk.
- Historical geography and year-guessing can be added later as separate vertical slices after the Mini Program foundation is proven.

### Login And Score Persistence

**Decision**: The first Mini Program MVP uses WeChat silent login and persists the player's solo high score on the backend.

**Consequences**:
- The MVP can support return visits and cross-session score continuity.
- Backend work must include a Mini Program authentication endpoint and a way to associate WeChat identity with existing `players`.
- Full nickname/avatar onboarding and leaderboard remain out of scope for the first release.

### Repository Placement

**Decision**: The Mini Program code should live in this repository, likely under a dedicated directory such as `apps/miniprogram` or `miniprogram`.

**Consequences**:
- The Mini Program can share nearby task artifacts, backend API work, types, and scoring logic with the existing web app.
- The repository becomes a mixed Web + Mini Program workspace, so scripts and validation commands need clear boundaries.
- A separate repository remains an option later if the Mini Program grows into an independently released product.

### Mini Program Client Stack

**Decision**: The MVP uses native WeChat Mini Program WXML/WXSS/TypeScript.

**Consequences**:
- The client stays close to WeChat platform APIs and developer-tool behavior.
- The MVP avoids adding Taro/uni-app build complexity for a small quiz flow.
- Existing React components are not directly reused; shared logic should be limited to portable TypeScript types/helpers or duplicated deliberately where native Mini Program constraints make sharing awkward.
- Taro remains a future option if the product later needs multi-end reuse.

### Difficulty Selection

**Decision**: The MVP does not expose difficulty selection; it starts a mixed/random trivia game directly.

**Consequences**:
- The start flow stays one-tap and lightweight.
- The backend can ignore difficulty for MVP random question selection.
- Existing `difficulty` data remains available for a later version.

### Sharing

**Decision**: The MVP supports sharing from the final score page only.

**Consequences**:
- The first release gets the core Mini Program distribution hook without adding extra share entry points.
- Share copy can focus on the player's final score and invite others to challenge it.
- Home-page sharing and dynamic share images remain future enhancements.

### Failure Handling

**Decision**: MVP includes basic retry/fallback states for login failure, question load failure, score update failure, and insufficient question data.

**Consequences**:
- The app avoids dead-end loading screens during common Mini Program network failures.
- Score update failures should not prevent the user from viewing the final score.
- Detailed offline mode is out of scope.

## Technical Notes

- Relevant existing files:
  - `src/app/game/[mode]/page.tsx`
  - `src/lib/game-mode.ts`
  - `src/types/question.ts`
  - `src/lib/scoring.ts`
  - `src/server/api/routers/event.ts`
  - `src/server/api/routers/funfact.ts`
  - `src/server/api/routers/player.ts`
  - `src/server/data/event-store.ts`
  - `src/server/data/funfact-store.ts`
  - `src/server/data/player-store.ts`
  - `db/schema.sql`
- Relevant specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/guides/index.md`
- Research notes:
  - `research/miniprogram-platform-notes.md`
- External references checked during planning:
  - Taro official docs: https://docs.taro.zone/docs/
  - uni-app official docs: https://uniapp.dcloud.net.cn/

## Grill-With-Docs Status

`grill-with-docs` has been loaded and is being used for one-question-at-a-time product and domain clarification. No glossary or ADR has been written yet because no durable terminology or irreversible architecture decision has been settled.

## UI/UX Notes

- `ui-ux-pro-max` was loaded for mobile UX planning.
- The local search script for `ui-ux-pro-max` was unavailable in this installation, so its mobile app rules are applied manually.
- MVP UI should avoid emoji as structural icons, hover states, small tap targets, nested gestures, and hidden primary actions.

## Definition Of Done

- PRD is confirmed by the user.
- Implementation scope is small enough for one independently verifiable task or split into child tasks.
- Required specs/research are registered in `implement.jsonl` and `check.jsonl` before implementation starts.
- Typecheck, lint, and focused tests pass after implementation.
- Browser or Mini Program simulator verification is documented.
