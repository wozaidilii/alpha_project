import { redirect } from "next/navigation";
import { BattleGame } from "./_components/BattleGame";
import { DEFAULT_AVATAR, normalizeAvatar } from "~/types/player";
import { getGameMode, isBattleGameModeSlug } from "~/lib/game-mode";
import {
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  withAnimeLocale,
} from "~/lib/anime-locale";

interface Props {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string>>;
}

function clampNumber(
  value: string | undefined,
  fallback: number,
  bounds: {
    min: number;
    max: number;
  },
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(parsed)));
}

export default async function BattleRoomPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const sp = await searchParams;
  const locale = isAnimeLocale(sp.lang) ? sp.lang : DEFAULT_ANIME_LOCALE;

  if (!sp.userId || !sp.name) {
    redirect(
      withAnimeLocale(
        `/login?next=${encodeURIComponent(withAnimeLocale("/battle", locale))}`,
        locale,
      ),
    );
  }

  const isHost = sp.host === "1";
  const avatar = normalizeAvatar({
    icon: sp.avatarIcon ?? DEFAULT_AVATAR.icon,
    color: sp.avatarColor ?? DEFAULT_AVATAR.color,
  });
  const modeSlug = isBattleGameModeSlug(sp.mode ?? "")
    ? sp.mode!
    : "anime";
  const gameMode = getGameMode(modeSlug);
  const settings = isHost
    ? {
        rounds: clampNumber(sp.rounds, 5, { min: 1, max: 10 }),
        timePerRound: clampNumber(sp.time, 120, { min: 60, max: 180 }),
        startingHp: clampNumber(sp.hp, 100, { min: 20, max: 300 }),
        questionType: gameMode?.type ?? "anime",
      }
    : null;

  return (
    <BattleGame
      roomId={roomId}
      isHost={isHost}
      playerName={sp.name}
      playerUserId={sp.userId}
      playerAvatar={avatar}
      hostSettings={settings}
      locale={locale}
    />
  );
}
