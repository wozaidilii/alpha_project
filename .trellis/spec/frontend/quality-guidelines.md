# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

### Scenario: Passive Root Telemetry Integrations

#### 1. Scope / Trigger

- Trigger: adding or changing passive browser telemetry providers rendered at the app root, such as Vercel Web Analytics, Vercel Speed Insights, or PostHog capture bootstrapping.
- Applies to `src/app/layout.tsx`, telemetry provider components under `src/components/`, `package.json`, and package lockfiles.

#### 2. Signatures

- Vercel Web Analytics:

```tsx
import { Analytics } from "@vercel/analytics/next";

<Analytics />;
```

- Vercel Speed Insights:

```tsx
import { SpeedInsights } from "@vercel/speed-insights/next";

<SpeedInsights />;
```

- PostHog remains project-owned and uses `PostHogScript` plus `PostHogRouteTracker`.

#### 3. Contracts

- Passive telemetry components belong in the root layout body so they are mounted once for the whole app.
- Adding one telemetry provider must not remove or replace existing providers unless the task explicitly asks for a provider migration.
- Public analytics tokens must remain public-only. Secret analytics API keys do not belong in client components or `NEXT_PUBLIC_*` variables.
- Dependency additions must use the existing package manager and update the lockfile.

#### 4. Validation & Error Matrix

- Missing provider package -> TypeScript import failure during `npm run check`.
- Provider component rendered outside the root layout -> duplicate page/app events are likely.
- Replacing existing telemetry unintentionally -> loss of funnel data for that provider.
- Secret server-side API key exposed in browser bundle -> security bug; move it to server-only env handling.

#### 5. Good/Base/Bad Cases

- Good: add the provider package, import its root component in `src/app/layout.tsx`, preserve existing PostHog components, then run check/test/build.
- Base: install one passive provider and verify the app layout still compiles.
- Bad: merge an old provider PR branch directly when it reverts unrelated recent app changes, or remove existing tracking while adding a second provider.

#### 6. Tests Required

- `npm run check` after any telemetry import or dependency change.
- `npm test` to catch unrelated package-lock or dependency resolution regressions.
- `npm run build` to verify the root layout compiles in production mode.
- Browser smoke is optional for passive providers, but useful when changing custom telemetry components such as PostHog.

#### 7. Wrong vs Correct

Wrong:

```tsx
<body>
  <TRPCReactProvider>{children}</TRPCReactProvider>
  {/* Removed existing PostHog while adding Vercel Analytics. */}
  <Analytics />
</body>
```

Correct:

```tsx
<body>
  <PostHogScript />
  <TRPCReactProvider>
    <PostHogRouteTracker />
    {children}
  </TRPCReactProvider>
  <Analytics />
  <SpeedInsights />
</body>
```

### Scenario: Site Icon / Favicon Updates

#### 1. Scope / Trigger

- Trigger: adding or changing the browser tab icon, app icon, touch icon, or social/site favicon assets.
- Applies to `src/app/layout.tsx`, `public/favicon.ico`, `public/icon-*.png`, `public/apple-touch-icon.png`, and any future Next App Router icon metadata files.

#### 2. Signatures

- Root metadata should declare explicit modern PNG icons and a legacy fallback:

```tsx
export const metadata: Metadata = {
  icons: [
    {
      rel: "icon",
      url: "/icon-192.png?v=<asset-version>",
      type: "image/png",
      sizes: "192x192",
    },
    {
      rel: "icon",
      url: "/icon-512.png?v=<asset-version>",
      type: "image/png",
      sizes: "512x512",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png?v=<asset-version>",
      type: "image/png",
      sizes: "180x180",
    },
    { rel: "shortcut icon", url: "/favicon.ico?v=<asset-version>" },
  ],
};
```

- Legacy `/favicon.ico` should contain multiple sizes such as 16, 32, and 48 px.

#### 3. Contracts

- Do not rely only on `/favicon.ico`; browsers cache it aggressively and some platforms prefer PNG or touch icon metadata.
- Use a versioned query string when replacing an existing icon asset so deployed HTML points browsers at a fresh URL.
- Generate square icons from the chosen source image and verify the small-size crop is still recognizable.
- Keep icon files in `public/` unless using Next's special `app/icon.*` files intentionally.

#### 4. Validation & Error Matrix

