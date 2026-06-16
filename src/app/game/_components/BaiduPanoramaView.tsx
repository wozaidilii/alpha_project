"use client";

import { useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  loadBaiduMapScript,
  type BaiduPanoramaInstance,
  type BaiduPoint,
} from "~/lib/baidu-panorama";

interface Props {
  point: BaiduPoint;
  panoId?: string;
  heading?: number;
  pitch?: number;
  minHeightClass?: string;
  onUnavailable?: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function BaiduPanoramaView({
  point,
  panoId,
  heading = 0,
  pitch = 0,
  minHeightClass = "min-h-[420px]",
  onUnavailable,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<BaiduPanoramaInstance | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  const pointLat = point.lat;
  const pointLng = point.lng;
  const [state, setState] = useState<LoadState>(
    BAIDU_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    const container = containerRef.current;
    if (!BAIDU_MAP_AK || !container) {
      setState("error");
      onUnavailableRef.current?.();
      return;
    }

    let active = true;
    setState("loading");
    panoramaRef.current = null;
    container.innerHTML = "";

    void (async () => {
      await loadBaiduMapScript(BAIDU_MAP_AK, "panorama");
      if (!active || !window.BMap?.Panorama) return;

      const api = window.BMap;
      const PanoramaCtor = api.Panorama;
      if (!PanoramaCtor) {
        throw new Error("百度 JS 全景构造器不可用");
      }

      const panorama = new PanoramaCtor(container);
      const panoramaPoint = new api.Point(pointLng, pointLat);

      if (panoId && panorama.setId) {
        panorama.setId(panoId);
      } else {
        panorama.setPosition(panoramaPoint);
      }
      panorama.setPov?.({ heading, pitch });

      panoramaRef.current = panorama;
      setState("ready");
    })().catch(() => {
      if (!active) return;
      setState("error");
      onUnavailableRef.current?.();
    });

    return () => {
      active = false;
      panoramaRef.current = null;
      container.innerHTML = "";
    };
  }, [heading, panoId, pitch, pointLat, pointLng]);

  return (
    <div className={`relative h-full ${minHeightClass} bg-stone-950`}>
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <div className="text-lg font-bold text-stone-100">
              {state === "loading"
                ? "正在加载百度 JS 全景"
                : "无法加载百度 JS 全景"}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {BAIDU_MAP_AK
                ? "如果当前位置没有可用全景，会自动降级到静态图或底图。"
                : "请在 .env.local 配置 NEXT_PUBLIC_BAIDU_MAP_AK 后重启开发服务。"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
