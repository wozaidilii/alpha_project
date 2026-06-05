/** Timeline range: 公元前 3000 — 公元 2026 */
export const MIN_YEAR = -3000;
export const MAX_YEAR = 2026;
export const MODERN_ANCHOR = 2026;

/** BC era occupies 15% of the slider; AD era gets 85% */
const BC_FRACTION = 0.15;

export function clampYear(year: number): number {
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, Math.round(year)));
}

/** Map year → normalized position [0, 1] on the non-linear axis */
export function yearToPosition(year: number): number {
  const y = clampYear(year);
  if (y <= 0) {
    return ((y - MIN_YEAR) / (0 - MIN_YEAR)) * BC_FRACTION;
  }
  return BC_FRACTION + (y / MAX_YEAR) * (1 - BC_FRACTION);
}

/** Map normalized position [0, 1] → year */
export function positionToYear(position: number): number {
  const p = Math.max(0, Math.min(1, position));
  if (p <= BC_FRACTION) {
    return MIN_YEAR + (p / BC_FRACTION) * (0 - MIN_YEAR);
  }
  return ((p - BC_FRACTION) / (1 - BC_FRACTION)) * MAX_YEAR;
}

const SLIDER_STEPS = 10000;

export function yearToSlider(year: number): number {
  return Math.round(yearToPosition(year) * SLIDER_STEPS);
}

export function sliderToYear(slider: number): number {
  return clampYear(positionToYear(slider / SLIDER_STEPS));
}

/** 线性时间轴（用于 1980–2022 等现代内容区间） */
export function clampYearInRange(
  year: number,
  minYear: number,
  maxYear: number,
): number {
  return Math.max(minYear, Math.min(maxYear, Math.round(year)));
}

export function yearToSliderInRange(
  year: number,
  minYear: number,
  maxYear: number,
): number {
  const y = clampYearInRange(year, minYear, maxYear);
  return Math.round(((y - minYear) / (maxYear - minYear)) * SLIDER_STEPS);
}

export function sliderToYearInRange(
  slider: number,
  minYear: number,
  maxYear: number,
): number {
  const p = Math.max(0, Math.min(SLIDER_STEPS, slider)) / SLIDER_STEPS;
  return clampYearInRange(minYear + p * (maxYear - minYear), minYear, maxYear);
}
