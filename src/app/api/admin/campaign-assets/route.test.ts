import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  uploadCampaignAssetImage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadCampaignAssetImage: routeMocks.uploadCampaignAssetImage,
}));

describe("POST /api/admin/campaign-assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.uploadCampaignAssetImage.mockResolvedValue({
      publicUrl:
        "https://project.supabase.co/storage/v1/object/public/campaign-assets/campaigns/file.png",
      path: "campaigns/file.png",
    });
  });

  it("returns the Supabase public URL and storage path", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File([Buffer.from("image")], "campaign.png", { type: "image/png" }),
    );

    const response = await POST(
      new Request("https://app.test/api/admin/campaign-assets", {
        method: "POST",
        body: formData,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      secureUrl:
        "https://project.supabase.co/storage/v1/object/public/campaign-assets/campaigns/file.png",
      publicId: "campaigns/file.png",
    });
    expect(response.status).toBe(200);
    expect(routeMocks.uploadCampaignAssetImage).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      filename: "campaign.png",
      contentType: "image/png",
    });
  });

  it("rejects non-image files before uploading", async () => {
    const formData = new FormData();
    formData.append("file", new File(["text"], "notes.txt", { type: "text/plain" }));

    const response = await POST(
      new Request("https://app.test/api/admin/campaign-assets", {
        method: "POST",
        body: formData,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Only image uploads are allowed",
    });
    expect(response.status).toBe(400);
    expect(routeMocks.uploadCampaignAssetImage).not.toHaveBeenCalled();
  });
});
