"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BAIDU_MAP_AK,
  loadBaiduMapScript,
  type BaiduMapClickEvent,
  type BaiduMapInstance,
  type BaiduPoint,
} from "~/lib/baidu-panorama";

interface Props {
  guess: { lat: number; lng: number } | null;
  answer: { lat: number; lng: number } | null;
  answerLabel?: string;
  distanceKm?: number;
  disabled?: boolean;
  minHeightClass?: string;
  onGuess: (point: { lat: number; lng: number }) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const CHINA_CENTER = { lng: 104.1954, lat: 35.8617 };

interface BaiduOverlay {
  setPosition?: (point: BaiduPoint) => void;
}

interface BaiduLabelInstance extends BaiduOverlay {
  setStyle?: (style: Record<string, string>) => void;
}

interface BaiduGuessMapApi {
  Point: new (lng: number, lat: number) => BaiduPoint;
  Map: new (container: HTMLElement) => BaiduMapInstance;
  Marker: new (point: BaiduPoint) => BaiduOverlay;
  Polyline: new (
    points: BaiduPoint[],
    options: {
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
    },
  ) => BaiduOverlay;
  Circle: new (
    center: BaiduPoint,
    radius: number,
    options: {
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    },
  ) => BaiduOverlay;
  Label: new (
    content: string,
    options: {
      position: BaiduPoint;
      offset?: { width: number; height: number };
    },
  ) => BaiduLabelInstance;
  Size: new (
    width: number,
    height: number,
  ) => { width: number; height: number };
}

type BaiduViewport = { center: BaiduPoint; zoom: number };

type BaiduMapWithViewport = Omit<BaiduMapInstance, "setViewport"> & {
  getViewport?: (
    points: BaiduPoint[],
    options?: { margins?: number[] },
  ) => BaiduViewport;
  getZoom?: () => number;
  setViewport?: (viewport: BaiduPoint[] | BaiduViewport) => void;
};

function getBaiduGuessMapApi(): BaiduGuessMapApi | undefined {
  return window.BMap as BaiduGuessMapApi | undefined;
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function markerRadiusMeters(zoom: number) {
  if (zoom >= 10) return 6000;
  if (zoom >= 8) return 12000;
  if (zoom >= 6) return 25000;
  return 45000;
}

export function BaiduGuessMap({
  guess,
  answer,
  answerLabel,
  distanceKm,
  disabled,
  minHeightClass = "min-h-[360px]",
  onGuess,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BaiduMapWithViewport | null>(null);
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
    const api = getBaiduGuessMapApi();
    if (!map || !api?.Point || !api.Circle || !api.Polyline || !api.Label) {
      return;
    }

    map.clearOverlays();

    const points: BaiduPoint[] = [];
    if (answer) points.push(new api.Point(answer.lng, answer.lat));
    if (guess) points.push(new api.Point(guess.lng, guess.lat));

    if (points.length === 2 && map.getViewport && map.setViewport) {
      map.setViewport(map.getViewport(points, { margins: [72, 72, 72, 72] }));
    } else if (points.length === 1) {
      map.centerAndZoom(points[0]!, 7);
    }

    const zoom = map.getZoom?.() ?? (answer ? 7 : 5);
    const radius = markerRadiusMeters(zoom);

    if (answer) {
      const answerPoint = new api.Point(answer.lng, answer.lat);

      map.addOverlay(
        new api.Circle(answerPoint, radius, {
          strokeColor: "#22c55e",
          strokeWeight: 2,
          strokeOpacity: 0.95,
          fillColor: "#22c55e",
          fillOpacity: 0.28,
        }),
      );
      map.addOverlay(new api.Marker(answerPoint));
      map.addOverlay(
        new api.Label(answerLabel ? `答案：${answerLabel}` : "答案", {
          position: answerPoint,
          offset: new api.Size(12, -28),
        }),
      );
    }

    if (guess) {
      const guessPoint = new api.Point(guess.lng, guess.lat);

      map.addOverlay(
        new api.Circle(guessPoint, radius, {
          strokeColor: "#f59e0b",
          strokeWeight: 2,
          strokeOpacity: 0.95,
          fillColor: "#f59e0b",
          fillOpacity: 0.24,
        }),
      );
      map.addOverlay(new api.Marker(guessPoint));
      map.addOverlay(
        new api.Label("你的猜测", {
          position: guessPoint,
          offset: new api.Size(12, -28),
        }),
      );
    }

    if (guess && answer) {
      const guessPoint = new api.Point(guess.lng, guess.lat);
      const answerPoint = new api.Point(answer.lng, answer.lat);
      map.addOverlay(
        new api.Polyline([guessPoint, answerPoint], {
          strokeColor: "#fbbf24",
          strokeWeight: 4,
          strokeOpacity: 0.9,
        }),
      );

      if (distanceKm != null) {
        const midPoint = new api.Point(
          (guess.lng + answer.lng) / 2,
          (guess.lat + answer.lat) / 2,
        );
        map.addOverlay(
          new api.Label(`偏差 ${formatDistance(distanceKm)}`, {
            position: midPoint,
            offset: new api.Size(-36, -10),
          }),
        );
      }
    }
  }, [answer, answerLabel, distanceKm, guess]);

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
        if (!active || !containerRef.current) return;
        const api = getBaiduGuessMapApi();
        if (!api?.Map || !api.Point) return;

        const map = new api.Map(containerRef.current) as BaiduMapWithViewport;
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
    <div
      className={`relative h-full ${minHeightClass} overflow-hidden bg-stone-950`}
    >
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

      {answer ? (
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
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-stone-700 bg-stone-950/85 px-3 py-2 text-xs text-stone-300 shadow-lg shadow-black/30">
          {guess ? "已选点，可提交答案" : "点击地图选择地点"}
        </div>
      )}
    </div>
  );
}
