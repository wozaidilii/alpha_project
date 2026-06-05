// Haversine formula — distance in km between two lat/lng points
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Max distance score: 5000. Score decays with distance.
// Full score within ~25km, zero at ~15000km
export function locationScore(distanceKm: number): number {
  return Math.round(5000 * Math.exp(-distanceKm / 2000));
}

// Max year score: 5000. Score decays with year difference.
// Full score at exact year, zero beyond ~500 years
export function yearScore(actualYear: number, guessedYear: number): number {
  const diff = Math.abs(actualYear - guessedYear);
  return Math.round(5000 * Math.exp(-diff / 100));
}

export function totalScore(locationPts: number, yearPts: number): number {
  return locationPts + yearPts;
}

/**
 * Speed multiplier: 2.0x if submitted instantly, 1.0x at time limit.
 * @param roundStartTime  Date.now() when round began
 * @param submittedAt     Date.now() when player submitted
 * @param timePerRound    Seconds allowed per round
 */
export function calcSpeedMultiplier(
  roundStartTime: number,
  submittedAt: number,
  timePerRound: number,
): number {
  const elapsedSec = Math.max(0, (submittedAt - roundStartTime) / 1000);
  const ratio = Math.min(1, elapsedSec / timePerRound); // 0 = instant, 1 = deadline
  // 2x instant → 1x deadline, never below 1
  return Math.max(1, 2 - ratio);
}

export function formatYear(year: number): string {
  if (year < 0) return `公元前 ${Math.abs(year)} 年`;
  return `公元 ${year} 年`;
}
