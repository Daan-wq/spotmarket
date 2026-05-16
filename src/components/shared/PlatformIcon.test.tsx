import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { normalizePlatformIconKey } from "@clipprofit/platform-icons";
import PlatformIcon from "./PlatformIcon";

describe("PlatformIcon", () => {
  it("normalizes campaign enums and dashboard slugs to shared platform keys", () => {
    expect(normalizePlatformIconKey("INSTAGRAM")).toBe("INSTAGRAM");
    expect(normalizePlatformIconKey("ig")).toBe("INSTAGRAM");
    expect(normalizePlatformIconKey("TIKTOK")).toBe("TIKTOK");
    expect(normalizePlatformIconKey("tt")).toBe("TIKTOK");
    expect(normalizePlatformIconKey("YOUTUBE_SHORTS")).toBe("YOUTUBE_SHORTS");
    expect(normalizePlatformIconKey("youtube-shorts")).toBe("YOUTUBE_SHORTS");
    expect(normalizePlatformIconKey("yt")).toBe("YOUTUBE_SHORTS");
    expect(normalizePlatformIconKey("FACEBOOK")).toBe("FACEBOOK");
    expect(normalizePlatformIconKey("fb")).toBe("FACEBOOK");
    expect(normalizePlatformIconKey("twitter")).toBe("X");
  });

  it("renders repeated Instagram icons from the shared SVG asset", () => {
    const html = renderToStaticMarkup(
      <div>
        <div className="md:hidden">
          <PlatformIcon platform="INSTAGRAM" size={24} />
        </div>
        <div className="hidden md:block">
          <PlatformIcon platform="INSTAGRAM" size={28} />
        </div>
      </div>
    );

    expect(html).not.toContain('id="ig-grad"');
    expect(html).not.toContain("url(#ig-grad)");
    expect(html).not.toContain("<svg");
    expect(html.match(/<img/g)?.length).toBe(2);
    expect(html).toContain("Instagram");
  });
});
