import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FOREIGN_COUNTRY, type LatLng } from "./foreign-map";
import {
  resetGoogleGuessMapView,
  syncGoogleGuessMapViewport,
} from "./google-guess-map-view";
import type {
  GoogleLatLngBoundsInstance,
  GoogleMapInstance,
  GoogleMapsApi,
} from "./google-street-view";

class MockLatLngBounds implements GoogleLatLngBoundsInstance {
  readonly points: LatLng[] = [];

  extend(point: LatLng) {
    this.points.push(point);
  }
}

function makeMap() {
  const fitBounds = vi.fn();
  const panTo = vi.fn();
  const setCenter = vi.fn();
  const setZoom = vi.fn();
  const map: GoogleMapInstance = {
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    fitBounds,
    panTo,
    setCenter,
    setZoom,
  };

  return { fitBounds, map, panTo, setCenter, setZoom };
}

const api = {
  LatLngBounds: MockLatLngBounds,
} satisfies Pick<GoogleMapsApi, "LatLngBounds">;

describe("google guess map viewport sync", () => {
  it("fits the map to the guess and answer during a result", () => {
    const { fitBounds, map, setCenter, setZoom } = makeMap();
    const guess = { lat: 35.7, lng: 139.7 };
    const answer = { lat: 35.6, lng: 139.8 };

    syncGoogleGuessMapViewport({
      map,
      api,
      country: DEFAULT_FOREIGN_COUNTRY,
      restrictToCountry: true,
      guess,
      answer,
    });

    expect(fitBounds).toHaveBeenCalledTimes(1);
    expect(fitBounds.mock.calls[0]?.[0]).toMatchObject({
      points: [guess, answer],
    });
    expect(setCenter).not.toHaveBeenCalled();
    expect(setZoom).not.toHaveBeenCalled();
  });

  it("resets to the country overview after the result is cleared for the next round", () => {
    const { map, setCenter, setZoom } = makeMap();

    syncGoogleGuessMapViewport({
      map,
      api,
      country: DEFAULT_FOREIGN_COUNTRY,
      restrictToCountry: true,
      guess: null,
      answer: null,
    });

    expect(setCenter).toHaveBeenCalledWith(DEFAULT_FOREIGN_COUNTRY.center);
    expect(setZoom).toHaveBeenCalledWith(DEFAULT_FOREIGN_COUNTRY.zoom);
  });

  it("does not reset the viewport when a player has only placed a guess", () => {
    const { fitBounds, map, panTo, setCenter, setZoom } = makeMap();

    syncGoogleGuessMapViewport({
      map,
      api,
      country: DEFAULT_FOREIGN_COUNTRY,
      restrictToCountry: true,
      guess: { lat: 34.7, lng: 135.5 },
      answer: null,
    });

    expect(fitBounds).not.toHaveBeenCalled();
    expect(panTo).not.toHaveBeenCalled();
    expect(setCenter).not.toHaveBeenCalled();
    expect(setZoom).not.toHaveBeenCalled();
  });

  it("falls back to panTo when the map wrapper lacks setCenter", () => {
    const { map, panTo, setZoom } = makeMap();
    map.setCenter = undefined;

    resetGoogleGuessMapView(map, DEFAULT_FOREIGN_COUNTRY, true);

    expect(panTo).toHaveBeenCalledWith(DEFAULT_FOREIGN_COUNTRY.center);
    expect(setZoom).toHaveBeenCalledWith(DEFAULT_FOREIGN_COUNTRY.zoom);
  });
});