- Live HTML lacks the new icon link -> browser may keep showing the old icon.
- `/favicon.ico` changes but URL is unchanged -> some browsers may keep a stale cached icon.
- Only a wide source image is resized without square cropping -> icon becomes illegible at 16-32 px.
- Missing PNG/touch icon -> mobile home-screen and some browsers may ignore the intended image.

#### 5. Good/Base/Bad Cases

- Good: square-crop source art, generate 192/512 PNG, apple-touch PNG, multi-size ICO, update metadata with versioned URLs, then verify live HTML and icon file hashes after deployment.
- Base: update `public/favicon.ico` and metadata with a cache-busting query.
- Bad: replace only `public/favicon.ico` and assume every deployed domain and browser cache will refresh immediately.

#### 6. Tests Required

- `npm run check` for metadata typing.
- `npm run build` for production HTML metadata generation.
- Focused smoke: fetch the deployed page HTML and confirm it includes the new icon URL; fetch the icon URL and compare hash/format when diagnosing production icon reports.

#### 7. Wrong vs Correct

Wrong:

```tsx
export const metadata: Metadata = {
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
```

Correct:

```tsx
export const metadata: Metadata = {
  icons: [
    {
      rel: "icon",
      url: "/icon-192.png?v=20260619",
      type: "image/png",
      sizes: "192x192",
    },
    { rel: "shortcut icon", url: "/favicon.ico?v=20260619" },
  ],
};
```

### Scenario: Third-Party Browser Map / Street View Integrations

#### 1. Scope / Trigger

- Trigger: adding or changing a browser-only map SDK, street-view SDK, public map API key, map bounds, or random street-view point generation.
- Applies to Google Maps, Baidu Maps, Tencent Maps, Leaflet-backed maps, and future country/provider additions.

#### 2. Signatures

- Client env keys must be optional in `src/env.js` unless the whole app cannot build without that provider.
- SDK loaders should expose a `load<Provider>Script(key?: string): Promise<void>` function and a typed `get<Provider>Api()` accessor.
- Country or region bounds should live in a shared config module, not inside page components.

#### 3. Contracts

- Missing public API key -> visible user-facing setup/error state, not a thrown render error.
- Script load success does not imply service availability; construct service clients and issue SDK calls inside `try/catch` or null-returning boundaries.
- Street-view gameplay must only start after point generation confirms enough usable panoramas for the configured round count.
- Guess-map click handlers must clamp or reject points outside the active country/region bounds.
- Global street-view modes are an explicit exception to country clamping: pass a prop such as `restrictToCountry={false}`, initialize the map at a world zoom, and validate only global latitude/longitude ranges.
- Gameplay/result phase transitions should preserve expensive third-party map instances when the same map surface is reused. Update markers, lines, disabled state, and layout classes through props instead of unmounting a guess map and mounting a separate result map.
- If a mode is street-view-first but has extra image/text clues, keep the panorama as the primary viewport and render clues as an overlay panel instead of replacing the panorama.
- Result-page continuation links for Google Street View should use Google Maps URLs with `api=1`, `map_action=pano`, and answer coordinates as the `viewpoint`. Keep crawl/source URLs internal for traceability; do not expose third-party source links such as Anitabi as user-facing CTAs.

#### 4. Validation & Error Matrix

- Missing key -> show configuration message and allow returning to mode selection.
- Script load timeout/failure -> show retryable load/generation error.
- Street-view service unavailable -> fail generation with retry, not a non-street-view fallback.
- Insufficient confirmed panoramas -> do not start the round; show how many were found when useful.
- Component unmount during SDK loading -> ignore late results and clean listeners/overlays.
- Google Maps continuation URL -> opens a Street View panorama via `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=<lat>,<lng>`.

#### 5. Good/Base/Bad Cases

- Good: shared country config + SDK loader + confirmed panorama generation + map bounds restriction + a persistent map component whose overlays change between guessing and result states + focused config tests.
- Base: single-country implementation that still uses a country catalog so new countries append data instead of branching UI logic.
- Bad: hard-coded coordinates in page components, required public map keys that break unrelated builds, fallback images/maps inside a street-view mode, or separate guess/result map components that remount the provider SDK during every round.

#### 6. Tests Required

