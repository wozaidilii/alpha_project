# History Game Question Contracts

## Scenario: History Year Guessing Questions

### 1. Scope / Trigger

- Trigger: Solo history year mode needs a tRPC question contract that returns one historical event with a stable answer year and progressively revealable clues.
- Applies to `location_tuxun_questions`, `locationTuxun.randomYear`, `HistoryYearPuzzle`, and `/game/history-year`.

### 2. Signatures

- Query: `locationTuxun.randomYear({ excludePuzzleId?: string, difficulty?: 1..5 })`
  - Returns `HistoryYearPuzzle | null`.
- Type: `HistoryYearPuzzle`
  - `puzzleId: string`
  - `sourceId: string`
  - `title: string`
  - `location: string`
  - `answerName: string`
  - `answerContext: string`
  - `answerYear: number`
  - `answerYearEnd?: number`
  - `yearNote?: string`
  - `clues: string[]`
  - `funfact: string[]`
  - `difficulty?: number`
  - `category: string`

### 3. Contracts

- `randomYear` must select from `location_tuxun_questions` rows where `enabled = true` and `year is not null`.
- `excludePuzzleId` filters by row `id`, not by grouped location, because year mode is event-level rather than city-level.
- `difficulty`, when present, must use the same integer range and exact-match filtering as existing location tuxun queries.
- Clues must not use `year_note` during gameplay because `year_note` may contain the answer year; keep it for the result explanation.
- Result scoring must combine year accuracy with a clue-count multiplier, so the same guessed year scores lower after more clues are revealed.

### 4. Validation & Error Matrix

- No enabled rows with `year is not null` -> return `null`; the client shows a not-ready state.
- `excludePuzzleId` excludes the only matching row -> return `null`; the client may retry without exclusion in a future UX.
- Invalid `difficulty` outside `1..5` -> tRPC input validation rejects the query.
- Row has no usable clue text -> return `null` from row-to-puzzle conversion instead of sending an unplayable puzzle.

### 5. Good/Base/Bad Cases

- Good: A row with `year`, `year_end`, `hint`, `location_note`, and `year_note` returns gameplay clues without revealing `year_note` until result.
- Base: A row with only `year`, `hint`, and `title` still returns at least a first clue plus a late event-name clue.
- Bad: Grouping by `location` for year mode mixes multiple events from the same city and makes the answer year ambiguous.

### 6. Tests Required

- Unit tests for clue-count year scoring: same year accuracy must produce lower totals as `revealedClueCount` increases.
- Typecheck for `HistoryYearPuzzle` tRPC serialization and `/game/history-year` client consumption.
- Build verification must list `/game/history-year` as a compiled route.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Do not reuse the city-grouped location puzzle for year mode.
const puzzle = await getRandomLocationTuxunPuzzle();
```

This may merge clues from several events in the same city and attach them to one answer year.

#### Correct

```typescript
const puzzle = await getRandomHistoryYearPuzzle({ excludePuzzleId });
```

This keeps each year-mode question tied to one historical event row and one answer year or year range.
