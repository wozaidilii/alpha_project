"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampToBounds, type ForeignCountryConfig } from "~/lib/foreign-map";
import {
  getGoogleGuessMapInitialView,
  syncGoogleGuessMapViewport,
} from "~/lib/google-guess-map-view";
import {
  GOOGLE_MAP_AK,
  getGoogleMapsApi,
  googleBoundsForCountry,
  loadGoogleMapsScript,
  type GoogleMapsLanguage,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
} from "~/lib/google-street-view";
import {
  GOOGLE_GUESS_MAP_LABELS,
  type GoogleGuessMapLabels,
} from "~/lib/google-guess-map-labels";

export type { GoogleGuessMapLabels } from "~/lib/google-guess-map-labels";

interface Props {
  country: ForeignCountryConfig;
  guess: { lat: number; lng: number } | null;
  answer: { lat: number; lng: number } | null;
  answerLabel?: string;
  distanceKm?: number;
  disabled?: boolean;
  labels?: GoogleGuessMapLabels;
  googleMapsLanguage?: GoogleMapsLanguage;
  minHeightClass?: string;
  restrictToCountry?: boolean;
  formatDistance?: (distanceKm: number) => string;
  onGuess: (point: { lat: number; lng: number }) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const DEFAULT_LABELS = GOOGLE_GUESS_MAP_LABELS.zh;

function formatDistanceZh(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function buildMarkerIcon({
  color,
  label,
  size,
}: {
  color: string;
  label: string;
  size: number;
}) {
  const text = label.slice(0, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
  <path d="M${size / 2} ${size + 8} C${size / 2} ${size + 8} ${size * 0.2} ${size * 0.55} ${size * 0.2} ${size * 0.35} C${size * 0.2} ${size * 0.13} ${size * 0.33} 2 ${size / 2} 2 C${size * 0.67} 2 ${size * 0.8} ${size * 0.13} ${size * 0.8} ${size * 0.35} C${size * 0.8} ${size * 0.55} ${size / 2} ${size + 8} ${size / 2} ${size + 8} Z" fill="${color}" stroke="white" stroke-width="3"/>
  <circle cx="${size / 2}" cy="${size * 0.35}" r="${size * 0.2}" fill="rgba(15,23,42,0.22)"/>
  <text x="${size / 2}" y="${size * 0.42}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.28}" font-weight="800" fill="white">${text}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function GoogleGuessMap({
  country,
  guess,
  answer,
  answerLabel,
  distanceKm,
  disabled,
  labels = DEFAULT_LABELS,
  googleMapsLanguage,
  minHeightClass = "min-h-[360px]",
  restrictToCountry = true,
  formatDistance = formatDistanceZh,
  onGuess,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const lineRef = useRef<GooglePolylineInstance | null>(null);
  const clickListenerRef = useRef<{ remove: () => void } | null>(null);
  const onGuessRef = useRef(onGuess);
  const disabledRef = useRef(disabled);
  const [state, setState] = useState<LoadState>(
    GOOGLE_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const clearOverlays = useCallback(() => {
    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];
    lineRef.current?.setMap(null);
    lineRef.current = null;
  }, []);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const api = getGoogleMapsApi();
    if (!map || !api?.Marker || !api.Polyline || !api.LatLngBounds) return;

    clearOverlays();

    if (answer) {
      markersRef.current.push(
        new api.Marker({
          position: answer,
          map,
          title: answerLabel
            ? `${labels.answerTitle}: ${answerLabel}`
            : labels.answerTitle,
          icon: buildMarkerIcon({
            color: "#22c55e",
            label: labels.answerMarkerLabel,
            size: 44,
          }),
          zIndex: 10,
        }),
      );
    }

    if (guess) {
      markersRef.current.push(
        new api.Marker({
          position: guess,
          map,
          title: labels.guessTitle,
          icon: buildMarkerIcon({
            color: "#f59e0b",
            label: labels.guessMarkerLabel,
            size: 36,
          }),
          zIndex: 20,
        }),
      );
    }

    if (guess && answer) {
      lineRef.current = new api.Polyline({
        path: [guess, answer],
        map,
        strokeColor: "#fbbf24",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
    }

    syncGoogleGuessMapViewport({
      map,
      api,
      country,
      restrictToCountry,
      guess,
      answer,
    });
  }, [
    answer,
    answerLabel,
    clearOverlays,
    country,
    guess,
    labels.answerMarkerLabel,
    labels.answerTitle,
    labels.guessMarkerLabel,
    labels.guessTitle,
    restrictToCountry,
  ]);

  useEffect(() => {
    if (!GOOGLE_MAP_AK || !containerRef.current || mapRef.current) return;

    let active = true;
    setState("loading");

    void loadGoogleMapsScript(GOOGLE_MAP_AK, { language: googleMapsLanguage })
      .then(() => {
        if (!active || !containerRef.current) return;
        const api = getGoogleMapsApi();
        if (!api?.Map) throw new Error("Google Maps API 未加载");

        const initialView = getGoogleGuessMapInitialView(
          country,
          restrictToCountry,
        );
        const map = new api.Map(containerRef.current, {
          center: initialView.center,
          zoom: initialView.zoom,
          ...(restrictToCountry
            ? {
                restriction: {
                  latLngBounds: googleBoundsForCountry(country),
                  strictBounds: true,
                },
              }
            : {}),
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        clickListenerRef.current = map.addListener("click", (event) => {
          if (disabledRef.current || !event.latLng) return;
          const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          onGuessRef.current(
            restrictToCountry ? clampToBounds(point, country.bounds) : point,
          );
        });

        mapRef.current = map;
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
      clearOverlays();
      if (mapRef.current) {
        getGoogleMapsApi()?.event?.clearInstanceListeners?.(mapRef.current);
      }
      mapRef.current = null;
    };
  }, [clearOverlays, country, googleMapsLanguage, restrictToCountry]);

  useEffect(() => {
    if (state === "ready") syncMarkers();
  }, [state, syncMarkers]);

  return (
    <div
      className={`relative h-full ${minHeightClass} overflow-hidden bg-stone-950`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-stone-950 px-5 text-center">
          <div>
            <div className="text-base font-semibold text-stone-100">
              {GOOGLE_MAP_AK ? labels.loadingTitle : labels.missingKeyTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {GOOGLE_MAP_AK ? labels.loadingBody : labels.missingKeyBody}
            </p>
          </div>
        </div>
      )}

      {answer && (
        <div className="pointer-events-none absolute top-3 right-3 rounded-md border border-stone-700 bg-stone-950/90 px-3 py-2 text-xs text-stone-200 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            {labels.guessTitle}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            {labels.answerTitle}
          </div>
          {distanceKm != null ? (
            <div className="mt-2 border-t border-stone-700 pt-2 font-semibold text-amber-200">
              {labels.distancePrefix} {formatDistance(distanceKm)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
