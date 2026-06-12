# 历史图寻模式

## Goal

Add a new historical street-view guessing mode and update the existing street-view guessing map interaction so the guessing map behaves like a compact bottom-right mini-map that expands when the pointer approaches or it receives focus.

## What I Already Know

- The existing `/game/tuxun` page loads random Baidu panorama-capable locations with `generateRandomTuxunLocations`.
- The current tuxun layout shows the panorama in the main area and the guess map in a fixed right sidebar.
- Historical questions already come from `api.event.random`, and historical event records include title, description, year, location, lat, and lng.
- Baidu Panorama rendering is encapsulated in `src/app/game/tuxun/_components/BaiduPanorama.tsx`.
- The map picker is currently `GameMap`, shared by normal historical play and tuxun play.

## Requirements

- Add a new "历史图寻模式" entry from the mode selection screen.
- In historical tuxun rounds, show historical clues on the far left.
- Show the corresponding modern location street view in the center by using the Baidu panorama API.
- Keep the player guessing the location on the China map.
- Change the existing tuxun guess selection UI to a bottom-right compact map that expands on pointer hover/nearby interaction and keyboard focus.
- Use the same bottom-right compact/expanded guess map pattern in historical tuxun mode.

## Acceptance Criteria

- [ ] `/game` exposes a navigable "历史图寻模式" entry.
- [ ] `/game/history-tuxun` loads historical events and renders a playable round flow.
- [ ] The left panel in historical tuxun contains the event clue, year context, and location-related prompt without occupying the center street-view area.
- [ ] The center area uses the Baidu panorama component for the event's modern location.
- [ ] Normal tuxun no longer reserves a permanent right sidebar for the guess map while playing.
- [ ] The guess map is fixed in the bottom-right, compact by default, expands on hover/focus, and preserves touch/click usability.
- [ ] Existing final/result scoring for tuxun-style location guesses remains usable.

## Out Of Scope

- Do not add a new backend API unless the existing historical event random endpoint is insufficient.
- Do not add new external dependencies.
- Do not change battle mode.
- Do not modify database schema.

## Technical Notes

- Relevant frontend files:
  - `src/app/game/page.tsx`
  - `src/app/game/tuxun/page.tsx`
  - `src/app/game/tuxun/_components/BaiduPanorama.tsx`
  - `src/app/game/_components/GameMap.tsx`
  - `src/lib/baidu-panorama.ts`
  - `src/types/event.ts`
- Relevant specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/guides/index.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`

## Definition Of Done

- TypeScript typecheck passes.
- Relevant tests pass or skipped checks are documented.
- UI is checked in browser at a desktop viewport.
