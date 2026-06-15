# 历史图寻模式

## Goal

Build a focused historical map-finding demo that starts immediately when the player opens the history tuxun route.

## What I Already Know

- Baidu static panorama images are available through `https://api.map.baidu.com/panorama/v2`.
- The demo should avoid backend/database dependence and use local historical clue data.
- The map picker for this demo must use the Baidu Maps JS API instead of the existing Leaflet picker.

## Requirements

- `/game/history-tuxun` starts a random historical map-finding question immediately.
- Demo entry routes go straight to `/game/history-tuxun`; homepage, login, onboarding, character, profile, mode selection, battle entry, and other game-mode pages are not shown in this demo.
- Show the modern street-view area with Baidu static panorama images.
- If panorama/static street-view service is unavailable, fall back to Baidu's basic static map image, then to a basic JS map preview, so the demo can still run.
- Show the map selection area with the Baidu Maps JS API.
- Reveal one historical clue at the start and then one additional clue every 10 seconds.
- Let the player click the map, submit an answer, see distance/score, and continue to another random question.

## Acceptance Criteria

- [ ] `/game/history-tuxun` starts directly without requiring setup or backend event loading.
- [ ] `/`, `/game`, `/login`, `/onboarding`, `/character`, `/profile`, `/battle`, `/battle/:roomId`, `/game/tuxun`, and `/game/:mode` redirect to `/game/history-tuxun`.
- [ ] The page displays a historical clue section, Baidu static street-view image or basic map fallback section, and Baidu map selection section.
- [ ] A new clue appears every 10 seconds until all clues are visible.
- [ ] The player can click the Baidu map, submit the guess, and see answer, distance, and score.
- [ ] Starting the next question randomly chooses a different local historical puzzle when possible.

## Out Of Scope

- Do not add a backend API or database dependency for the demo.
- Do not add new external dependencies.
- Do not change battle mode internals beyond redirecting its route entry during the demo.
- Do not modify database schema.
- Do not change the normal tuxun mode unless required by shared code.

## Technical Notes

- Relevant frontend files:
  - `src/app/game/history-tuxun/page.tsx`
  - `src/app/game/history-tuxun/_components/BaiduGuessMap.tsx`
  - `src/app/game/history-tuxun/_components/BaiduSceneMap.tsx`
  - `src/app/game/page.tsx`
  - `src/app/game/tuxun/_components/BaiduPanorama.tsx`
  - `src/lib/baidu-panorama.ts`
  - `src/lib/history-tuxun-demo.ts`
- Relevant specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/guides/index.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`

## Definition Of Done

- TypeScript typecheck passes.
- Relevant tests pass or skipped checks are documented.
- UI is checked in browser at a desktop viewport when the dev server can run.
