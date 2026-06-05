"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";

interface Props {
  guessLat: number | null;
  guessLng: number | null;
  onGuess: (lat: number, lng: number) => void;
}

export function GameMap({ guessLat, guessLng, onGuess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    void import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20, 15],
        zoom: 2,
        minZoom: 1,
        maxZoom: 18,
        worldCopyJump: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        onGuess(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep click handler fresh without re-initialising map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onGuess(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onGuess]);

  // Update marker when guess changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    void import("leaflet").then((L) => {
      markerRef.current?.remove();
      markerRef.current = null;

      if (guessLat !== null && guessLng !== null) {
        markerRef.current = L.circleMarker([guessLat, guessLng], {
          radius: 10,
          fillColor: "#f59e0b",
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);
      }
    });
  }, [guessLat, guessLng]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#1a1a2e" }}
    />
  );
}
