export interface CountryOption {
  code: string;
  label: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "CN", label: "Mainland China" },
  { code: "JP", label: "Japan" },
  { code: "US", label: "United States" },
  { code: "TW", label: "Taiwan" },
  { code: "HK", label: "Hong Kong" },
  { code: "MO", label: "Macau" },
  { code: "KR", label: "South Korea" },
  { code: "SG", label: "Singapore" },
  { code: "MY", label: "Malaysia" },
  { code: "TH", label: "Thailand" },
  { code: "VN", label: "Vietnam" },
  { code: "ID", label: "Indonesia" },
  { code: "PH", label: "Philippines" },
  { code: "IN", label: "India" },
  { code: "PK", label: "Pakistan" },
  { code: "BD", label: "Bangladesh" },
  { code: "NP", label: "Nepal" },
  { code: "LK", label: "Sri Lanka" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "TR", label: "Turkey" },
  { code: "IL", label: "Israel" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "CA", label: "Canada" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "AR", label: "Argentina" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "PE", label: "Peru" },
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czechia" },
  { code: "HU", label: "Hungary" },
  { code: "GR", label: "Greece" },
  { code: "RO", label: "Romania" },
  { code: "UA", label: "Ukraine" },
  { code: "RU", label: "Russia" },
  { code: "ZA", label: "South Africa" },
  { code: "EG", label: "Egypt" },
  { code: "MA", label: "Morocco" },
  { code: "NG", label: "Nigeria" },
  { code: "KE", label: "Kenya" },
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
  if (!normalized) return "No region set";
  return (
    COUNTRY_OPTIONS.find((country) => country.code === normalized)?.label ??
    normalized
  );
}
