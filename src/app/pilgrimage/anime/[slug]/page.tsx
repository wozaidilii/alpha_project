import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { withAnimeLocale } from "~/lib/anime-locale";
import { encodeSpotId } from "~/lib/pilgrimage-slug";
import { getPilgrimageCopy } from "~/lib/pilgrimage-copy";
import { localeAlternates } from "~/lib/seo";
import {
  getAnimeBySlug,
  getPilgrimageSeoIndex,
  listSpotsForAnime,
  pickLocalizedText,
} from "~/server/data/pilgrimage-seo";
import {
  PilgrimageShell,
  PilgrimageSpotList,
  getPilgrimageRequestLocale,
} from "~/app/pilgrimage/_components/pilgrimage-ui";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const index = getPilgrimageSeoIndex();
  if (!index) return [];
  return index.animes.map((anime) => ({ slug: anime.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getPilgrimageRequestLocale();
  const { slug } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) return { title: "Not found" };

  const copy = getPilgrimageCopy(locale);
  const path = `/pilgrimage/anime/${anime.slug}`;
  const title = copy.seoAnimeTitle(anime.animeTitle, anime.spotCount);
  const description = copy.seoAnimeDescription(
    anime.animeTitle,
    anime.spotCount,
  );

  return {
    title,
    description,
    alternates: {
      canonical: withAnimeLocale(path, locale),
      languages: localeAlternates(path),
    },
    openGraph: { title, description, url: withAnimeLocale(path, locale) },
  };
}

export default async function PilgrimageAnimePage({ params }: Props) {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const { slug } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) notFound();

  const spots = listSpotsForAnime(anime.subjectId);

  return (
    <PilgrimageShell
      locale={locale}
      kicker={copy.animeArchive}
      title={copy.spotsInAnime(anime.animeTitle, anime.spotCount)}
      description={copy.seoAnimeDescription(anime.animeTitle, anime.spotCount)}
    >
      <PilgrimageSpotList
        locale={locale}
        spots={spots.map((spot) => ({
          id: spot.id,
          href: withAnimeLocale(
            `/pilgrimage/spots/${encodeSpotId(spot.id)}`,
            locale,
          ),
          title: pickLocalizedText(spot.answerName, locale),
          subtitle: pickLocalizedText(spot.title, locale),
        }))}
      />
      {anime.spotCount > spots.length ? (
        <p className="mt-4 text-xs text-pink-100/50">
          {spots.length} / {anime.spotCount} spots listed
        </p>
      ) : null}
    </PilgrimageShell>
  );
}
