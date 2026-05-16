import { createSupabaseAdminClient } from "./admin";

export const CAMPAIGN_ASSETS_BUCKET = "campaign-assets";
export const TIKTOK_DEMO_BUCKET = "tiktok-demographics";
export const CREATOR_MEDIA_CACHE_BUCKET = "creator-media-cache";

const MAX_CAMPAIGN_ASSET_SIZE = 5 * 1024 * 1024;
const MAX_CREATOR_MEDIA_CACHE_SIZE = 10 * 1024 * 1024;
const CAMPAIGN_ASSET_MIME_TYPES = ["image/*"];

export async function ensureCampaignAssetsBucket(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.getBucket(CAMPAIGN_ASSETS_BUCKET);

  if (data) {
    const { error: updateError } = await supabase.storage.updateBucket(
      CAMPAIGN_ASSETS_BUCKET,
      {
        public: true,
        allowedMimeTypes: CAMPAIGN_ASSET_MIME_TYPES,
        fileSizeLimit: MAX_CAMPAIGN_ASSET_SIZE,
      },
    );
    if (updateError) {
      throw new Error(`Campaign asset bucket update failed: ${updateError.message}`);
    }
    return;
  }

  if (error && !isStorageNotFoundError(error)) {
    throw new Error(`Campaign asset bucket lookup failed: ${error.message}`);
  }

  const { error: createError } = await supabase.storage.createBucket(
    CAMPAIGN_ASSETS_BUCKET,
    {
      public: true,
      allowedMimeTypes: CAMPAIGN_ASSET_MIME_TYPES,
      fileSizeLimit: MAX_CAMPAIGN_ASSET_SIZE,
    },
  );

  if (createError && !isStorageAlreadyExistsError(createError)) {
    throw new Error(`Campaign asset bucket creation failed: ${createError.message}`);
  }
}

export async function uploadCampaignAssetImage({
  buffer,
  filename,
  contentType,
}: {
  buffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<{ publicUrl: string; path: string }> {
  await ensureCampaignAssetsBucket();

  const supabase = createSupabaseAdminClient();
  const path = `campaigns/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${fileExtension(filename, contentType)}`;
  const { error } = await supabase.storage
    .from(CAMPAIGN_ASSETS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Campaign asset upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(CAMPAIGN_ASSETS_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function ensureCreatorMediaCacheBucket(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.getBucket(CREATOR_MEDIA_CACHE_BUCKET);

  if (data) {
    const { error: updateError } = await supabase.storage.updateBucket(
      CREATOR_MEDIA_CACHE_BUCKET,
      {
        public: true,
        allowedMimeTypes: ["image/*"],
        fileSizeLimit: MAX_CREATOR_MEDIA_CACHE_SIZE,
      },
    );
    if (updateError) {
      throw new Error(`Creator media cache bucket update failed: ${updateError.message}`);
    }
    return;
  }

  if (error && !isStorageNotFoundError(error)) {
    throw new Error(`Creator media cache bucket lookup failed: ${error.message}`);
  }

  const { error: createError } = await supabase.storage.createBucket(
    CREATOR_MEDIA_CACHE_BUCKET,
    {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: MAX_CREATOR_MEDIA_CACHE_SIZE,
    },
  );

  if (createError && !isStorageAlreadyExistsError(createError)) {
    throw new Error(`Creator media cache bucket creation failed: ${createError.message}`);
  }
}

export async function uploadCreatorMediaCacheImage({
  buffer,
  contentType,
  platform,
  connectionId,
  mediaId,
}: {
  buffer: Buffer;
  contentType: string;
  platform: string;
  connectionId: string;
  mediaId: string;
}): Promise<{ publicUrl: string; path: string }> {
  await ensureCreatorMediaCacheBucket();

  const supabase = createSupabaseAdminClient();
  const path = [
    sanitizeStorageSegment(platform),
    sanitizeStorageSegment(connectionId),
    `${sanitizeStorageSegment(mediaId)}${extensionForContentType(contentType)}`,
  ].join("/");

  const { error } = await supabase.storage
    .from(CREATOR_MEDIA_CACHE_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Creator media cache upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(CREATOR_MEDIA_CACHE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function uploadTikTokDemographicRecording(
  connectionId: string,
  file: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const path = `${connectionId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(TIKTOK_DEMO_BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/** Generate a short-lived signed URL for admin review playback. */
export async function getTikTokDemographicSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(TIKTOK_DEMO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL generation failed: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

function fileExtension(filename: string, contentType: string): string {
  const fromFilename = filename.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  if (fromFilename) return `.${fromFilename}`;

  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

function extensionForContentType(contentType: string): string {
  const clean = contentType.split(";")[0]?.trim().toLowerCase();
  switch (clean) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}

function sanitizeStorageSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}

function isStorageNotFoundError(error: { message?: string; statusCode?: string | number }) {
  return (
    String(error.statusCode) === "404" ||
    error.message?.toLowerCase().includes("not found")
  );
}

function isStorageAlreadyExistsError(error: { message?: string; statusCode?: string | number }) {
  return (
    String(error.statusCode) === "409" ||
    error.message?.toLowerCase().includes("already exists")
  );
}
