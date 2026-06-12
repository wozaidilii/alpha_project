# Mini Program Platform Notes

## Context

This research note captures planning assumptions for porting the existing web quiz game to a WeChat Mini Program MVP. Official documentation pages should be re-checked before implementation because local/web doc fetches were unreliable in this session.

## Current Project Constraints

- The existing web frontend is React/Next.js and cannot be directly reused as native Mini Program UI.
- The existing tRPC React client is browser/React-specific; Mini Program should call HTTP endpoints via `wx.request` or a compatible client wrapper.
- The existing Leaflet map is DOM-based and should not be treated as reusable in native Mini Program pages.
- The existing Pusher real-time battle layer is intentionally out of scope for the MVP.
- The existing scoring functions are plain TypeScript and are good candidates for reuse or duplication into a shared package if the Mini Program build can consume them cleanly.

## Platform Assumptions To Verify

- Network requests must use approved HTTPS request domains configured in the Mini Program admin console.
- WeChat login normally starts from `wx.login`, then the backend exchanges the code for a WeChat identity such as `openid`.
- Native Mini Program map interactions should use the platform `map` component rather than Leaflet.
- Web content can be embedded with `web-view`, but this is not the preferred path for a polished native MVP.
- WebSocket is available through Mini Program APIs, but real-time battle is out of MVP.

## Recommended Technical Direction

1. Build a native Mini Program client for the solo quiz loop.
2. Add a Mini Program API surface in the existing Next.js backend:
   - start game / random questions
   - submit round or score locally
   - update solo high score if login is in MVP
3. Start with trivia-first gameplay to avoid map and panorama risk.
4. Add native map guessing later as a separate task after the base quiz loop is working.
5. Use native WXML/WXSS/TypeScript for the MVP client; keep Taro/uni-app as future alternatives rather than first-release dependencies.

## Client Framework Options

### Option A: Native Mini Program WXML/WXSS/TypeScript

- Uses the platform's native project structure and component model.
- Lowest abstraction risk for Mini Program-specific APIs and simulator behavior.
- Less aligned with the current React codebase; UI/state patterns would be more platform-specific.
- Recommended if the product will remain WeChat-only and the team wants the simplest runtime stack.

### Option B: Taro React

- Taro official docs describe it as a cross-platform solution that supports React and WeChat Mini Program output.
- Better matches the current React/TypeScript mental model than native WXML pages.
- Adds build tooling and framework constraints; not all React/web patterns can be reused directly.
- Recommended if the team expects to reuse app-style components or potentially target other mini app/H5 surfaces later.

### Option C: uni-app

- uni-app official docs position it as a Vue-based cross-platform framework.
- Mature Mini Program/App ecosystem, but it would introduce Vue into a React/Next repository.
- Not recommended for this MVP unless the team specifically prefers Vue/uni-app tooling.

## Risks

- Mini Program auth adds backend account-linking work if high scores or profiles are persisted.
- Native map interaction may require UX and coordinate behavior adjustments compared with Leaflet.
- If the Mini Program is placed in the same repository, build tooling and lint/test commands need clear separation from the Next.js app.
- If placed in a separate repository, shared types/scoring reuse becomes more work.

## URLs To Re-Check Before Implementation

- WeChat Mini Program `wx.login` official docs
- WeChat Mini Program `wx.request` official docs
- WeChat Mini Program `map` component official docs
- WeChat Mini Program `web-view` component official docs
- WeChat Mini Program package/subpackage size and upload rules
- Taro official docs: https://docs.taro.zone/docs/
- uni-app official docs: https://uniapp.dcloud.net.cn/
