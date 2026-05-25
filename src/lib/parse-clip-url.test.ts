import { describe, expect, it } from "vitest";
import { parseClipUrl } from "./parse-clip-url";

describe("parseClipUrl", () => {
  it("normalizes YouTube URL variants to the same video id", () => {
    const urls = [
      "https://www.youtube.com/shorts/abc_DEF-123",
      "https://www.youtube.com/watch?v=abc_DEF-123&feature=share",
      "https://youtu.be/abc_DEF-123?t=4",
      "https://m.youtube.com/watch?feature=share&v=abc_DEF-123",
    ];

    for (const url of urls) {
      expect(parseClipUrl(url)).toEqual(
        expect.objectContaining({
          platform: "YOUTUBE",
          normalizedPlatform: "YOUTUBE",
          platformVideoId: "abc_DEF-123",
          postId: "abc_DEF-123",
        }),
      );
    }
  });

  it("extracts TikTok canonical video ids", () => {
    expect(parseClipUrl("https://www.tiktok.com/@creator/video/7123456789012345678")).toEqual(
      expect.objectContaining({
        platform: "TIKTOK",
        normalizedPlatform: "TIKTOK",
        authorHandle: "creator",
        platformVideoId: "7123456789012345678",
      }),
    );
  });

  it("does not treat TikTok shortlinks as reliable video identities", () => {
    expect(parseClipUrl("https://vm.tiktok.com/ZMabc123/")).toEqual(
      expect.objectContaining({
        platform: "TIKTOK",
        normalizedPlatform: "TIKTOK",
        postId: "ZMabc123",
        platformVideoId: null,
      }),
    );
  });

  it("extracts Instagram reel and post shortcodes", () => {
    expect(parseClipUrl("https://www.instagram.com/reel/ABC123/?igsh=xyz")).toEqual(
      expect.objectContaining({
        platform: "INSTAGRAM",
        normalizedPlatform: "INSTAGRAM",
        platformVideoId: "ABC123",
      }),
    );
    expect(parseClipUrl("https://www.instagram.com/creator/p/DEF456/")).toEqual(
      expect.objectContaining({
        platform: "INSTAGRAM",
        normalizedPlatform: "INSTAGRAM",
        authorHandle: "creator",
        platformVideoId: "DEF456",
      }),
    );
  });

  it("extracts Facebook video ids from common forms", () => {
    const urls = [
      "https://www.facebook.com/reel/1234567890",
      "https://www.facebook.com/watch/?v=1234567890",
      "https://www.facebook.com/creator/videos/1234567890/",
    ];

    for (const url of urls) {
      expect(parseClipUrl(url)).toEqual(
        expect.objectContaining({
          platform: "FACEBOOK",
          normalizedPlatform: "FACEBOOK",
          platformVideoId: "1234567890",
        }),
      );
    }
  });
});
