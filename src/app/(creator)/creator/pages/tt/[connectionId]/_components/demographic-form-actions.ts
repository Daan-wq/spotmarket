"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadTikTokDemographicRecording } from "@/lib/supabase/storage";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { revalidatePath } from "next/cache";

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const COUNTRY_SLOTS = 5;

export async function submitTikTokDemographics(formData: FormData) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, displayName: true },
  });
  if (!profile) throw new Error("Creator profile not found");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
    select: { id: true, username: true },
  });
  if (!conn) throw new Error("Connection not found");

  // Block if a PENDING submission already exists for this connection.
  const pending = await prisma.tikTokDemographicSubmission.findFirst({
    where: { connectionId: conn.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw new Error("A submission is already under review");

  // ─── Top countries (up to 5) ─────────────────────────────────────
  const topCountries: { iso: string; percent: number }[] = [];
  for (let i = 0; i < COUNTRY_SLOTS; i++) {
    const iso = String(formData.get(`country_iso_${i}`) ?? "").trim().toUpperCase();
    const pctRaw = String(formData.get(`country_pct_${i}`) ?? "").trim();
    if (!iso && !pctRaw) continue;
    if (!/^[A-Z]{2}$/.test(iso)) throw new Error(`Country ${i + 1}: ISO code must be 2 letters`);
    const percent = parseFloat(pctRaw);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(`Country ${i + 1}: percent must be 0-100`);
    }
    topCountries.push({ iso, percent: Math.round(percent * 10) / 10 });
  }
  if (topCountries.length === 0) throw new Error("At least one country is required");
  const countriesSum = topCountries.reduce((s, c) => s + c.percent, 0);
  if (countriesSum > 105) throw new Error("Country percentages cannot exceed 100% in total");

  const topCountry = topCountries[0].iso;
  const topCountryPercent = Math.round(topCountries[0].percent);

  // ─── Gender (3-way: male / female / other, must sum to 100) ──────
  const malePercent = parseInt(String(formData.get("malePercent") ?? "0"), 10);
  const femalePercent = parseInt(String(formData.get("femalePercent") ?? "0"), 10);
  const otherPercent = parseInt(String(formData.get("otherPercent") ?? "0"), 10);
  for (const [name, val] of [["male", malePercent], ["female", femalePercent], ["other", otherPercent]] as const) {
    if (!Number.isFinite(val) || val < 0 || val > 100) throw new Error(`Gender ${name} % must be 0-100`);
  }
  const genderSum = malePercent + femalePercent + otherPercent;
  if (genderSum < 95 || genderSum > 105) throw new Error("Gender values must sum to ~100%");

  // ─── Age buckets (no 13-17, TikTok Studio doesn't expose it) ─────
  const ageBuckets: Record<string, number> = {
    "18-24": parseInt(String(formData.get("age_18_24") ?? "0"), 10),
    "25-34": parseInt(String(formData.get("age_25_34") ?? "0"), 10),
    "35-44": parseInt(String(formData.get("age_35_44") ?? "0"), 10),
    "45-54": parseInt(String(formData.get("age_45_54") ?? "0"), 10),
    "55+": parseInt(String(formData.get("age_55") ?? "0"), 10),
  };
  const ageSum = Object.values(ageBuckets).reduce((s, v) => s + v, 0);
  if (ageSum < 95 || ageSum > 105) throw new Error("Age buckets must sum to ~100%");

  // ─── Screen recording ────────────────────────────────────────────
  const file = formData.get("screenRecording");
  if (!(file instanceof File) || file.size === 0) throw new Error("Screen recording required");
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) throw new Error("Unsupported video format (mp4, mov, webm, mkv)");
  if (file.size > MAX_FILE_BYTES) throw new Error("Video exceeds 100 MB limit");

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const storagePath = await uploadTikTokDemographicRecording(conn.id, buffer, file.type, extension);

  const submission = await prisma.tikTokDemographicSubmission.create({
    data: {
      connectionId: conn.id,
      topCountry,
      topCountryPercent,
      topCountries,
      malePercent,
      femalePercent,
      otherPercent,
      ageBuckets,
      screenRecordingUrl: storagePath,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Notify all admins (in-app + Discord per SIGNAL_FLAGGED default routing).
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        dispatchNotification(a.id, "SIGNAL_FLAGGED", {
          kind: "tiktok_demographics_submitted",
          submissionId: submission.id,
          connectionId: conn.id,
          username: conn.username,
          creatorDisplayName: profile.displayName,
          submittedAt: new Date().toISOString(),
        }),
      ),
    );
  } catch (err) {
    // Notification failure must not block the submission.
    console.error("[tiktok-demographics] admin notification failed", err);
  }

  revalidatePath(`/creator/pages/tt/${conn.id}`);
}
