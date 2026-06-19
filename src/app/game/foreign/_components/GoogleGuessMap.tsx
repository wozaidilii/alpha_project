"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampToBounds, type ForeignCountryConfig } from "~/lib/foreign-map";
import {
  GOOGLE_MAP_AK,
  getGoogleMapsApi,
  googleBoundsForCountry,
  loadGoogleMapsScript,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
} from "~/lib/google-street-view";

interface Props {
  country: ForeignCountryConfig;
  guess: { lat: number; lng: number } | null;
  answer: { lat: number; lng: number } | null;
  answerLabel?: string;
  distanceKm?: number;
  disabled?: boolean;
  minHeightClass?: string;
  restrictToCountry?: boolean;
  onGuess: (point: { lat: number; lng: number }) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

export function GoogleGuessMap({
  country,
  guess,
  answer,
  answerLabel,
  distanceKm,
  disabled,
  minHeightClass = "min-h-[360px]",
  restrictToCountry = true,
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
          title: answerLabel ? `答案：${answerLabel}` : "答案",
          label: "答",
        }),
      );
    }

    if (guess) {
      markersRef.current.push(
        new api.Marker({
          position: guess,
          map,
          title: "你的猜测",
          label: "猜",
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

      const bounds = new api.LatLngBounds();
      bounds.extend(guess);
      bounds.extend(answer);
      map.fitBounds(bounds);
    } else if (answer) {
      map.panTo?.(answer);
      map.setZoom?.(9);
    }
  }, [answer, answerLabel, clearOverlays, guess]);

  useEffect(() => {
    if (!GOOGLE_MAP_AK || !containerRef.current || mapRef.current) return;

    let active = true;
    setState("loading");

    void loadGoogleMapsScript(GOOGLE_MAP_AK)
      .then(() => {
        if (!active || !containerRef.current) return;
        const api = getGoogleMapsApi();
        if (!api?.Map) throw new Error("Google Maps API 未加载");

        const map = new api.Map(containerRef.current, {
          center: restrictToCountry ? country.center : { lat: 20, lng: 0 },
          zoom: restrictToCountry ? country.zoom : 2,
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
  }, [clearOverlays, country, restrictToCountry]);

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
              {GOOGLE_MAP_AK
                ? "正在加载 Google Maps"
                : "需要配置 Google Maps AK"}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {GOOGLE_MAP_AK
                ? "地图加载失败时，请确认 Google Maps JavaScript API 和 Street View 已开通。"
                : "在 .env.local 配置 NEXT_PUBLIC_GOOGLE_MAP_AK 后重启开发服务。"}
            </p>
          </div>
        </div>
      )}

      {answer && (
        <div className="pointer-events-none absolute top-3 right-3 rounded-md border border-stone-700 bg-stone-950/90 px-3 py-2 text-xs text-stone-200 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            你的猜测
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            正确答案
          </div>
          {distanceKm != null ? (
            <div className="mt-2 border-t border-stone-700 pt-2 font-semibold text-amber-200">
              偏差 {formatDistance(distanceKm)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
