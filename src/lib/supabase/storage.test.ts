import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAMPAIGN_ASSETS_BUCKET,
  uploadCampaignAssetImage,
} from "./storage";

const storageMocks = vi.hoisted(() => {
  const getBucket = vi.fn();
  const updateBucket = vi.fn();
  const createBucket = vi.fn();
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({ upload, getPublicUrl }));

  return {
    getBucket,
    updateBucket,
    createBucket,
    upload,
    getPublicUrl,
    from,
    supabase: {
      storage: {
        getBucket,
        updateBucket,
        createBucket,
        from,
      },
    },
  };
});

vi.mock("./admin", () => ({
  createSupabaseAdminClient: () => storageMocks.supabase,
}));

describe("uploadCampaignAssetImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getBucket.mockResolvedValue({
      data: { id: CAMPAIGN_ASSETS_BUCKET, public: true },
      error: null,
    });
    storageMocks.updateBucket.mockResolvedValue({ data: {}, error: null });
    storageMocks.createBucket.mockResolvedValue({ data: {}, error: null });
    storageMocks.upload.mockResolvedValue({ data: { path: "campaigns/file.png" }, error: null });
    storageMocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://project.supabase.co/storage/v1/object/public/campaign-assets/campaigns/file.png",
      },
    });
  });

  it("uploads to the public campaign-assets bucket and returns its public URL", async () => {
    const result = await uploadCampaignAssetImage({
      buffer: Buffer.from("image"),
      filename: "brand-logo.png",
      contentType: "image/png",
    });

    expect(storageMocks.updateBucket).toHaveBeenCalledWith(CAMPAIGN_ASSETS_BUCKET, {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: 5 * 1024 * 1024,
    });
    expect(storageMocks.from).toHaveBeenCalledWith(CAMPAIGN_ASSETS_BUCKET);
    expect(storageMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^campaigns\/\d{4}-\d{2}-\d{2}\/.+\.png$/),
      expect.any(Buffer),
      { contentType: "image/png", upsert: false },
    );
    expect(storageMocks.getPublicUrl).toHaveBeenCalledWith(result.path);
    expect(result.publicUrl).toBe(
      "https://project.supabase.co/storage/v1/object/public/campaign-assets/campaigns/file.png",
    );
  });

  it("creates the bucket when it does not exist yet", async () => {
    storageMocks.getBucket.mockResolvedValueOnce({
      data: null,
      error: { message: "Bucket not found", statusCode: "404" },
    });

    await uploadCampaignAssetImage({
      buffer: Buffer.from("image"),
      filename: "brand-logo.webp",
      contentType: "image/webp",
    });

    expect(storageMocks.createBucket).toHaveBeenCalledWith(CAMPAIGN_ASSETS_BUCKET, {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: 5 * 1024 * 1024,
    });
  });
});
