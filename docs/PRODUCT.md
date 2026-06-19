# Product

## Register

- Name: AniGuessr
- Type: anime street-view guessing game
- Primary route: `/game/anime`

## Users

- Anime fans who enjoy location pilgrimage and visual deduction.
- Players who expect the main puzzle to be real street-view observation, with anime artwork used as the clue.
- Multilingual visitors who may start from Chinese, Japanese, or English copy.

## Core Experience

AniGuessr is a single-mode guessing game. Each round shows a real Google Street View scene as the main viewport and an anime clue image in the upper-left panel. The player studies the real-world scene, then places a guess on a global map. The result explains the answer, score, distance, time, and related trivia.

## Product Boundaries

- The active public mode is only anime guessing.
- Anime images are clues, not the main map or street-view surface.
- Guessing is global; the map and question validator must not require coordinates to be in Japan.
- Legacy modes can stay in code for rollback, but normal entry points should route to `/game/anime`.

## Interaction Goals

- Start the game from a localized home page with Chinese, Japanese, and English controls.
- Keep the game screen dense and usable: street view first, clue panel second, guess map available without blocking the scene.
- Present the product visually as an anime mystery game without turning the interface into a marketing landing page.
