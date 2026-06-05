"use client";

import { useEffect, useState } from "react";
import { type HistoricalEvent } from "~/types/event";
import { fetchWikiSummary } from "~/lib/wikipedia";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  event: HistoricalEvent;
}

export function EventCard({ event }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    event.imageUrl ?? null,
  );
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(
    event.imageUrl ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setLightboxOpen(false);
    setImageUrl(event.imageUrl ?? null);
    setFullImageUrl(event.imageUrl ?? null);
    if (event.imageUrl || !event.wikipediaTitle) return;
    setLoading(true);
    void fetchWikiSummary(event.wikipediaTitle)
      .then((wiki) => {
        if (wiki?.thumbnail?.source) setImageUrl(wiki.thumbnail.source);
        const full =
          wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? null;
        if (full) setFullImageUrl(full);
      })
      .finally(() => setLoading(false));
  }, [event]);

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-stone-800">
        {/* Image */}
        <button
          type="button"
          disabled={!imageUrl || loading}
          onClick={() => imageUrl && setLightboxOpen(true)}
          className={`group relative block h-44 w-full overflow-hidden bg-stone-700 ${
            imageUrl && !loading ? "cursor-zoom-in" : "cursor-default"
          }`}
          aria-label={imageUrl ? `查看大图：${event.title}` : undefined}
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              加载图片中…
            </div>
          )}
          {!loading && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={event.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          )}
          {!loading && !imageUrl && (
            <div className="flex h-full items-center justify-center text-4xl">
              🗺️
            </div>
          )}

          {imageUrl && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
              <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                点击查看大图
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/80 to-transparent px-3 py-2">
            <span className="text-xs font-medium text-stone-300">
              {event.category === "china" ? "🇨🇳 中国历史" : "🌍 世界历史"}
            </span>
          </div>
        </button>

        {/* Text */}
        <div className="p-4">
          <h2 className="mb-2 text-xl font-bold text-amber-400">{event.title}</h2>
          <p className="text-base leading-relaxed text-stone-300">
            {event.description}
          </p>
        </div>
      </div>

      {lightboxOpen && (fullImageUrl ?? imageUrl) && (
        <ImageLightbox
          src={fullImageUrl ?? imageUrl!}
          alt={event.title}
          caption={event.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
