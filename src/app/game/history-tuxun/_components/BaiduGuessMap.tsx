"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  loadBaiduMapScript,
  type BaiduMapClickEvent,
  type BaiduMapInstance,
  type BaiduMarkerInstance,
} from "~/lib/baidu-panorama";

interface Props {
  guess: { lat: number; lng: number } | null;
  answer: { lat: number; lng: number } | null;
  disabled?: boolean;
  onGuess: (point: { lat: number; lng: number }) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const CHINA_CENTER = { lng: 104.1954, lat: 35.8617 };

export function BaiduGuessMap({ guess, answer, disabled, onGuess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BaiduMapInstance | null>(null);
  const guessMarkerRef = useRef<BaiduMarkerInstance | null>(null);
  const answerMarkerRef = useRef<BaiduMarkerInstance | null>(null);
  const onGuessRef = useRef(onGuess);
  const disabledRef = useRef(disabled);
  const [state, setState] = useState<LoadState>(
    BAIDU_MAP_AK ? "idle" : "error",
  );

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const api = window.BMap;
    if (!map || !api) return;

    map.clearOverlays();
    guessMarkerRef.current = null;
    answerMarkerRef.current = null;

    if (answer) {
      const marker = new api.Marker(new api.Point(answer.lng, answer.lat));
      map.addOverlay(marker);
      answerMarkerRef.current = marker;
    }

    if (guess) {
      const marker = new api.Marker(new api.Point(guess.lng, guess.lat));
      map.addOverlay(marker);
      guessMarkerRef.current = marker;
    }
  }, [answer, guess]);

  useEffect(() => {
    if (!BAIDU_MAP_AK || !containerRef.current || mapRef.current) return;

    let active = true;
    setState("loading");

    const handleClick = (event: BaiduMapClickEvent) => {
      if (disabledRef.current) return;
      onGuessRef.current({ lat: event.point.lat, lng: event.point.lng });
    };

    void loadBaiduMapScript(BAIDU_MAP_AK, "map")
      .then(() => {
        if (!active || !containerRef.current || !window.BMap) return;

        const api = window.BMap;
        const map = new api.Map(containerRef.current);
        map.centerAndZoom(new api.Point(CHINA_CENTER.lng, CHINA_CENTER.lat), 5);
        map.enableScrollWheelZoom?.(true);
        map.addEventListener("click", handleClick);
        mapRef.current = map;
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
      mapRef.current?.removeEventListener?.("click", handleClick);
      mapRef.current?.clearOverlays();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state === "ready") syncMarkers();
  }, [state, syncMarkers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        mapRef.current?.checkResize?.();
      });
    });

    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-stone-950">
      <div ref={containerRef} className="h-full w-full" />

      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-stone-950 px-5 text-center">
          <div>
            <div className="text-base font-semibold text-stone-100">
              {BAIDU_MAP_AK ? "正在加载百度地图" : "需要配置百度地图 AK"}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              {BAIDU_MAP_AK
                ? "地图加载失败时，请确认百度地图 JS API 权限已开通。"
                : "在 .env.local 配置 NEXT_PUBLIC_BAIDU_MAP_AK 后重启开发服务。"}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-stone-700 bg-stone-950/85 px-3 py-2 text-xs text-stone-300 shadow-lg shadow-black/30">
        {answer
          ? "结果已揭晓：地图显示答案与猜测标记"
          : guess
            ? "已选点，可提交答案"
            : "点击地图选择地点"}
      </div>
    </div>
  );
}
