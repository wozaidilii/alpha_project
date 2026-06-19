# Battle Room Session Contracts

> Contracts for browser battle-room state, start synchronization, and empty-room cleanup.

---

## Scenario: Battle Room Start State

### 1. Scope / Trigger

- Trigger: adding or changing battle lobby join, room start, Pusher synchronization, shared generated questions, or room cleanup behavior.
- Applies to `/battle`, `/battle/[roomId]`, `/api/battle/rooms/[roomId]`, `src/server/data/battle-room-store.ts`, and battle Pusher events.

### 2. Signatures

- `GET /api/battle/rooms/[roomId] -> { room: BattleRoomSnapshot } | 404`
- `POST /api/battle/rooms/[roomId]` with one of:
  - `{ action: "join", player: BattlePlayer, settings?: BattleSettings }`
  - `{ action: "starting", settings: BattleSettings, players: Record<string, BattlePlayer> }`
  - `{ action: "cancel-start" }`
  - `{ action: "started", settings: BattleSettings, players: Record<string, BattlePlayer>, questionIds?: string[], questions?: BattleQuestion[], roundIndex: number, startTime: number }`
  - `{ action: "leave", playerId: string }`
- Store helpers:
  - `joinBattleRoom(input): BattleRoomSnapshot`
  - `markBattleRoomStarting(input): BattleRoomSnapshot`
  - `cancelBattleRoomStart(input): BattleRoomSnapshot | null`
  - `startBattleRoom(input): BattleRoomSnapshot`
  - `leaveBattleRoom(input): { closed: boolean; snapshot: BattleRoomSnapshot | null }`

### 3. Contracts

- `BattleRoomSnapshot.phase` is `"lobby" | "starting" | "playing" | "closed"`.
- `/battle` is a logged-in-only lobby. It must use the persisted `PlayerSession` to append `userId`, `name`, and avatar params before entering `/battle/[roomId]`.
- `/battle/[roomId]` must reject direct entry without player profile params and redirect through login/lobby instead of creating anonymous battle players.
- Lobby state stores authoritative `settings` and at most 2 `players`.
- `starting` means the host has clicked start and may be generating third-party street-view questions; non-host clients should show a waiting state and keep polling.
- `playing` must include either `questionIds` for DB-backed standard questions or full `questions` for generated street-view modes.
- Generated street-view battle modes, including `anime-tuxun`, must share full generated `BattleQuestion[]` through room state so both players see the same panorama and timed clue state.
- `anime-tuxun` battle questions use Google Street View, reveal anime clues over time, and score by distance to the real-world anime location center.
- Pusher `game-started` is a fast notification, not the only source of truth; clients must be able to recover from `GET /api/battle/rooms/[roomId]`.
- When all players leave, `leaveBattleRoom` deletes the room and returns `closed: true`.

### 4. Validation & Error Matrix

- Unsupported `settings.questionType` -> `400 Invalid battle room payload`.
- Third player joins a full room -> `409 房间已满`.
- Unknown room on `GET` -> `404 Battle room not found`.
- Unknown room on `cancel-start` -> `404 Battle room not found`.
- Invalid action payload -> `400 Invalid battle room payload`.
- Insufficient generated questions -> host must call `cancel-start` and return lobby UI to a retryable error state.

### 5. Good/Base/Bad Cases

- Good: host writes `starting`, generates questions, writes `started`, then emits Pusher; non-host can enter from Pusher or polling snapshot.
- Base: DB-backed question modes store only `questionIds`, and clients fetch full questions by ID.
- Bad: host calls `beginRound` locally before writing shared room state, or relies only on transient Pusher events for non-host entry.

### 6. Tests Required

- Unit tests for room join, full-room rejection, starting/cancel-start, started snapshot persistence, and all-player leave cleanup.
- Type-check and lint for route payload types.
- Build verification after adding a new App Router API route.
- Browser/manual smoke for two-player start when Pusher credentials and third-party map credentials are available.

### 7. Wrong vs Correct

Wrong:

```typescript
applyGameStarted(settings, players, questions);
beginRound(0, Date.now());
await sendPusherEvent(channel, "game-started", payload);
```

Correct:

```typescript
await postBattleRoomAction(roomId, { action: "starting", settings, players });
const loaded = await loadBattleQuestions(settings);
await postBattleRoomAction(roomId, { action: "started", ...payload });
await sendPusherEvent(channel, "game-started", payload).catch(() => undefined);
applyGameStarted(settings, players, loaded.questions);
beginRound(0, payload.startTime);
```
