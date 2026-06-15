"use client";

import { useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  loadBaiduMapScript,
  type BaiduMapInstance,
} from "~/lib/baidu-panorama";

interface Props {
  center: { lat: number; lng: number };
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function BaiduSceneMap({ center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BaiduMapInstance | null>(null);
  const [state, setState] = useState<LoadState>(
    BAIDU_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    if (!BAIDU_MAP_AK || !containerRef.current || mapRef.current) return;

    let active = true;
    setState("loading");

    void loadBaiduMapScript(BAIDU_MAP_AK, "map")
      .then(() => {
        if (!active || !containerRef.current || !window.BMap) return;

        const api = window.BMap;
        const map = new api.Map(containerRef.current);
        map.centerAndZoom(new api.Point(center.lng, center.lat), 16);
        map.enableScrollWheelZoom?.(true);
        mapRef.current = map;
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
      mapRef.current?.clearOverlays();
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapRef.current || !window.BMap) return;
    mapRef.current.centerAndZoom(
      new window.BMap.Point(center.lng, center.lat),
      16,
    );
  }, [center.lat, center.lng]);

  return (
    <div className="relative h-full min-h-[420px] bg-stone-950">
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <div className="text-lg font-bold text-stone-100">
              无法加载百度 JS 底图
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              请确认 NEXT_PUBLIC_BAIDU_MAP_AK 已配置，并且该 AK 开通了基础 JS
              API 底图服务。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
