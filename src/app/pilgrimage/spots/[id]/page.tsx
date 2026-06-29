import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withAnimeLocale } from "~/lib/anime-locale";
import { buildAnimeGuessrImageUrl } from "~/lib/anime-guessr";
import { getPilgrimageCopy } from "~/lib/pilgrimage-copy";
import { absoluteUrl, localeAlternates } from "~/lib/seo";
import {
  getSpotById,
  pickLocalizedText,
} from "~/server/data/pilgrimage-seo";
import {
  PilgrimageShell,
  getPilgrimageRequestLocale,
} from "~/app/pilgrimage/_components/pilgrimage-ui";

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 86_400;
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getPilgrimageRequestLocale();
  const { id } = await params;
  const spot = getSpotById(id);
  if (!spot) return { title: "Not found" };

  const copy = getPilgrimageCopy(locale);
  const anime = pickLocalizedText(spot.animeTitle, locale);
  const place = pickLocalizedText(spot.answerName, locale);
  const location = pickLocalizedText(spot.location, locale);
  const path = `/pilgrimage/spots/${id}`;
  const title = copy.seoSpotTitle(anime, place);
  const description = copy.seoSpotDescription(anime, place, location);
  const imageUrl = buildAnimeGuessrImageUrl(spot.imagePath ?? undefined);

  return {
    title,
    description,
    alternates: {
      canonical: withAnimeLocale(path, locale),
      languages: localeAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: withAnimeLocale(path, locale),
      images: imageUrl ? [{ url: imageUrl, alt: place }] : undefined,
    },
  };
}

function buildSpotJsonLd(
  locale: Awaited<ReturnType<typeof getPilgrimageRequestLocale>>,
  spot: NonNullable<ReturnType<typeof getSpotById>>,
) {
  const anime = pickLocalizedText(spot.animeTitle, locale);
  const place = pickLocalizedText(spot.answerName, locale);
  const description = pickLocalizedText(spot.description, locale);
  const pagePath = withAnimeLocale(`/pilgrimage/spots/${spot.id}`, locale);
  const imageUrl = buildAnimeGuessrImageUrl(spot.imagePath ?? undefined);

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place,
    description,
    geo: {
      "@type": "GeoCoordinates",
      latitude: spot.lat,
      longitude: spot.lng,
    },
    ...(imageUrl ? { image: imageUrl } : {}),
    url: absoluteUrl(pagePath),
    isRelatedTo: {
      "@type": "CreativeWork",
      name: anime,
    },
  };
}

export default async function PilgrimageSpotPage({ params }: Props) {
  const locale = await getPilgrimageRequestLocale();
  const copy = getPilgrimageCopy(locale);
  const { id } = await params;
  const spot = getSpotById(id);
  if (!spot) notFound();

  const anime = pickLocalizedText(spot.animeTitle, locale);
  const place = pickLocalizedText(spot.answerName, locale);
  const location = pickLocalizedText(spot.location, locale);
  const title = pickLocalizedText(spot.title, locale);
  const description = pickLocalizedText(spot.description, locale);
  const imageUrl = buildAnimeGuessrImageUrl(spot.imagePath ?? undefined);
  const mapsUrl = `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;

  const jsonLd = buildSpotJsonLd(locale, spot);

  return (
    <PilgrimageShell
      locale={locale}
      kicker={copy.spotDetail}
      title={copy.seoSpotTitle(anime, place)}
      description={description}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="anime-panel p-5 sm:p-6">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="mb-5 aspect-video w-full rounded-xl border border-white/10 object-cover"
            />
          ) : null}

          <h2 className="text-lg font-black text-pink-100">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-pink-50/80">{description}</p>

          {spot.episodeContext ? (
            <section className="mt-6">
              <h3 className="text-xs font-black tracking-[0.16em] text-cyan-100/70 uppercase">
                {copy.episode}
              </h3>
              <p className="mt-2 text-sm text-pink-50/75">{spot.episodeContext}</p>
            </section>
          ) : null}

          {spot.funfact.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-xs font-black tracking-[0.16em] text-cyan-100/70 uppercase">
                {copy.funfacts}
              </h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-pink-50/75">
                {spot.funfact.map((fact) => (
                  <li key={fact} className="rounded-lg bg-white/5 px-3 py-2">
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="anime-panel h-fit p-5">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-bold text-pink-100/60">
                {copy.relatedAnime}
              </dt>
              <dd className="mt-1 font-black text-white">
                <Link
                  href={withAnimeLocale(
                    `/pilgrimage/anime/${spot.subjectSlug}`,
                    locale,
                  )}
                  className="text-cyan-100 hover:text-cyan-50"
                >
                  {anime}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-pink-100/60">
                {copy.relatedLocation}
              </dt>
              <dd className="mt-1 font-black text-white">
                <Link
                  href={withAnimeLocale(
                    `/pilgrimage/locations/${spot.locationSlug}`,
                    locale,
                  )}
                  className="text-cyan-100 hover:text-cyan-50"
                >
                  {location}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-pink-100/60">
                {copy.answerName}
              </dt>
              <dd className="mt-1 font-bold text-pink-50">{place}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-pink-100/60">
                {copy.coordinates}
              </dt>
              <dd className="mt-1 font-mono text-xs text-pink-50/80">
                {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 grid gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="anime-button block text-center text-sm"
            >
              {copy.openMaps}
            </a>
            {spot.sourceUrl ? (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="anime-button-secondary block text-center text-sm"
              >
                {copy.openAnitabi}
              </a>
            ) : null}
            <Link
              href={withAnimeLocale("/game/anime", locale)}
              className="block text-center text-xs font-bold text-cyan-100/70 hover:text-cyan-50"
            >
              {copy.playGame}
            </Link>
          </div>
        </aside>
      </article>
    </PilgrimageShell>
  );
}
