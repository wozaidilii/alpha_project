"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  resolveAnimeLocale,
  saveAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";

/** 从 URL 路径前缀解析当前语言，并在变化时同步到 localStorage。 */
export function useAnimeLocale(
  fallback?: AnimeLocale,
): AnimeLocale {
  const pathname = usePathname();
  const [locale, setLocale] = useState<AnimeLocale>(() =>
    resolveAnimeLocale({ pathname, fallback }),
  );

  useEffect(() => {
    const next = resolveAnimeLocale({ pathname, fallback });
    setLocale(next);
    saveAnimeLocale(next);
  }, [pathname, fallback]);

  return locale;
}
