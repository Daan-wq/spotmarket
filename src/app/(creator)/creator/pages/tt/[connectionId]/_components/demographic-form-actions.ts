"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadTikTokDemographicRecording } from "@/lib/supabase/storage";
import { revalidatePath } from "next/cache";

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

export async function submitTikTokDemographics(formData: FormData) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Creator profile not found");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
    select: { id: true },
  });
  if (!conn) throw new Error("Connection not found");

  const topCountry = String(formData.get("topCountry") ?? "").trim().toUpperCase();
  const topCountryPercent = parseInt(String(formData.get("topCountryPercent") ?? "0"), 10);
  const malePercent = parseInt(String(formData.get("malePercent") ?? "0"), 10);
  const femalePercent = 100 - malePercent;

  const ageBuckets: Record<string, number> = {
    "13-17": parseInt(String(formData.get("age_13_17") ?? "0"), 10),
    "18-24": parseInt(String(formData.get("age_18_24") ?? "0"), 10),
    "25-34": parseInt(String(formData.get("age_25_34") ?? "0"), 10),
    "35-44": parseInt(String(formData.get("age_35_44") ?? "0"), 10),
    "45-54": parseInt(String(formData.get("age_45_54") ?? "0"), 10),
    "55+": parseInt(String(formData.get("age_55") ?? "0"), 10),
  };

  if (!/^[A-Z]{2}$/.test(topCountry)) throw new Error("Top country must be a 2-letter ISO code");
  if (topCountryPercent < 1 || topCountryPercent > 100) throw new Error("Top country % must be 1-100");
  if (malePercent < 0 || malePercent > 100) throw new Error("Gender % must be 0-100");
  const ageSum = Object.values(ageBuckets).reduce((s, v) => s + v, 0);
  if (ageSum < 95 || ageSum > 105) throw new Error("Age buckets must sum to ~100%");

  const file = formData.get("screenRecording");
  if (!(file instanceof File) || file.size === 0) throw new Error("Screen recording required");
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) throw new Error("Unsupported video format (mp4, mov, webm, mkv)");
  if (file.size > MAX_FILE_BYTES) throw new Error("Video exceeds 100 MB limit");

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const storagePath = await uploadTikTokDemographicRecording(conn.id, buffer, file.type, extension);

  await prisma.tikTokDemographicSubmission.create({
    data: {
      connectionId: conn.id,
      topCountry,
      topCountryPercent,
      malePercent,
      femalePercent,
      ageBuckets,
      screenRecordingUrl: storagePath,
      status: "PENDING",
    },
  });

  revalidatePath(`/creator/pages/tt/${conn.id}`);
}
