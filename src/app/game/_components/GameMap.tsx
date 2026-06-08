"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { mountGuessMap, type ChinaGuessMapHandle } from "~/lib/china-leaflet";

interface Props {
  guessLat: number | null;
  guessLng: number | null;
  onGuess: (lat: number, lng: number) => void;
}

export function GameMap({ guessLat, guessLng, onGuess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ChinaGuessMapHandle | null>(null);
  const onGuessRef = useRef(onGuess);

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    let active = true;

    void mountGuessMap(
      container,
      (lat, lng) => onGuessRef.current(lat, lng),
      () => active,
    ).then((handle) => {
      if (!active) {
        handle.destroy();
        return;
      }
      mapRef.current = handle;
      handle.setMarker(
        guessLat !== null && guessLng !== null
          ? { lat: guessLat, lng: guessLng }
          : null,
      );
    });

    return () => {
      active = false;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setMarker(
      guessLat !== null && guessLng !== null
        ? { lat: guessLat, lng: guessLng }
        : null,
    );
  }, [guessLat, guessLng]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#1a1a2e" }}
    />
  );
}
