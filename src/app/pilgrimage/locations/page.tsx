import { type Metadata } from "next";
import { withAnimeLocale } from "~/lib/anime-locale";
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
  const path = "/pilgrimage/locations";
  return {
    title: copy.locationArchive,
    description: copy.hubDescription,
    alternates: {
      canonical: withAnimeLocale(path, locale),
      languages: localeAlternates(path),
    },
  };
}

export default async function PilgrimageLocationsIndexPage() {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const index = getPilgrimageSeoIndex();

  return (
    <PilgrimageShell
      locale={locale}
      kicker={copy.siteKicker}
      title={copy.locationArchive}
      description={copy.hubDescription}
    >
      {!index ? (
        <p className="text-sm text-pink-100/70">{copy.emptyIndex}</p>
      ) : (
        <PilgrimageCardGrid>
          {index.locations.map((location) => (
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
      )}
    </PilgrimageShell>
  );
}
