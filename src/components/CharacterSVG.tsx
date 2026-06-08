"use client";

import { useId } from "react";
import {
  type CharacterConfig,
  DEFAULT_CHARACTER,
  HAIR_COLORS,
  PANTS_COLORS,
  SKIN_TONES,
  TOP_COLORS,
} from "~/types/character";
import { shadeColor } from "~/lib/color-utils";

const INK = "#2f2432";

interface Props {
  config?: CharacterConfig;
  size?: number;
  view?: "full" | "bust";
  className?: string;
}

function stroke(fill: string, width = 2) {
  return {
    fill,
    stroke: INK,
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HairBack({ style, color }: { style: number; color: string }) {
  const dark = shadeColor(color, -0.18);

  if (style === 1) {
    return (
      <path
        d="M34 30 C14 44 14 96 26 134 C40 146 80 146 94 134 C106 96 106 44 86 30 Z"
        {...stroke(dark)}
      />
    );
  }

  if (style === 2) {
    return (
      <>
        <path
          d="M30 34 C10 46 14 72 28 78 C14 96 24 122 44 118 C52 132 82 132 90 116 C108 116 116 88 100 76 C116 62 104 38 86 34 Z"
          {...stroke(dark)}
        />
        <circle cx="34" cy="48" r="16" fill={color} opacity="0.75" />
        <circle cx="86" cy="48" r="16" fill={color} opacity="0.75" />
      </>
    );
  }

  if (style === 3) {
    return (
      <>
        <path
          d="M28 34 C18 58 20 108 40 130 L48 86 C40 66 42 46 52 30 Z"
          {...stroke(dark)}
        />
        <path
          d="M82 30 C112 26 124 54 104 70 C118 86 106 108 88 96 C98 72 98 48 82 30 Z"
          {...stroke(dark)}
        />
      </>
    );
  }

  if (style === 4) {
    return (
      <path
        d="M30 34 C18 54 20 96 34 114 C46 124 74 124 86 114 C100 96 102 54 90 34 Z"
        {...stroke(dark)}
      />
    );
  }

  return (
    <path
      d="M26 36 C18 56 22 88 34 102 C48 116 72 116 86 102 C98 88 102 56 94 36 Z"
      {...stroke(dark)}
    />
  );
}

function HairFront({ style, color }: { style: number; color: string }) {
  const light = shadeColor(color, 0.18);
  const dark = shadeColor(color, -0.14);

  if (style === 4) {
    return (
      <path
        d="M28 36 C34 18 48 12 60 12 C76 12 88 22 94 38 C82 30 48 28 28 36 Z"
        {...stroke(color)}
      />
    );
  }

  const sideLocks =
    style === 1 ? (
      <>
        <path d="M28 38 C14 56 18 90 30 112" {...stroke(color)} />
        <path d="M92 38 C106 56 102 90 90 112" {...stroke(color)} />
      </>
    ) : null;

  const ponytail =
    style === 3 ? (
      <>
        <path
          d="M84 28 C112 18 130 42 110 62 C96 76 82 56 82 42 Z"
          {...stroke(color)}
        />
        <path
          d="M82 26 C88 20 96 20 102 26"
          fill="none"
          stroke="#f9a8d4"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </>
    ) : null;

  return (
    <>
      {sideLocks}
      {ponytail}
      <path
        d="M24 42 C24 18 42 6 60 6 C80 6 98 18 96 42 C86 28 76 24 60 24 C44 24 34 28 24 42 Z"
        {...stroke(color)}
      />
      <path
        d="M26 40 C34 22 44 16 60 16"
        fill="none"
        stroke={light}
        strokeWidth="4"
      />
      <path
        d="M40 20 C36 36 28 42 20 48"
        fill="none"
        stroke={dark}
        strokeWidth="3"
      />
      <path
        d="M56 19 C54 38 44 48 34 54"
        fill="none"
        stroke={dark}
        strokeWidth="3"
      />
      <path
        d="M70 20 C72 38 80 48 92 54"
        fill="none"
        stroke={dark}
        strokeWidth="3"
      />
      {style === 2 && (
        <>
          <circle cx="34" cy="22" r="8" fill={light} opacity="0.45" />
          <circle cx="82" cy="22" r="8" fill={light} opacity="0.45" />
        </>
      )}
    </>
  );
}

function Eyes({ color }: { color: string }) {
  const iris = shadeColor(color, 0.05);
  const irisDark = shadeColor(color, -0.35);

  return (
    <>
      <path
        d="M35 48 C42 38 52 40 56 49 C52 60 40 60 35 48 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M64 49 C68 40 78 38 85 48 C80 60 68 60 64 49 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth="2"
      />
      <ellipse cx="47" cy="49" rx="7" ry="9" fill={irisDark} />
      <ellipse cx="73" cy="49" rx="7" ry="9" fill={irisDark} />
      <ellipse cx="47" cy="47" rx="4" ry="6" fill={iris} />
      <ellipse cx="73" cy="47" rx="4" ry="6" fill={iris} />
      <circle cx="44" cy="44" r="2.8" fill="#fff" />
      <circle cx="70" cy="44" r="2.8" fill="#fff" />
      <circle cx="50" cy="53" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="76" cy="53" r="1.5" fill="#fff" opacity="0.8" />
      <path
        d="M33 42 C42 34 51 35 58 42"
        fill="none"
        stroke={INK}
        strokeWidth="3"
      />
      <path
        d="M62 42 C69 35 78 34 87 42"
        fill="none"
        stroke={INK}
        strokeWidth="3"
      />
    </>
  );
}

function Face({ skin, hairColor }: { skin: string; hairColor: string }) {
  return (
    <>
      <ellipse cx="26" cy="58" rx="7" ry="8" {...stroke(skin)} />
      <ellipse
        cx="94"
        cy="58"
        rx="7"
        ry="8"
        {...stroke(shadeColor(skin, -0.05))}
      />
      <path
        d="M60 16 C38 16 26 34 28 58 C30 82 44 96 60 96 C76 96 90 82 92 58 C94 34 82 16 60 16 Z"
        {...stroke(skin)}
      />
      <Eyes color={hairColor} />
      <ellipse cx="39" cy="66" rx="8" ry="4" fill="#fb7185" opacity="0.48" />
      <ellipse cx="81" cy="66" rx="8" ry="4" fill="#fb7185" opacity="0.48" />
      <path
        d="M60 58 L57 66 L62 66"
        fill={shadeColor(skin, -0.15)}
        opacity="0.45"
      />
      <path
        d="M52 76 Q60 82 68 76"
        fill="none"
        stroke="#be5367"
        strokeWidth="2.2"
      />
    </>
  );
}

function Outfit({
  style,
  color,
  accent,
  skin,
}: {
  style: number;
  color: string;
  accent: string;
  skin: string;
}) {
  const dark = shadeColor(color, -0.22);
  const light = shadeColor(color, 0.14);

  const sleeves = (
    <>
      <path
        d="M30 118 C16 128 16 154 26 170 L38 164 C34 150 34 132 42 122 Z"
        {...stroke(color)}
      />
      <path
        d="M90 118 C104 128 104 154 94 170 L82 164 C86 150 86 132 78 122 Z"
        {...stroke(color)}
      />
      <ellipse cx="26" cy="172" rx="7" ry="8" {...stroke(skin)} />
      <ellipse cx="94" cy="172" rx="7" ry="8" {...stroke(skin)} />
    </>
  );

  if (style === 1) {
    return (
      <>
        {sleeves}
        <path d="M36 116 L84 116 L92 186 L28 186 Z" {...stroke(color)} />
        <path
          d="M42 116 L60 136 L78 116"
          fill="#f8fafc"
          stroke={INK}
          strokeWidth="1.6"
        />
        <path
          d="M56 135 L52 166 L60 180 L68 166 L64 135 Z"
          fill={accent}
          stroke={INK}
          strokeWidth="1.6"
        />
        <path d="M34 146 H86" stroke={dark} strokeWidth="3" opacity="0.35" />
      </>
    );
  }

  if (style === 2) {
    return (
      <>
        {sleeves}
        <path d="M34 116 L86 116 L104 202 L16 202 Z" {...stroke(color)} />
        <path
          d="M42 118 L60 144 L78 118"
          fill={light}
          stroke={INK}
          strokeWidth="1.6"
        />
        <path
          d="M30 160 C46 170 74 170 90 160"
          fill="none"
          stroke={dark}
          strokeWidth="3"
          opacity="0.45"
        />
      </>
    );
  }

  if (style === 3) {
    return (
      <>
        {sleeves}
        <path d="M34 116 L86 116 L92 190 L28 190 Z" {...stroke(color)} />
        <path
          d="M38 120 C50 132 70 132 82 120"
          fill="none"
          stroke={light}
          strokeWidth="5"
        />
        <circle
          cx="60"
          cy="144"
          r="4"
          fill={accent}
          stroke={INK}
          strokeWidth="1.4"
        />
        <path d="M42 154 H78" stroke={dark} strokeWidth="3" opacity="0.4" />
      </>
    );
  }

  return (
    <>
      {sleeves}
      <path d="M34 116 L86 116 L90 190 L30 190 Z" {...stroke(color)} />
      <path
        d="M42 116 L60 132 L78 116"
        fill="#f8fafc"
        stroke={INK}
        strokeWidth="1.6"
      />
      <path
        d="M52 132 L60 142 L68 132 L66 162 L54 162 Z"
        fill={accent}
        stroke={INK}
        strokeWidth="1.4"
      />
      <path
        d="M36 166 C50 172 70 172 84 166"
        fill="none"
        stroke={dark}
        strokeWidth="3"
        opacity="0.35"
      />
    </>
  );
}

function Accessory({
  style,
  color,
  accent,
}: {
  style: number;
  color: string;
  accent: string;
}) {
  if (style === 1) {
    return (
      <g className="live2d-accessory">
        <path d="M26 18 L14 2 L38 12 Z" {...stroke(color, 1.6)} />
        <path d="M94 18 L106 2 L82 12 Z" {...stroke(color, 1.6)} />
      </g>
    );
  }

  if (style === 2) {
    return (
      <>
        <path
          d="M40 18 C48 6 72 6 80 18"
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="40"
          cy="18"
          r="5"
          fill={color}
          stroke={INK}
          strokeWidth="1.5"
        />
        <circle
          cx="80"
          cy="18"
          r="5"
          fill={color}
          stroke={INK}
          strokeWidth="1.5"
        />
      </>
    );
  }

  return (
    <g className="live2d-accessory">
      <path d="M78 24 L94 18 L92 36 Z" {...stroke(color, 1.6)} />
      <circle
        cx="78"
        cy="24"
        r="4"
        fill={accent}
        stroke={INK}
        strokeWidth="1.4"
      />
    </g>
  );
}

export function CharacterSVG({
  config = DEFAULT_CHARACTER,
  size = 120,
  view = "full",
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const skin = SKIN_TONES[config.skinTone] ?? SKIN_TONES[0]!;
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0]!;
  const outfit = TOP_COLORS[config.topColor] ?? TOP_COLORS[0]!;
  const accent = PANTS_COLORS[config.pantsColor] ?? PANTS_COLORS[0]!;
  const viewBox = view === "bust" ? "0 0 120 122" : "0 0 120 224";
  const heightRatio = view === "bust" ? 122 / 120 : 224 / 120;

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size * heightRatio}
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`aura-${uid}`} cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shine-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <style>
          {`
            .live2d-core { transform-origin: 60px 118px; animation: live2dFloat-${uid} 4.8s ease-in-out infinite; }
            .live2d-hair { transform-origin: 60px 28px; animation: live2dHair-${uid} 3.8s ease-in-out infinite; }
            .live2d-accessory { transform-origin: 70px 22px; animation: live2dAccessory-${uid} 3.4s ease-in-out infinite; }
            @keyframes live2dFloat-${uid} { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.4px); } }
            @keyframes live2dHair-${uid} { 0%,100% { transform: rotate(-0.6deg); } 50% { transform: rotate(0.9deg); } }
            @keyframes live2dAccessory-${uid} { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(1.2deg); } }
          `}
        </style>
      </defs>

      <rect
        x="-12"
        y="-10"
        width="144"
        height="244"
        rx="36"
        fill={`url(#aura-${uid})`}
        opacity="0.85"
      />
      {view === "full" && (
        <ellipse cx="60" cy="214" rx="36" ry="8" fill="#000" opacity="0.22" />
      )}

      <g className="live2d-core">
        <g className="live2d-hair">
          <HairBack style={config.hairStyle} color={hair} />
        </g>

        {view === "full" && (
          <>
            <path
              d="M46 184 L58 184 L56 212 L42 212 Z"
              {...stroke(shadeColor(outfit, -0.18))}
            />
            <path
              d="M62 184 L74 184 L78 212 L64 212 Z"
              {...stroke(shadeColor(outfit, -0.22))}
            />
            <path
              d="M38 210 H58 V218 H34 C34 214 36 212 38 210 Z"
              {...stroke("#f8fafc", 1.6)}
            />
            <path
              d="M64 210 H84 C88 212 90 214 90 218 H64 Z"
              {...stroke("#f8fafc", 1.6)}
            />
            <Outfit
              style={config.topStyle}
              color={outfit}
              accent={accent}
              skin={skin}
            />
          </>
        )}

        {view === "bust" && (
          <path d="M34 106 L86 106 L92 132 L28 132 Z" {...stroke(outfit)} />
        )}

        <path d="M52 94 H68 V116 H52 Z" {...stroke(shadeColor(skin, -0.04))} />
        <Face skin={skin} hairColor={hair} />
        <g className="live2d-hair">
          <HairFront style={config.hairStyle} color={hair} />
        </g>
        <Accessory
          style={config.pantsStyle}
          color={accent}
          accent={shadeColor(outfit, 0.18)}
        />
      </g>

      <rect
        x="0"
        y="0"
        width="120"
        height="224"
        fill={`url(#shine-${uid})`}
        pointerEvents="none"
      />
    </svg>
  );
}
