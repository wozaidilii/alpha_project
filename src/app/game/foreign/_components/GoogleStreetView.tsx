"use client";

import { useEffect, useRef, useState } from "react";
import {
  GOOGLE_MAP_AK,
  confirmGoogleStreetViewLocation,
  getGoogleMapsApi,
  loadGoogleMapsScript,
  type GoogleMapsLanguage,
  type GoogleStreetViewPanoramaInstance,
} from "~/lib/google-street-view";
import { type TuxunLocation } from "~/lib/tuxun-locations";

interface Props {
  location: TuxunLocation;
  allowMovement?: boolean;
  googleMapsLanguage?: GoogleMapsLanguage;
  onUnavailable?: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function GoogleStreetView({
  location,
  allowMovement = false,
  googleMapsLanguage,
  onUnavailable,
}: Props) {
  const { heading, lat, lng, panoId, pitch } = location;
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<GoogleStreetViewPanoramaInstance | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  const [state, setState] = useState<LoadState>(
    GOOGLE_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || panoramaRef.current) return;

    let active = true;
    setState("loading");

    void loadGoogleMapsScript(GOOGLE_MAP_AK, { language: googleMapsLanguage })
      .then(async () => {
        if (!active || !containerRef.current) return;
        const api = getGoogleMapsApi();
        if (!api?.StreetViewPanorama || !api.StreetViewService) {
          throw new Error("Google Street View API 未加载");
        }

        const renderTarget = await confirmGoogleStreetViewLocation(api, {
          lat,
          lng,
          ...(panoId ? { panoId } : {}),
        });
        if (!active || !containerRef.current) return;
        if (!renderTarget) {
          setState("error");
          onUnavailableRef.current?.();
          return;
        }

        const panorama = new api.StreetViewPanorama(containerRef.current, {
          ...(renderTarget.panoId
            ? { pano: renderTarget.panoId }
            : { position: renderTarget.point }),
          pov: { heading, pitch },
          zoom: 1,
          visible: true,
          addressControl: false,
          clickToGo: allowMovement,
          fullscreenControl: true,
          linksControl: allowMovement,
          motionTracking: false,
          motionTrackingControl: false,
          panControl: true,
          showRoadLabels: allowMovement,
          zoomControl: true,
        });
        panoramaRef.current = panorama;
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
        onUnavailableRef.current?.();
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
  }, [heading, lat, lng, panoId, pitch, allowMovement, googleMapsLanguage]);

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
