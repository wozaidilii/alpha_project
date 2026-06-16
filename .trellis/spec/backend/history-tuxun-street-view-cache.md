## Scenario: History Tuxun Street View Scene Cache

### 1. Scope / Trigger

- Trigger: Historical tuxun questions need a persistent Baidu street-view scene lookup cache to avoid repeated `PanoramaService` quota consumption.
- Applies to `location_tuxun_questions` random puzzle loading, history-tuxun solo mode, history-tuxun battle mode, and tRPC procedures under `locationTuxun`.

### 2. Signatures

- DB: `location_tuxun_street_view_scenes`
  - `location text primary key`
  - `status text` in `available | unavailable`
  - `scene_lat double precision`, `scene_lng double precision`
  - `pano_id text`
  - `last_checked_at timestamptz`, `lookup_failed_at timestamptz`
- Query: `locationTuxun.random({ excludeLocation?: string, difficulty?: 1..5 })`
  - Returns `LocationTuxunPuzzle | null`.
  - May include `streetViewScene: { lat, lng, panoId? }` when the cache has an available scene.
- Mutation: `locationTuxun.saveStreetViewScene({ location, lat, lng, panoId? })`
- Mutation: `locationTuxun.markStreetViewUnavailable({ location })`

### 3. Contracts

- The backend owns persistent scene cache reads and writes.
- The browser owns Baidu JS `PanoramaService` probing because it depends on the loaded Baidu JS SDK.
- History-tuxun clients must check `puzzle.streetViewScene` before calling Baidu panorama probing.
- If the cache table has not been migrated yet, server data access must fall back to the uncached behavior instead of throwing `relation does not exist`.
- Cached unavailable locations are skipped by random puzzle selection for 7 days.

### 4. Validation & Error Matrix

- Missing cache table -> random puzzle loading still works without cache fields.
- Available cached scene -> client must build play state directly, with no Baidu lookup probe.
- Probe succeeds on an uncached location -> client starts the round and asynchronously saves the scene.
- Probe fails on an uncached location -> client marks the location unavailable before requesting another puzzle.
- Cache save/mark mutation fails -> gameplay may continue; the only lost behavior is quota-saving cache persistence.

### 5. Good/Base/Bad Cases

- Good: A cached location opens history tuxun with `sceneLat`, `sceneLng`, and `scenePanoId` from DB and consumes no lookup quota.
- Base: A new location probes at most one center point plus five random candidates, then saves the first Baidu scene.
- Bad: A random loader directly references `location_tuxun_street_view_scenes` without checking table existence, breaking un-migrated dev environments.

### 6. Tests Required

- Unit tests for cached scene extraction from `LocationTuxunPuzzle`.
- Unit tests for panorama candidate generation: center point must be first and candidate count must stay capped.
- Typecheck for tRPC payloads and `LocationTuxunPuzzle.streetViewScene` serialization.
- Build verification to ensure app routes compile with optional Pusher env validation skipped when needed.

### 7. Wrong vs Correct

#### Wrong

```typescript
const scene = await findHistoryTuxunScene(puzzle);
```

This consumes Baidu lookup quota even when the backend already knows a valid `panoId`.

#### Correct

```typescript
const cachedScene = getCachedHistoryTuxunScene(puzzle);
const scene = cachedScene ?? (await findHistoryTuxunScene(puzzle));
```

This treats persisted scenes as the first-class source of truth and only probes Baidu on a cache miss.
