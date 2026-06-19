export interface CountryOption {
  code: string;
  label: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "CN", label: "中国大陆" },
  { code: "JP", label: "日本" },
  { code: "US", label: "美国" },
  { code: "TW", label: "中国台湾" },
  { code: "HK", label: "中国香港" },
  { code: "KR", label: "韩国" },
  { code: "SG", label: "新加坡" },
  { code: "MY", label: "马来西亚" },
  { code: "TH", label: "泰国" },
  { code: "VN", label: "越南" },
  { code: "ID", label: "印度尼西亚" },
  { code: "PH", label: "菲律宾" },
  { code: "CA", label: "加拿大" },
  { code: "GB", label: "英国" },
  { code: "AU", label: "澳大利亚" },
  { code: "DE", label: "德国" },
  { code: "FR", label: "法国" },
];

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function countryCodeToFlagEmoji(code: string | null | undefined) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "🏳️";

  return [...normalized]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function countryCodeToLabel(code: string | null | undefined) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "未设置地区";
  return (
    COUNTRY_OPTIONS.find((country) => country.code === normalized)?.label ??
    normalized
  );
}
