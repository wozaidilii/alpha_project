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
- Gameplay/result phase transitions should preserve expensive third-party map instances when the same map surface is reused. Update markers, lines, disabled state, and layout classes through props instead of unmounting a guess map and mounting a separate result map.

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
/>;
```

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
