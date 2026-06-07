"use client";

import { useId } from "react";
import {
  type CharacterConfig,
  SKIN_TONES,
  HAIR_COLORS,
  TOP_COLORS,
  PANTS_COLORS,
  DEFAULT_CHARACTER,
} from "~/types/character";
import { shadeColor } from "~/lib/color-utils";

const OUTLINE = "#3A2F28";
const STROKE = 2;

type SvgShapeProps = {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
};

function shapeStroke(props: SvgShapeProps) {
  return {
    fill: props.fill,
    stroke: props.stroke ?? OUTLINE,
    strokeWidth: props.strokeWidth ?? STROKE,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
}

function HairBack({ style, color }: { style: number; color: string }) {
  const dark = shadeColor(color, -0.22);
  const s = shapeStroke;

  switch (style) {
    case 1:
      return (
        <>
          <path
            d="M10,34 C8,58 10,88 18,108 C22,86 24,58 28,36 Z"
            {...s({ fill: dark })}
          />
          <path
            d="M70,34 C72,58 70,88 62,108 C58,86 56,58 52,36 Z"
            {...s({ fill: dark })}
          />
        </>
      );
    case 2:
      return (
        <>
          <circle cx="40" cy="18" r="33" {...s({ fill: dark })} />
          <circle cx="26" cy="16" r="20" fill={color} stroke={OUTLINE} strokeWidth={STROKE} />
          <circle cx="54" cy="16" r="20" fill={color} stroke={OUTLINE} strokeWidth={STROKE} />
        </>
      );
    case 3:
      return (
        <path
          d="M66,22 C80,10 88,26 82,40 C76,52 68,44 64,32 Z"
          {...s({ fill: dark })}
        />
      );
    default:
      return null;
  }
}

function HairFront({ style, color }: { style: number; color: string }) {
  const dark = shadeColor(color, -0.18);
  const light = shadeColor(color, 0.14);
  const s = shapeStroke;

  switch (style) {
    case 0:
      return (
        <>
          <path
            d="M12,38 C10,8 24,0 40,0 C56,0 70,8 68,38 C68,24 56,14 40,14 C24,14 12,24 12,38 Z"
            {...s({ fill: color })}
          />
          <path d="M16,32 C20,18 30,12 40,12 C50,12 58,18 62,30" fill="none" stroke={light} strokeWidth="3" strokeLinecap="round" />
          <path d="M20,34 C26,28 34,26 40,26 C46,26 52,28 58,34" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 1:
      return (
        <path
          d="M12,38 C10,8 24,0 40,0 C56,0 70,8 68,38 C68,24 56,14 40,14 C24,14 12,24 12,38 Z"
          {...s({ fill: color })}
        />
      );
    case 2:
      return (
        <>
          <path
            d="M12,38 C10,4 24,-4 40,-4 C56,-4 70,4 68,38 C68,22 56,12 40,12 C24,12 12,22 12,38 Z"
            {...s({ fill: color })}
          />
          <circle cx="22" cy="14" r="8" fill={light} opacity="0.45" />
          <circle cx="58" cy="14" r="8" fill={light} opacity="0.45" />
        </>
      );
    case 3:
      return (
        <>
          <path
            d="M12,38 C10,8 24,0 40,0 C56,0 70,8 68,38 C68,24 56,14 40,14 C24,14 12,24 12,38 Z"
            {...s({ fill: color })}
          />
          <path
            d="M64,26 C76,14 86,20 82,36 C78,48 70,42 66,34 Z"
            {...s({ fill: color })}
          />
          <circle cx="56" cy="8" r="4" fill="#F472B6" stroke={OUTLINE} strokeWidth="1.5" />
        </>
      );
    case 4:
      return null;
    default:
      return null;
  }
}

function Hands({ skin, topStyle }: { skin: string; topStyle: number }) {
  const s = shapeStroke;
  const handY = topStyle === 3 ? 90 : 88;

  return (
    <>
      <ellipse cx="11" cy={handY} rx="6" ry="7" {...s({ fill: skin })} />
      <ellipse cx="69" cy={handY} rx="6" ry="7" {...s({ fill: shadeColor(skin, -0.06) })} />
    </>
  );
}

function Top({
  style,
  color,
  skin,
}: {
  style: number;
  color: string;
  skin: string;
}) {
  const dark = shadeColor(color, -0.22);
  const light = shadeColor(color, 0.12);
  const s = shapeStroke;

  switch (style) {
    case 0:
      return (
        <>
          <path d="M22,62 L58,62 L56,94 L24,94 Z" {...s({ fill: color })} />
          <path d="M22,62 L30,94 L24,94 Z" fill={dark} stroke={OUTLINE} strokeWidth="1.5" />
          <path d="M34,62 L40,72 L46,62" fill={light} stroke={OUTLINE} strokeWidth="1.2" />
          <rect x="6" y="62" width="18" height="16" rx="6" {...s({ fill: color })} />
          <rect x="56" y="62" width="18" height="16" rx="6" {...s({ fill: color })} />
          <rect x="6" y="76" width="16" height="16" rx="6" fill={skin} stroke={OUTLINE} strokeWidth={STROKE} />
          <rect x="58" y="76" width="16" height="16" rx="6" fill={shadeColor(skin, -0.06)} stroke={OUTLINE} strokeWidth={STROKE} />
        </>
      );
    case 1:
      return (
        <>
          <path d="M18,60 L62,60 L58,98 L22,98 Z" {...s({ fill: color })} />
          <path d="M18,60 L26,98 L22,98 Z" fill={dark} stroke={OUTLINE} strokeWidth="1.5" />
          <rect x="2" y="60" width="18" height="32" rx="7" {...s({ fill: color })} />
          <rect x="60" y="60" width="18" height="32" rx="7" {...s({ fill: color })} />
          <rect x="30" y="78" width="20" height="12" rx="4" fill={dark} opacity="0.25" stroke={OUTLINE} strokeWidth="1.2" />
          <line x1="40" y1="62" x2="40" y2="76" stroke={dark} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="78" r="2" fill="#CBD5E1" stroke={OUTLINE} strokeWidth="1" />
        </>
      );
    case 2:
      return (
        <>
          <path d="M16,62 L64,62 L72,104 L8,104 Z" {...s({ fill: color })} />
          <path d="M16,62 L24,104 L8,104 Z" fill={dark} stroke={OUTLINE} strokeWidth="1.5" />
          <path d="M20,62 L40,76 L60,62" fill={light} opacity="0.55" stroke={OUTLINE} strokeWidth="1.2" />
          <rect x="2" y="62" width="18" height="14" rx="6" {...s({ fill: color })} />
          <rect x="60" y="62" width="18" height="14" rx="6" {...s({ fill: color })} />
          <rect x="2" y="74" width="16" height="22" rx="6" fill={skin} stroke={OUTLINE} strokeWidth={STROKE} />
          <rect x="62" y="74" width="16" height="22" rx="6" fill={shadeColor(skin, -0.06)} stroke={OUTLINE} strokeWidth={STROKE} />
        </>
      );
    case 3:
      return (
        <>
          <path d="M20,62 L60,62 L58,96 L22,96 Z" {...s({ fill: color })} />
          <rect x="4" y="62" width="18" height="30" rx="6" {...s({ fill: color })} />
          <rect x="58" y="62" width="18" height="30" rx="6" {...s({ fill: color })} />
          <path d="M34,62 L28,76 L40,70 Z" fill="#F8FAFC" stroke={OUTLINE} strokeWidth="1.2" />
          <path d="M46,62 L52,76 L40,70 Z" fill="#F8FAFC" stroke={OUTLINE} strokeWidth="1.2" />
          <path d="M38,70 L37,90 L40,94 L43,90 L42,70 Z" fill="#DC2626" stroke={OUTLINE} strokeWidth="1.2" />
          <rect x="4" y="88" width="18" height="5" rx="2" fill="#F8FAFC" stroke={OUTLINE} strokeWidth="1" />
          <rect x="58" y="88" width="18" height="5" rx="2" fill="#F8FAFC" stroke={OUTLINE} strokeWidth="1" />
        </>
      );
    default:
      return null;
  }
}

function Pants({ style, color }: { style: number; color: string }) {
  const dark = shadeColor(color, -0.22);
  const s = shapeStroke;

  switch (style) {
    case 0:
      return (
        <>
          <rect x="24" y="92" width="14" height="34" rx="6" {...s({ fill: color })} />
          <rect x="42" y="92" width="14" height="34" rx="6" {...s({ fill: color })} />
          <rect x="22" y="90" width="36" height="6" rx="3" fill={dark} stroke={OUTLINE} strokeWidth="1.5" />
        </>
      );
    case 1:
      return (
        <>
          <rect x="24" y="92" width="14" height="20" rx="6" {...s({ fill: color })} />
          <rect x="42" y="92" width="14" height="20" rx="6" {...s({ fill: color })} />
          <rect x="22" y="90" width="36" height="5" rx="2" fill={dark} stroke={OUTLINE} strokeWidth="1.5" />
        </>
      );
    case 2:
      return (
        <path
          d="M16,92 L64,92 L74,132 L6,132 Z"
          {...s({ fill: color })}
        />
      );
    default:
      return null;
  }
}

function Shoes({ color }: { color: string }) {
  const upper = shadeColor(color, -0.35);
  const sole = "#F5F5F4";
  const s = shapeStroke;

  return (
    <>
      <rect x="20" y="124" width="18" height="10" rx="5" {...s({ fill: upper })} />
      <rect x="42" y="124" width="18" height="10" rx="5" {...s({ fill: upper })} />
      <rect x="18" y="130" width="22" height="5" rx="2.5" fill={sole} stroke={OUTLINE} strokeWidth="1.5" />
      <rect x="40" y="130" width="22" height="5" rx="2.5" fill={sole} stroke={OUTLINE} strokeWidth="1.5" />
      <line x1="24" y1="127" x2="34" y2="127" stroke="#E7E5E4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="127" x2="56" y2="127" stroke="#E7E5E4" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Face({
  skin,
  skinGradId,
}: {
  skin: string;
  skinGradId: string;
}) {
  const skinDark = shadeColor(skin, -0.14);
  const skinLight = shadeColor(skin, 0.08);

  return (
    <>
      <ellipse
        cx="40"
        cy="34"
        rx="27"
        ry="29"
        fill={`url(#${skinGradId})`}
        stroke={OUTLINE}
        strokeWidth={STROKE}
      />

      <ellipse cx="14" cy="36" rx="5" ry="6.5" fill={skin} stroke={OUTLINE} strokeWidth={STROKE} />
      <ellipse cx="66" cy="36" rx="5" ry="6.5" fill={skin} stroke={OUTLINE} strokeWidth={STROKE} />

      <path d="M24,22 C28,18 34,18 38,22" fill="none" stroke={skinDark} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42,22 C46,18 52,18 56,22" fill="none" stroke={skinDark} strokeWidth="2.5" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="29" cy="32" rx="7" ry="8" fill="white" stroke={OUTLINE} strokeWidth="1.8" />
      <ellipse cx="51" cy="32" rx="7" ry="8" fill="white" stroke={OUTLINE} strokeWidth="1.8" />
      <circle cx="30" cy="33" r="4.5" fill="#4C3D56" />
      <circle cx="52" cy="33" r="4.5" fill="#4C3D56" />
      <circle cx="31.5" cy="31" r="2" fill="white" />
      <circle cx="53.5" cy="31" r="2" fill="white" />
      <path d="M23,28 C27,24 33,24 37,28" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <path d="M43,28 C47,24 53,24 57,28" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />

      <ellipse cx="22" cy="40" rx="6" ry="3.5" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="58" cy="40" rx="6" ry="3.5" fill="#FF8FA3" opacity="0.55" />

      <path d="M40,38 L38,42 L42,42 Z" fill={skinDark} opacity="0.5" />
      <path
        d="M32,46 Q40,52 48,46"
        fill="#E87088"
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M34,46 Q40,49 46,46"
        fill="none"
        stroke={skinLight}
        strokeWidth="1"
        opacity="0.6"
      />
    </>
  );
}

interface Props {
  config?: CharacterConfig;
  size?: number;
  view?: "full" | "bust";
  className?: string;
}

const VIEW_HEIGHT = 140;

export function CharacterSVG({
  config = DEFAULT_CHARACTER,
  size = 120,
  view = "full",
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const skinGradId = `skin-${uid}`;
  const glowGradId = `glow-${uid}`;

  const skin = SKIN_TONES[config.skinTone] ?? SKIN_TONES[0]!;
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0]!;
  const top = TOP_COLORS[config.topColor] ?? TOP_COLORS[0]!;
  const pants = PANTS_COLORS[config.pantsColor] ?? PANTS_COLORS[0]!;

  const viewBox = view === "bust" ? "0 0 80 72" : `0 0 80 ${VIEW_HEIGHT}`;
  const aspectRatio = view === "bust" ? 72 / 80 : VIEW_HEIGHT / 80;

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size * aspectRatio}
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={skinGradId} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor={shadeColor(skin, 0.1)} />
          <stop offset="100%" stopColor={skin} />
        </radialGradient>
        <radialGradient id={glowGradId} cx="50%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {view === "full" && (
        <ellipse cx="40" cy="136" rx="24" ry="5" fill="#000000" opacity="0.2" />
      )}

      <HairBack style={config.hairStyle} color={hair} />

      {view === "full" && config.topStyle !== 2 && (
        <Pants style={config.pantsStyle} color={pants} />
      )}
      {view === "full" && (
        <Shoes color={config.topStyle === 2 ? top : pants} />
      )}

      <Top style={config.topStyle} color={top} skin={skin} />
      <Hands skin={skin} topStyle={config.topStyle} />

      <rect
        x="34"
        y="54"
        width="12"
        height="10"
        rx="4"
        fill={shadeColor(skin, -0.05)}
        stroke={OUTLINE}
        strokeWidth={STROKE}
      />

      <Face skin={skin} skinGradId={skinGradId} />
      <HairFront style={config.hairStyle} color={hair} />

      <rect
        x="0"
        y="0"
        width="80"
        height={VIEW_HEIGHT}
        fill={`url(#${glowGradId})`}
        pointerEvents="none"
      />
    </svg>
  );
}
