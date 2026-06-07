"use client";

import {
  type CharacterConfig,
  SKIN_TONES,
  HAIR_COLORS,
  TOP_COLORS,
  PANTS_COLORS,
  DEFAULT_CHARACTER,
} from "~/types/character";

// ─── Sub-renderers ────────────────────────────────────────────────────────────

// Hair rendered BEHIND head (for long/afro styles)
function HairBack({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 1: // Long — side strands behind head
      return (
        <>
          <rect x="13" y="26" width="10" height="52" rx="5" fill={color} />
          <rect x="57" y="26" width="10" height="52" rx="5" fill={color} />
        </>
      );
    case 2: // Curly/afro — big puff behind
      return <circle cx="40" cy="22" r="30" fill={color} />;
    default:
      return null;
  }
}

// Hair rendered ON TOP of head
function HairFront({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // Short
      return (
        <path
          d="M16,32 Q16,6 40,6 Q64,6 64,32 Q64,18 40,18 Q16,18 16,32"
          fill={color}
        />
      );
    case 1: // Long — top cap only (strands rendered behind)
      return (
        <path
          d="M16,32 Q16,6 40,6 Q64,6 64,32 Q64,18 40,18 Q16,18 16,32"
          fill={color}
        />
      );
    case 2: // Curly — small front tuft
      return (
        <path
          d="M16,32 Q16,6 40,6 Q64,6 64,32 Q64,18 40,18 Q16,18 16,32"
          fill={color}
        />
      );
    case 3: // Ponytail
      return (
        <>
          <path
            d="M16,32 Q16,6 40,6 Q64,6 64,32 Q64,18 40,18 Q16,18 16,32"
            fill={color}
          />
          {/* Tail */}
          <ellipse
            cx="65"
            cy="16"
            rx="12"
            ry="6"
            fill={color}
            transform="rotate(-20 65 16)"
          />
          <ellipse
            cx="74"
            cy="10"
            rx="8"
            ry="5"
            fill={color}
            transform="rotate(-40 74 10)"
          />
        </>
      );
    case 4: // Bald
      return null;
    default:
      return null;
  }
}

// Top/shirt
function Top({
  style,
  color,
  skin,
}: {
  style: number;
  color: string;
  skin: string;
}) {
  switch (style) {
    case 0: // T-shirt
      return (
        <>
          {/* Body */}
          <rect x="24" y="56" width="32" height="30" rx="3" fill={color} />
          {/* Short sleeves */}
          <rect x="10" y="56" width="16" height="13" rx="4" fill={color} />
          <rect x="54" y="56" width="16" height="13" rx="4" fill={color} />
          {/* Forearms (skin) */}
          <rect x="10" y="68" width="16" height="16" rx="4" fill={skin} />
          <rect x="54" y="68" width="16" height="16" rx="4" fill={skin} />
        </>
      );
    case 1: // Hoodie
      return (
        <>
          <rect x="20" y="54" width="40" height="32" rx="5" fill={color} />
          {/* Full sleeves */}
          <rect x="6" y="54" width="16" height="28" rx="5" fill={color} />
          <rect x="58" y="54" width="16" height="28" rx="5" fill={color} />
          {/* Pocket */}
          <rect x="33" y="72" width="14" height="10" rx="3" fill="rgba(0,0,0,0.12)" />
          {/* Hood strings */}
          <line x1="37" y1="56" x2="36" y2="66" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
          <line x1="43" y1="56" x2="44" y2="66" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
        </>
      );
    case 2: // Dress
      return (
        <>
          <path d="M22,56 L58,56 L64,88 L16,88 Z" fill={color} />
          {/* Cap sleeves */}
          <rect x="8" y="56" width="16" height="11" rx="4" fill={color} />
          <rect x="56" y="56" width="16" height="11" rx="4" fill={color} />
          <rect x="8" y="66" width="16" height="18" rx="4" fill={skin} />
          <rect x="56" y="66" width="16" height="18" rx="4" fill={skin} />
          {/* Belt/waist detail */}
          <rect x="22" y="70" width="36" height="5" rx="2" fill="rgba(0,0,0,0.15)" />
        </>
      );
    case 3: // Suit
      return (
        <>
          <rect x="22" y="56" width="36" height="30" rx="3" fill={color} />
          {/* Full sleeves */}
          <rect x="8" y="56" width="16" height="28" rx="4" fill={color} />
          <rect x="56" y="56" width="16" height="28" rx="4" fill={color} />
          {/* Cuffs */}
          <rect x="8" y="80" width="16" height="5" rx="2" fill="white" opacity="0.8" />
          <rect x="56" y="80" width="16" height="5" rx="2" fill="white" opacity="0.8" />
          {/* Lapels */}
          <path d="M36,56 L30,66 L40,61 Z" fill="white" opacity="0.85" />
          <path d="M44,56 L50,66 L40,61 Z" fill="white" opacity="0.85" />
          {/* Tie */}
          <path d="M39,61 L38,80 L40,83 L42,80 L41,61 Z" fill="#C03030" />
        </>
      );
    default:
      return null;
  }
}

