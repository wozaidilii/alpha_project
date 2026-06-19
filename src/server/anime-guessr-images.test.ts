import { describe, expect, it } from "vitest";
import {
  getAnimeGuessrRemoteImageUrl,
  normalizeAnimeGuessrImageRelativePath,
  readLocalAnimeGuessrImage,
  resolveLocalAnimeGuessrImagePath,
} from "~/server/anime-guessr-images";

describe("anime-guessr-images", () => {
  it("accepts anime-relative image paths only", () => {
    expect(
      normalizeAnimeGuessrImageRelativePath("anime/51_CLANNAD/5c4dgq9pm.jpg"),
    ).toBe("anime/51_CLANNAD/5c4dgq9pm.jpg");
    expect(normalizeAnimeGuessrImageRelativePath("../secret.jpg")).toBeNull();
    expect(normalizeAnimeGuessrImageRelativePath("other/x.jpg")).toBeNull();
  });

  it("resolves known local anime images from rawdata", async () => {
    const relativePath = "anime/51_CLANNAD/5c4dgq9pm.jpg";
    const absolutePath = resolveLocalAnimeGuessrImagePath(relativePath);
    expect(absolutePath).toContain("rawdata");
    expect(absolutePath).toContain("51_CLANNAD");
    expect(absolutePath).toContain("5c4dgq9pm.jpg");

    const file = await readLocalAnimeGuessrImage(relativePath);
    expect(file).not.toBeNull();
    expect(file?.contentType).toBe("image/jpeg");
    expect(file?.body.byteLength).toBeGreaterThan(0);
  });

  it("builds remote fallback urls from the public base", () => {
    const previous = process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL;
    process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL =
      "https://example.com/anime-gussr/";

    expect(getAnimeGuessrRemoteImageUrl("anime/51_CLANNAD/5c4dgq9pm.jpg")).toBe(
      "https://example.com/anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg",
    );

    process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL = previous;
  });
});
