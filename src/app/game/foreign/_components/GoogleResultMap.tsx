"use client";

import { type ForeignCountryConfig } from "~/lib/foreign-map";
import { type TuxunLocation } from "~/lib/tuxun-locations";
import { GoogleGuessMap } from "./GoogleGuessMap";

interface Props {
  country: ForeignCountryConfig;
  actual: TuxunLocation;
  guess: { lat: number; lng: number };
  distanceKm: number;
}

export function GoogleResultMap({ country, actual, guess, distanceKm }: Props) {
  return (
    <GoogleGuessMap
      country={country}
      guess={guess}
      answer={{ lat: actual.lat, lng: actual.lng }}
      answerLabel={actual.title}
      distanceKm={distanceKm}
      disabled
      minHeightClass="min-h-0"
      onGuess={() => undefined}
    />
  );
}
