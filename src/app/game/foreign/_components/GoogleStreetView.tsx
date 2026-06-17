"use client";

import { useEffect, useRef, useState } from "react";
import {
  GOOGLE_MAP_AK,
  getGoogleMapsApi,
  loadGoogleMapsScript,
  type GoogleStreetViewPanoramaInstance,
} from "~/lib/google-street-view";
import { type TuxunLocation } from "~/lib/tuxun-locations";

interface Props {
  location: TuxunLocation;
  onUnavailable?: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function GoogleStreetView({ location, onUnavailable }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<GoogleStreetViewPanoramaInstance | null>(null);
  const [state, setState] = useState<LoadState>(
    GOOGLE_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || panoramaRef.current) return;

    let active = true;
    setState("loading");

    void loadGoogleMapsScript(GOOGLE_MAP_AK)
      .then(() => {
        if (!active || !containerRef.current) return;
        const api = getGoogleMapsApi();
        if (!api?.StreetViewPanorama) {
          throw new Error("Google Street View API 未加载");
        }

        const panorama = new api.StreetViewPanorama(containerRef.current, {
          ...(location.panoId
            ? { pano: location.panoId }
            : { position: { lat: location.lat, lng: location.lng } }),
          pov: { heading: location.heading, pitch: location.pitch },
          zoom: 1,
          visible: true,
          addressControl: false,
          fullscreenControl: true,
          motionTracking: false,
          motionTrackingControl: false,
        });
        panoramaRef.current = panorama;
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
        onUnavailable?.();
      });

    return () => {
      active = false;
      if (panoramaRef.current) {
        panoramaRef.current.setVisible?.(false);
        getGoogleMapsApi()?.event?.clearInstanceListeners?.(
          panoramaRef.current,
        );
      }
      panoramaRef.current = null;
    };
  }, [location, onUnavailable]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-950">
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-stone-950 px-5 text-center">
          <div>
            <div className="text-base font-semibold text-stone-100">
              {GOOGLE_MAP_AK
                ? "正在加载 Google Street View"
                : "需要配置 Google Maps AK"}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {GOOGLE_MAP_AK
                ? "街景加载失败时，将自动跳过当前点位或提示重新生成。"
                : "在 .env.local 配置 NEXT_PUBLIC_GOOGLE_MAP_AK 后重启开发服务。"}
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 rounded-md border border-black/40 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-stone-200 shadow-lg shadow-black/30">
        Google Street View
      </div>
    </div>
  );
}
