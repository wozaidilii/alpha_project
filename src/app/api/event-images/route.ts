import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { isAllowedEventImagePathname } from "~/lib/event-image-url";

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

    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Failed to load image", { status: 502 });
  }
}
