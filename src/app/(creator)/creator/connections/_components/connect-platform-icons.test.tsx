import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FacebookConnectButton } from "./facebook-connect-button";
import { InstagramConnectButton } from "./instagram-connect-button";
import { TikTokConnectButton } from "./tiktok-connect-button";
import { YoutubeConnectButton } from "./youtube-connect-button";

describe("connection platform icons", () => {
  it("renders connect cards with shared SVG-backed platform logos", () => {
    const html = renderToStaticMarkup(
      <div>
        <InstagramConnectButton />
        <TikTokConnectButton />
        <YoutubeConnectButton />
        <FacebookConnectButton />
      </div>,
    );

    expect(html.match(/<img/g)?.length).toBe(4);
    expect(html).not.toContain("<svg");
    expect(html).toContain("Instagram");
    expect(html).toContain("TikTok");
    expect(html).toContain("YouTube");
    expect(html).toContain("Facebook Page");
  });
});
