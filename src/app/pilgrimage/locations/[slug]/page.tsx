import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { withAnimeLocale } from "~/lib/anime-locale";
import { encodeSpotId } from "~/lib/pilgrimage-slug";
import { getPilgrimageCopy } from "~/lib/pilgrimage-copy";
import { localeAlternates } from "~/lib/seo";
import {
  getLocationBySlug,
  getPilgrimageSeoIndex,
  listSpotsForLocation,
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
  return index.locations.map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getPilgrimageRequestLocale();
  const { slug } = await params;
  const location = getLocationBySlug(slug);
  if (!location) return { title: "Not found" };

  const copy = getPilgrimageCopy(locale);
  const path = `/pilgrimage/locations/${location.slug}`;
  const title = copy.seoLocationTitle(location.name, location.spotCount);
  const description = copy.seoLocationDescription(
    location.name,
    location.spotCount,
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

export default async function PilgrimageLocationPage({ params }: Props) {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const { slug } = await params;
  const location = getLocationBySlug(slug);
  if (!location) notFound();

  const spots = listSpotsForLocation(location.slug).slice(0, 120);

  return (
    <PilgrimageShell
      locale={locale}
      kicker={copy.locationArchive}
      title={copy.spotsInLocation(location.name, location.spotCount)}
      description={copy.seoLocationDescription(
        location.name,
        location.spotCount,
      )}
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
          subtitle: pickLocalizedText(spot.animeTitle, locale),
        }))}
      />
      {location.spotCount > spots.length ? (
        <p className="mt-4 text-xs text-pink-100/50">
          + {location.spotCount - spots.length} more spots indexed
        </p>
      ) : null}
    </PilgrimageShell>
  );
}
