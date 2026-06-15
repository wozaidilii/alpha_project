"use client";

import { useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  loadBaiduMapScript,
  type BaiduPanoramaInstance,
} from "~/lib/baidu-panorama";
import { type TuxunLocation } from "~/lib/tuxun-locations";

type LoadState = "idle" | "loading" | "ready" | "error";

interface Props {
  location: TuxunLocation;
}

export function BaiduPanorama({ location }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<BaiduPanoramaInstance | null>(null);
  const [state, setState] = useState<LoadState>(
    BAIDU_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    if (!BAIDU_MAP_AK) return;
    if (!containerRef.current) return;

    let active = true;
    setState("loading");

    void loadBaiduMapScript(BAIDU_MAP_AK)
      .then(() => {
        if (!active || !containerRef.current || !window.BMap?.Panorama) {
          if (active) setState("error");
          return;
        }

        const panorama =
          panoramaRef.current ?? new window.BMap.Panorama(containerRef.current);
        panoramaRef.current = panorama;
        const point = new window.BMap.Point(location.lng, location.lat);
        if (location.panoId && panorama.setId) {
          panorama.setId(location.panoId);
        } else {
          panorama.setPosition(point);
        }
        panorama.setPov?.({
          heading: location.heading,
          pitch: location.pitch,
        });
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, [
    location.heading,
    location.lat,
    location.lng,
    location.panoId,
    location.pitch,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-950">
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-stone-950 text-center">
          <div className="max-w-md px-6">
            <div className="mb-3 text-5xl">🛰️</div>
            <div className="text-lg font-bold text-stone-100">
              {BAIDU_MAP_AK ? "正在加载百度全景" : "需要配置百度地图 AK"}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {BAIDU_MAP_AK
                ? "如果长时间没有画面，请确认百度地图 JS API 和全景服务已开通。"
                : "在 .env.local 添加 NEXT_PUBLIC_BAIDU_MAP_AK 后重启 npm run dev。百度全景属于高级服务，AK 需要在百度地图开放平台开通对应权限。"}
            </p>
            <a
              href="https://lbsyun.baidu.com/docs/jsapi?title=jspopular3.0/guide/panorama"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 transition hover:bg-amber-400"
            >
              查看百度全景文档
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
