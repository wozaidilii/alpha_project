export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string };
}

export async function fetchWikiSummary(
  title: string,
): Promise<WikiSummary | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as WikiSummary;
  } catch {
    return null;
  }
}
