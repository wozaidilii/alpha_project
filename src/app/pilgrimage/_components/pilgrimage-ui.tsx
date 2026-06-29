import Link from "next/link";
import { headers } from "next/headers";
import {
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  withAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";
import { getPilgrimageCopy } from "~/lib/pilgrimage-copy";

export async function getPilgrimageRequestLocale(): Promise<AnimeLocale> {
  const headerList = await headers();
  const headerLocale = headerList.get("x-anime-locale");
  return isAnimeLocale(headerLocale) ? headerLocale : DEFAULT_ANIME_LOCALE;
}

export function PilgrimageShell({
  locale,
  kicker,
  title,
  description,
  children,
}: {
  locale: AnimeLocale;
  kicker: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const copy = getPilgrimageCopy(locale);
  const homeUrl = withAnimeLocale("/", locale);
  const hubUrl = withAnimeLocale("/pilgrimage", locale);
  const playUrl = withAnimeLocale("/game/anime", locale);

  return (
    <main className="anime-shell min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={homeUrl}
              className="font-black tracking-[0.14em] text-pink-100 uppercase"
            >
              AniGuessr
            </Link>
            <span className="text-white/20">/</span>
            <Link href={hubUrl} className="font-bold text-cyan-100/80 hover:text-cyan-50">
              {copy.siteKicker}
            </Link>
          </div>
          <Link
            href={playUrl}
            className="anime-button px-4 py-2 text-xs"
          >
            {copy.playGame}
          </Link>
        </nav>

        <header className="mb-8 max-w-3xl">
          <div className="anime-chip mb-4 w-fit">{kicker}</div>
          <h1 className="text-3xl leading-tight font-black text-white sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-7 text-pink-50/75 sm:text-lg">
              {description}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </main>
  );
}

export function PilgrimageCardGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

export function PilgrimageCard({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="anime-panel block p-4 transition hover:border-pink-200/40 hover:bg-white/10"
    >
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-pink-100/65">{meta}</p>
    </Link>
  );
}

export function PilgrimageSpotList({
  locale,
  spots,
}: {
  locale: AnimeLocale;
  spots: Array<{
    id: string;
    href: string;
    title: string;
    subtitle: string;
  }>;
}) {
  const copy = getPilgrimageCopy(locale);
  if (spots.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-pink-100/60">
        {copy.emptyIndex}
      </p>
    );
  }

  return (
    <ol className="grid gap-2">
      {spots.map((spot) => (
        <li key={spot.id}>
          <Link
            href={spot.href}
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-200/30 hover:bg-white/10"
          >
            <span className="block font-bold text-white">{spot.title}</span>
            <span className="mt-1 block text-sm text-pink-100/65">
              {spot.subtitle}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
