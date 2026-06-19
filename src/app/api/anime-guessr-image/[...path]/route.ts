import { NextResponse } from "next/server";
import {
  getAnimeGuessrRemoteImageUrl,
  readLocalAnimeGuessrImage,
} from "~/server/anime-guessr-images";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const relativePath = segments.join("/");
  const local = await readLocalAnimeGuessrImage(relativePath);

  if (local) {
    return new NextResponse(local.body, {
      headers: {
        "Content-Type": local.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const remoteUrl = getAnimeGuessrRemoteImageUrl(relativePath);
  if (remoteUrl) {
    return NextResponse.redirect(remoteUrl, 307);
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}