// Pants/bottom
function Pants({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // Long pants
      return (
        <>
          <rect x="25" y="84" width="13" height="38" rx="4" fill={color} />
          <rect x="42" y="84" width="13" height="38" rx="4" fill={color} />
        </>
      );
    case 1: // Shorts
      return (
        <>
          <rect x="25" y="84" width="13" height="20" rx="4" fill={color} />
          <rect x="42" y="84" width="13" height="20" rx="4" fill={color} />
        </>
      );
    case 2: // Skirt
      return (
        <path d="M22,84 L58,84 L66,122 L14,122 Z" fill={color} />
      );
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  config?: CharacterConfig;
  /** px width (height auto-proportioned) */
  size?: number;
  /** "full" = full body, "bust" = head+shoulders only (for small avatars) */
  view?: "full" | "bust";
  className?: string;
}

export function CharacterSVG({
  config = DEFAULT_CHARACTER,
  size = 120,
  view = "full",
  className,
}: Props) {
  const skin = SKIN_TONES[config.skinTone] ?? SKIN_TONES[0]!;
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0]!;
  const top = TOP_COLORS[config.topColor] ?? TOP_COLORS[0]!;
  const pants = PANTS_COLORS[config.pantsColor] ?? PANTS_COLORS[0]!;

  // Full body: 0 0 80 128 — bust: crop to head (0 6 80 68)
  const viewBox = view === "bust" ? "0 6 80 62" : "0 0 80 128";
  const aspectRatio = view === "bust" ? 62 / 80 : 128 / 80;

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size * aspectRatio}
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* ── Back layer: long hair strands, afro puff ── */}
      <HairBack style={config.hairStyle} color={hair} />

      {/* ── Pants ── */}
      {view === "full" && <Pants style={config.pantsStyle} color={pants} />}

      {/* ── Top ── */}
      <Top style={config.topStyle} color={top} skin={skin} />

      {/* ── Neck ── */}
      <rect x="35" y="50" width="10" height="8" fill={skin} />

      {/* ── Head ── */}
      <circle cx="40" cy="32" r="24" fill={skin} />

      {/* ── Hair (front) ── */}
      <HairFront style={config.hairStyle} color={hair} />

      {/* ── Eyes ── */}
      <ellipse cx="32" cy="31" rx="4" ry="4.5" fill="#111" />
      <ellipse cx="48" cy="31" rx="4" ry="4.5" fill="#111" />
      {/* Shine */}
      <circle cx="33.5" cy="29" r="1.5" fill="white" />
      <circle cx="49.5" cy="29" r="1.5" fill="white" />

      {/* ── Blush ── */}
      <ellipse cx="25" cy="37" rx="5" ry="3" fill="#FFB0B0" opacity="0.5" />
      <ellipse cx="55" cy="37" rx="5" ry="3" fill="#FFB0B0" opacity="0.5" />

      {/* ── Mouth ── */}
      <path
        d="M35,40 Q40,45 45,40"
        stroke="#CC6666"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
