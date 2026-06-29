import { type Metadata } from "next";
import Link from "next/link";
import { type AnimeLocale, withAnimeLocale } from "~/lib/anime-locale";
import { getPilgrimageCopy } from "~/lib/pilgrimage-copy";
import { localeAlternates } from "~/lib/seo";
import { getPilgrimageSeoIndex } from "~/server/data/pilgrimage-seo";
import {
  PilgrimageCard,
  PilgrimageCardGrid,
  PilgrimageShell,
  getPilgrimageRequestLocale,
} from "~/app/pilgrimage/_components/pilgrimage-ui";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const path = "/pilgrimage";
  return {
    title: copy.hubTitle,
    description: copy.hubDescription,
    alternates: {
      canonical: withAnimeLocale(path, locale),
      languages: localeAlternates(path),
    },
  };
}

export default async function PilgrimageHubPage() {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const index = getPilgrimageSeoIndex();

  if (!index) {
    return (
      <PilgrimageShell
        locale={locale}
        kicker={copy.siteKicker}
        title={copy.hubTitle}
        description={copy.emptyIndex}
      >
        <p className="text-sm text-pink-100/70">{copy.emptyIndex}</p>
      </PilgrimageShell>
    );
  }

  const topAnime = index.animes.slice(0, 12);
  const topLocations = index.locations.slice(0, 12);

  return (
    <PilgrimageShell
      locale={locale}
      kicker={copy.siteKicker}
      title={copy.hubTitle}
      description={copy.hubDescription}
    >
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard label={copy.spotCountLabel(index.spotCount)} />
        <StatCard label={copy.animeCountLabel(index.animeCount)} />
        <StatCard label={copy.locationCountLabel(index.locationCount)} />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-black text-white">{copy.animeArchive}</h2>
          <Link
            href={withAnimeLocale("/pilgrimage/anime", locale)}
            className="text-sm font-bold text-cyan-100/80 hover:text-cyan-50"
          >
            {copy.backAnime} →
          </Link>
        </div>
        <PilgrimageCardGrid>
          {topAnime.map((anime) => (
            <PilgrimageCard
              key={anime.subjectId}
              href={withAnimeLocale(`/pilgrimage/anime/${anime.slug}`, locale)}
              title={anime.animeTitle}
              meta={copy.spotCountLabel(anime.spotCount)}
            />
          ))}
        </PilgrimageCardGrid>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-black text-white">
            {copy.locationArchive}
          </h2>
          <Link
            href={withAnimeLocale("/pilgrimage/locations", locale)}
            className="text-sm font-bold text-cyan-100/80 hover:text-cyan-50"
          >
            {copy.backLocation} →
          </Link>
        </div>
        <PilgrimageCardGrid>
          {topLocations.map((location) => (
            <PilgrimageCard
              key={location.slug}
              href={withAnimeLocale(
                `/pilgrimage/locations/${location.slug}`,
                locale,
              )}
              title={location.name}
              meta={copy.spotCountLabel(location.spotCount)}
            />
          ))}
        </PilgrimageCardGrid>
      </section>
    </PilgrimageShell>
  );
}

function StatCard({ label }: { label: string }) {
  return (
    <div className="anime-panel p-4 text-center">
      <p className="text-sm font-black text-pink-100">{label}</p>
    </div>
  );
}
