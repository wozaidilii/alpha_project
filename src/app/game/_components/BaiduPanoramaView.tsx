"use client";

import { useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  findBaiduPanoramaNear,
  type BaiduPanoramaInstance,
  type BaiduPoint,
} from "~/lib/baidu-panorama";

interface Props {
  point: BaiduPoint;
  heading?: number;
  pitch?: number;
  radius?: number;
  minHeightClass?: string;
  onUnavailable?: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function BaiduPanoramaView({
  point,
  heading = 0,
  pitch = 0,
  radius = 1800,
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
      const matched = await findBaiduPanoramaNear(
        BAIDU_MAP_AK,
        { lat: pointLat, lng: pointLng },
        radius,
      );
      if (!active || !window.BMap?.Panorama) return;

      if (!matched) {
        throw new Error("百度 JS 全景未返回附近可用点位");
      }

      const api = window.BMap;
      const PanoramaCtor = api.Panorama;
      if (!PanoramaCtor) return;

      const panorama = new PanoramaCtor(container);
      const panoramaPoint = new api.Point(matched.point.lng, matched.point.lat);

      if (matched.panoId && panorama.setId) {
        panorama.setId(matched.panoId);
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
  }, [heading, pitch, pointLat, pointLng, radius]);

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
