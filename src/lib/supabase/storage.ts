import { createSupabaseAdminClient } from "./admin";

export const TIKTOK_DEMO_BUCKET = "tiktok-demographics";

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
