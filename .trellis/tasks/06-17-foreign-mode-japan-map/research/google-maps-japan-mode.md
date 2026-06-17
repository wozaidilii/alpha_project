# Google Maps Japan Mode Research

## Sources

- Google Maps JavaScript API: Restrict Map Bounds
  - https://developers.google.com/maps/documentation/javascript/examples/control-bounds-restriction
- Google Maps JavaScript API: Load the Maps JavaScript API
  - https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Google Maps JavaScript API: Street View Service
  - https://developers.google.com/maps/documentation/javascript/streetview

## Findings

- The Maps JavaScript API requires a valid API key. The user configured `NEXT_PUBLIC_GOOGLE_MAP_AK`, so the implementation should add that key to `src/env.js` and use the same public env name.
- Google recommends dynamic library loading through `google.maps.importLibrary()` or the official loader package. For this project, a small script loader matching `src/lib/baidu-panorama.ts` keeps dependency churn low and avoids changing `package-lock.json`.
- Map panning/zooming can be constrained with the map `restriction` option, using `latLngBounds` and `strictBounds`. This supports a Japan-only map by providing Japan bounds.
- Street View availability should be checked with `StreetViewService.getPanorama(...)` before a round is accepted. The project already has lessons requiring street-view modes to validate panorama availability before entering gameplay.

## Repo Constraints

- Existing China map constants live in `src/lib/china-map.ts`.
- Existing Leaflet result maps are in `src/lib/china-leaflet.ts`.
- Existing interactive Tuxun guess maps use `BaiduGuessMap` through `FloatingGuessMap`.
- Previous lessons require third-party map SDK boundaries to tolerate script load success but service failure, and to avoid resetting user viewport when syncing markers.

## Selected MVP

- Add a small country catalog with Japan first: label, center, zoom, bounds, default provider.
- Add `NEXT_PUBLIC_GOOGLE_MAP_AK` to client env.
- Add Google Street View generation for Japan that:
  - randomizes candidate points inside configured Japan regions,
  - uses `StreetViewService.getPanorama(...)` to confirm panorama availability,
  - returns only confirmed Street View locations,
  - fails the round setup if it cannot produce the full configured round count.
- Add a Google Maps wrapper for the guess/result maps that:
  - loads the Maps JavaScript API script once,
  - initializes a map centered on Japan,
  - restricts bounds to Japan,
  - clamps clicked guesses to Japan bounds,
  - displays guess/answer markers and result lines without resetting viewport during normal guess marker sync.
- Keep the first country selector disabled or single-option if only Japan exists, but design the API so more countries can be appended later.

## Open Risk

- Google Street View coverage can be uneven. The page should treat insufficient confirmed panoramas as a setup failure with retry, not silently enter a non-street-view fallback.
