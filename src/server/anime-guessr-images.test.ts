import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

  it("reads local anime images from the configured image root", async () => {
    const previousRoot = process.env.ANIME_GUESSR_LOCAL_IMAGE_ROOT;
    const root = await mkdtemp(path.join(tmpdir(), "anime-guessr-images-"));
    const relativePath = "anime/fixture/test.jpg";
    const imagePath = path.join(root, relativePath);

    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    process.env.ANIME_GUESSR_LOCAL_IMAGE_ROOT = root;

    try {
      const absolutePath = resolveLocalAnimeGuessrImagePath(relativePath);
      expect(absolutePath).toBe(imagePath);

      const file = await readLocalAnimeGuessrImage(relativePath);
      expect(file).not.toBeNull();
      expect(file?.contentType).toBe("image/jpeg");
      expect(file?.body.byteLength).toBeGreaterThan(0);
    } finally {
      process.env.ANIME_GUESSR_LOCAL_IMAGE_ROOT = previousRoot;
      await rm(root, { force: true, recursive: true });
    }
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

  it("does not duplicate the anime segment when the remote base already includes it", () => {
    const previous = process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL;
    process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL =
      "https://example.com/anime-gussr/anime/";

    expect(getAnimeGuessrRemoteImageUrl("anime/51_CLANNAD/5c4dgq9pm.jpg")).toBe(
      "https://example.com/anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg",
    );

    process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL = previous;
  });
});
