"use client";

import { useEffect, useState } from "react";
import { type GameQuestion } from "~/types/question";
import { getQuestionBadge } from "~/lib/question-utils";
import { fetchWikiSummary } from "~/lib/wikipedia";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  question: GameQuestion;
}

export function EventCard({ question }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    question.imageUrl ?? null,
  );
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(
    question.imageUrl ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setLightboxOpen(false);
    setImageUrl(question.imageUrl ?? null);
    setFullImageUrl(question.imageUrl ?? null);
    if (question.imageUrl || !question.wikipediaTitle) return;
    setLoading(true);
    void fetchWikiSummary(question.wikipediaTitle)
      .then((wiki) => {
        if (wiki?.thumbnail?.source) setImageUrl(wiki.thumbnail.source);
        const full =
          wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? null;
        if (full) setFullImageUrl(full);
      })
      .finally(() => setLoading(false));
  }, [question]);

  const fallbackEmoji =
    question.type === "historical"
      ? "🗺️"
      : question.type === "nostalgia"
        ? "📼"
        : "🌐";

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-stone-800">
        <button
          type="button"
          disabled={!imageUrl || loading}
          onClick={() => imageUrl && setLightboxOpen(true)}
          className={`group relative block h-36 w-full overflow-hidden bg-stone-700 ${
            imageUrl && !loading ? "cursor-zoom-in" : "cursor-default"
          }`}
          aria-label={imageUrl ? `查看大图：${question.title}` : undefined}
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
              alt={question.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          )}
          {!loading && !imageUrl && (
            <div className="flex h-full items-center justify-center text-4xl">
              {fallbackEmoji}
            </div>
          )}

          {imageUrl && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
              <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                点击查看大图
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-gradient-to-t from-stone-900/80 to-transparent px-3 py-2">
            <span className="text-xs font-medium text-stone-300">
              {getQuestionBadge(question)}
            </span>
          </div>
        </button>

        <div className="p-3">
          <h2 className="mb-2 text-lg font-bold text-amber-400">
            {question.title}
          </h2>
          <p className="text-sm leading-relaxed text-stone-300">
            {question.description}
          </p>
        </div>
      </div>

      {lightboxOpen && (fullImageUrl ?? imageUrl) && (
        <ImageLightbox
          src={fullImageUrl ?? imageUrl!}
          alt={question.title}
          caption={question.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
