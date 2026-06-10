"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { mountResultMap, type ChinaResultMapHandle } from "~/lib/china-leaflet";
import { type TuxunLocation } from "~/lib/tuxun-locations";

interface Props {
  actual: TuxunLocation;
  guess: { lat: number; lng: number };
}

export function TuxunResultMap({ actual, guess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ChinaResultMapHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    let active = true;

    void mountResultMap(
      container,
      [
        {
          point: { lat: actual.lat, lng: actual.lng },
          color: "#22c55e",
          label: "实际地点",
          radius: 12,
        },
        {
          point: guess,
          color: "#f59e0b",
          label: "你的猜测",
          radius: 10,
        },
      ],
      [
        {
          from: guess,
          to: { lat: actual.lat, lng: actual.lng },
          color: "#f59e0b",
        },
      ],
      () => active && containerRef.current === container,
    ).then((handle) => {
      if (!active) {
        handle.destroy();
        return;
      }
      mapRef.current = handle;
    });

    return () => {
      active = false;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [actual, guess]);

  return <div ref={containerRef} className="h-full w-full" />;
}