- Unit tests for country bounds, clamping, and country lookup.
- Unit tests for Google Maps continuation URL helpers when adding or changing external Street View links.
- Type-check/lint after adding SDK wrapper types.
- Browser smoke for mode entry and provider error/loading/ready states when credentials are available.

#### 7. Wrong vs Correct

Wrong:

```typescript
// Page component hard-codes provider config and starts gameplay before service validation.
const center = { lat: 35.6762, lng: 139.6503 };
new google.maps.Map(container, { center, zoom: 5 });
setLocations(randomPoints);
```

Correct:

```typescript
const country = getForeignCountry("japan");
const result = await generateRandomForeignLocations(rounds, country);
if (result.locations.length < rounds) showRetryableError(result.message);
```

Wrong:

```tsx
// Result phase mounts another Maps SDK instance for the same round.
return phase === "result" ? <ResultMap /> : <GuessMap />;
```

Correct:

```tsx
// One map instance survives phase changes; only overlays and layout change.
<GuessMap
  guess={phase === "result" ? latestResult.guess : guess}
  answer={phase === "result" ? latestAnswer : null}
  disabled={phase === "result"}
/>
```

### Scenario: Client-Hosted Question Image Assets

#### 1. Scope / Trigger

- Trigger: adding question-bank images, CDN/R2 object paths, or a public image base URL used by browser-rendered game cards.
- Applies to static question JSON, generated question payloads, browser `<img>` tags, and future object-storage image uploads.

#### 2. Signatures

- Public browser image prefix must be optional and named with a `NEXT_PUBLIC_*` key, for example `NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL`.
- Question records should store relative object keys such as `anime/51_CLANNAD/5c4dgq9pm.jpg`, not user-specific local filesystem paths.
- Anime Guessr R2 uploads should use `npm run images:upload-anime -- <local-file> [object-key]`, which wraps `npx wrangler r2 object put anime-gussr/<object-key> --file <local-file> --remote`.
- Image URL helpers should expose a signature like:

```typescript
buildQuestionImageUrl(imagePath?: string, baseUrl?: string): string | undefined;
```

#### 3. Contracts

- `imagePath` may be missing while data or uploads are still incomplete.
- Missing public image base URL -> render a non-crashing placeholder and keep the question playable.
- Object storage URLs used directly by `<img>` must be readable by a normal browser request without `Authorization`.
- Storage endpoints that return `401 Missing Authorization header` are not valid direct image bases; use a public R2 custom domain, `r2.dev` public URL, signed app proxy, or another browser-readable CDN URL instead.
- Wrangler R2 object uploads must include `--remote`; without it Wrangler can write to local simulation state instead of the Cloudflare bucket.
- Do not commit real storage tokens, signed URLs, or user-local source paths into question payloads.

#### 4. Validation & Error Matrix

- Missing `NEXT_PUBLIC_*_IMAGE_BASE_URL` -> show "image unavailable/prefix not configured" state, not a thrown render error.
- Image object 404/401/5xx -> handle `<img onError>` and fall back to the placeholder for that question.
- Absolute `https://` image URL in data -> use as-is.
- Relative image path + public base URL -> trim duplicate slashes and join exactly once.
- Generated data outside active map bounds -> exclude during conversion for bounded modes; global Anime Guessr data should instead pass a generic latitude/longitude range guard.

#### 5. Good/Base/Bad Cases

- Good: generated compact JSON with relative image keys, optional public env base URL, unit-tested URL joining, and browser fallback on image load failure.
- Base: text-only playable questions while image uploads are pending.
- Bad: hard-coding an authenticated R2 catalog endpoint as the only image source, bundling a 100MB raw scrape into client JavaScript, or leaking local WeChat/cache paths into public data.

#### 6. Tests Required

- Unit tests for URL joining, missing-base behavior, and data guard functions.
- For upload scripts, run syntax/help checks and upload one known small object before sharing the command.
- Build/type-check after adding public env keys or generated payload types.
- Browser smoke for the mode entry and image fallback when the public image base is absent or inaccessible.

#### 7. Wrong vs Correct

Wrong:

```typescript
const imageUrl = `https://catalog.cloudflarestorage.com/account/bucket/${record.local_path}`;
```

Correct:

```typescript
const imageUrl = buildQuestionImageUrl(
  question.imagePath,
  process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL,
);
```

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
