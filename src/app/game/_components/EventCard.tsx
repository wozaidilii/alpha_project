"use client";

import { useEffect, useState } from "react";
import { type HistoricalEvent } from "~/data/events";
import { fetchWikiSummary } from "~/lib/wikipedia";

interface Props {
  event: HistoricalEvent;
}

export function EventCard({ event }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    event.imageUrl ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event.imageUrl || !event.wikipediaTitle) return;
    setLoading(true);
    void fetchWikiSummary(event.wikipediaTitle)
      .then((wiki) => {
        if (wiki?.thumbnail?.source) setImageUrl(wiki.thumbnail.source);
      })
      .finally(() => setLoading(false));
  }, [event]);

  return (
    <div className="overflow-hidden rounded-xl bg-stone-800">
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-700">
        {loading && (
          <div className="flex h-full items-center justify-center text-stone-500 text-sm">
            加载图片中…
          </div>
        )}
        {!loading && imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        )}
        {!loading && !imageUrl && (
          <div className="flex h-full items-center justify-center text-4xl">
            🗺️
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/80 to-transparent px-3 py-2">
          <span className="text-xs font-medium text-stone-300">
            {event.category === "china" ? "🇨🇳 中国历史" : "🌍 世界历史"}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="p-4">
        <h2 className="mb-2 text-lg font-bold text-amber-400">{event.title}</h2>
        <p className="text-sm leading-relaxed text-stone-300">
          {event.description}
        </p>
      </div>
    </div>
  );
}
