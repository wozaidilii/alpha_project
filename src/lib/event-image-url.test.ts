import { describe, expect, it } from "vitest";
import {
  extractBlobPathname,
  isAllowedEventImagePathname,
  toEventImageProxyUrl,
} from "./event-image-url";

describe("event-image-url", () => {
  it("将 Private Blob 直链转为代理地址", () => {
    expect(
      toEventImageProxyUrl(
        "https://hm8fe40xp3queljf.private.blob.vercel-storage.com/event-images/historical_event_0001/01_Qinshihuang.jpg",
      ),
    ).toBe(
      "/api/event-images?pathname=event-images%2Fhistorical_event_0001%2F01_Qinshihuang.jpg",
    );
  });

  it("保留 Wikimedia 等外部 URL", () => {
    const url = "https://upload.wikimedia.org/wikipedia/commons/2/27/Qinshihuang.jpg";
    expect(toEventImageProxyUrl(url)).toBe(url);
  });

  it("拒绝非法 pathname", () => {
    expect(isAllowedEventImagePathname("../secret.txt")).toBe(false);
    expect(isAllowedEventImagePathname("event-images/foo.jpg")).toBe(true);
  });

  it("从 Blob URL 提取 pathname", () => {
    expect(
      extractBlobPathname(
        "https://example.private.blob.vercel-storage.com/event-images/a/b.jpg",
      ),
    ).toBe("event-images/a/b.jpg");
  });
});
