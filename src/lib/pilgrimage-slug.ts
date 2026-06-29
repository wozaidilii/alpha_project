/** 从题库条目解析 Anitabi / Bangumi subject ID */
export function subjectIdFromQuestion(question: {
  id?: string;
  tags?: string[];
}): string | null {
  const tag = (question.tags ?? []).find((item) =>
    String(item).startsWith("subject:"),
  );
  if (tag) return String(tag).slice("subject:".length);
  const match = /^anitabi_(\d+)_/u.exec(question.id ?? "");
  return match?.[1] ?? null;
}

/** 番剧 hub 页 slug：{subjectId}-{可读后缀}，CJK 标题保留 Unicode */
export function slugifyAnime(subjectId: string, animeTitle: string): string {
  const trimmed = animeTitle.trim();
  const suffix = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return suffix ? `${subjectId}-${suffix}` : `anime-${subjectId}`;
}

export function parseAnimeSlug(slug: string): string | null {
  const match = /^(\d+)(?:-.*)?$/u.exec(slug.trim());
  if (match?.[1]) return match[1];
  if (slug.startsWith("anime-")) {
    const id = slug.slice("anime-".length).trim();
    return id.length > 0 ? id : null;
  }
  return null;
}

/** 地点 slug：直接使用地名（动态路由内 decodeURIComponent） */
export function slugifyLocation(location: string): string {
  return encodeURIComponent(location.trim());
}

export function parseLocationSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** 取景地 ID 在 URL 中安全编码 */
export function encodeSpotId(id: string): string {
  return encodeURIComponent(id);
}

export function decodeSpotId(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}
