import { afterEach, describe, expect, it, vi } from "vitest";
import {
  confirmGoogleStreetViewLocation,
  GOOGLE_STREET_VIEW_RENDER_RADIUS_METERS,
  GOOGLE_STREET_VIEW_RENDER_TIMEOUT_MS,
  type GoogleMapsApi,
} from "./google-street-view";

type PanoramaCallback = (data: unknown, status: string) => void;

function makeLatLng(lat: number, lng: number) {
  return {
    lat: () => lat,
    lng: () => lng,
  };
}

function makeApi(
  handler: (request: unknown, callback: PanoramaCallback) => void,
) {
  return {
    StreetViewStatus: { OK: "OK" },
    StreetViewService: class {
      getPanorama(request: unknown, callback: PanoramaCallback) {
        handler(request, callback);
      }
    },
  } as unknown as Pick<GoogleMapsApi, "StreetViewService" | "StreetViewStatus">;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("confirmGoogleStreetViewLocation", () => {
  it("confirms and returns the render target for a nearby panorama", async () => {
    const requests: unknown[] = [];
    const api = makeApi((request, callback) => {
      requests.push(request);
      callback(
        {
          location: {
            latLng: makeLatLng(35.659, 139.701),
            pano: "pano-123",
          },
        },
        "OK",
      );
    });

    await expect(
      confirmGoogleStreetViewLocation(api, { lat: 35.66, lng: 139.7 }),
    ).resolves.toEqual({
      point: { lat: 35.659, lng: 139.701 },
      panoId: "pano-123",
    });
    expect(requests).toEqual([
      {
        location: { lat: 35.66, lng: 139.7 },
        radius: GOOGLE_STREET_VIEW_RENDER_RADIUS_METERS,
      },
    ]);
  });

  it("confirms an explicit pano id before rendering", async () => {
    const requests: unknown[] = [];
    const api = makeApi((request, callback) => {
      requests.push(request);
      callback(
        {
          location: {
            latLng: makeLatLng(34.39, 132.45),
          },
        },
        "OK",
      );
    });

    await expect(
      confirmGoogleStreetViewLocation(api, {
        lat: 34.39,
        lng: 132.45,
        panoId: "known-pano",
      }),
    ).resolves.toEqual({
      point: { lat: 34.39, lng: 132.45 },
      panoId: "known-pano",
    });
    expect(requests).toEqual([{ pano: "known-pano" }]);
  });

  it("returns null when Street View reports no panorama", async () => {
    const api = makeApi((_request, callback) => {
      callback(null, "ZERO_RESULTS");
    });

    await expect(
      confirmGoogleStreetViewLocation(api, { lat: 43.1, lng: 141.3 }),
    ).resolves.toBeNull();
  });

  it("returns null when Street View never answers", async () => {
    vi.useFakeTimers();
    const api = makeApi(() => undefined);

    const promise = confirmGoogleStreetViewLocation(api, {
      lat: 43.1,
      lng: 141.3,
    });
    await vi.advanceTimersByTimeAsync(GOOGLE_STREET_VIEW_RENDER_TIMEOUT_MS);

    await expect(promise).resolves.toBeNull();
  });
});
