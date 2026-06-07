"use client";

import {
  AVATAR_COLORS,
  AVATAR_ICONS,
  type PlayerAvatar,
} from "~/types/player";

const ICON_LABELS: Record<string, string> = {
  "🧭": "罗盘",
  "🏯": "城楼",
  "⚔️": "宝剑",
  "🗺️": "地图",
  "🏛️": "殿堂",
  "⛵": "帆船",
  "📜": "卷轴",
  "🛡️": "盾牌",
  "🏺": "古罐",
  "📚": "典籍",
};

interface Props {
  avatar: PlayerAvatar;
  onChange: (avatar: PlayerAvatar) => void;
}

export function AvatarPicker({ avatar, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-stone-700/70 bg-gradient-to-r from-stone-900 to-stone-800 p-4">
        <div
          className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-4xl shadow-lg ring-2 ring-amber-400/40"
          style={{
            backgroundColor: avatar.color,
            boxShadow: `0 12px 30px ${avatar.color}55`,
          }}
        >
          {avatar.icon}
          <span className="absolute -bottom-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
            徽章
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-200">档案徽章</p>
          <p className="mt-1 text-xs text-stone-500">
            用于个人档案与对战房间显示，不影响首页 3D 小人
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-stone-300">选择徽章图案</p>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_ICONS.map((icon) => {
            const active = avatar.icon === icon;
            return (
              <button
                key={icon}
                type="button"
                onClick={() => onChange({ ...avatar, icon })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition ${
                  active
                    ? "border-amber-400 bg-amber-500/15"
                    : "border-stone-700 bg-stone-800/70 hover:border-stone-600 hover:bg-stone-800"
                }`}
                aria-label={`选择 ${ICON_LABELS[icon] ?? icon}`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-[10px] text-stone-500">
                  {ICON_LABELS[icon]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-stone-300">选择徽章底色</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AVATAR_COLORS.map((color) => {
            const active = avatar.color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...avatar, color })}
                className={`relative h-11 rounded-xl transition hover:scale-105 ${
                  active ? "ring-2 ring-white ring-offset-2 ring-offset-stone-900" : ""
                }`}
                style={{ backgroundColor: color }}
                aria-label={`选择颜色 ${color}`}
              >
                {active && (
                  <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white drop-shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
