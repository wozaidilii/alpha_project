import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { isAllowedEventImagePathname } from "~/lib/event-image-url";
import { readLocalEventImage } from "~/lib/local-event-image";

const CACHE_HEADER =
  "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname")?.trim();
  if (!pathname) {
    return NextResponse.json({ error: "缺少 pathname" }, { status: 400 });
  }

  if (!isAllowedEventImagePathname(pathname)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (result) {
      if (result.statusCode === 304) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: result.blob.etag,
            "Cache-Control": CACHE_HEADER,
          },
        });
      }

      return new NextResponse(result.stream, {
        headers: {
          "Content-Type": result.blob.contentType ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          ETag: result.blob.etag,
          "Cache-Control": CACHE_HEADER,
        },
      });
    }
  } catch {
    // Blob 读取失败时回退到本地 rawdata/images
  }

  const localImage = await readLocalEventImage(pathname);
  if (localImage) {
    return new NextResponse(new Uint8Array(localImage.body), {
      headers: {
        "Content-Type": localImage.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": CACHE_HEADER,
      },
    });
  }

  return new NextResponse("Not found", { status: 404 });
}
