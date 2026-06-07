/** 将 #RRGGBB 调亮或调暗，amount 为正变亮、为负变暗 */
export function shadeColor(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  const adjust = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + amount * 255)));

  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
