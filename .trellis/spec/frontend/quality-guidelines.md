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

#### 4. Validation & Error Matrix

- Missing key -> show configuration message and allow returning to mode selection.
- Script load timeout/failure -> show retryable load/generation error.
- Street-view service unavailable -> fail generation with retry, not a non-street-view fallback.
- Insufficient confirmed panoramas -> do not start the round; show how many were found when useful.
- Component unmount during SDK loading -> ignore late results and clean listeners/overlays.

#### 5. Good/Base/Bad Cases

- Good: shared country config + SDK loader + confirmed panorama generation + map bounds restriction + a persistent map component whose overlays change between guessing and result states + focused config tests.
- Base: single-country implementation that still uses a country catalog so new countries append data instead of branching UI logic.
- Bad: hard-coded coordinates in page components, required public map keys that break unrelated builds, fallback images/maps inside a street-view mode, or separate guess/result map components that remount the provider SDK during every round.

#### 6. Tests Required

- Unit tests for country bounds, clamping, and country lookup.
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
