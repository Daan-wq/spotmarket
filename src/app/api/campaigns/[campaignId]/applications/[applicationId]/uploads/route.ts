import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-m4v"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;

  const uploads = await prisma.videoUpload.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(uploads);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, applicationId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true, creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify application ownership
  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
    select: { campaignId: true, creatorProfileId: true },
  });

  if (!application || application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (user.role === "creator" && application.creatorProfileId !== user.creatorProfile?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only MP4 and MOV files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
  }

  // Create VideoUpload record first
  const upload = await prisma.videoUpload.create({
    data: {
      applicationId,
      uploadedById: user.id,
      storagePath: "", // Will be updated after upload
      fileName: file.name,
      fileSize: file.size,
      status: "uploading",
    },
  });

  // Upload to Supabase Storage
  const storagePath = `${campaignId}/${applicationId}/${upload.id}${getExtension(file.name)}`;

  const adminClient = createSupabaseAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("campaign-videos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // Clean up the record
    await prisma.videoUpload.delete({ where: { id: upload.id } });
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Update record with storage path and mark ready
  const updated = await prisma.videoUpload.update({
    where: { id: upload.id },
    data: { storagePath, status: "ready" },
  });

  // Generate presigned URL for preview
  const { data: signedUrl } = await adminClient.storage
    .from("campaign-videos")
    .createSignedUrl(storagePath, 3600); // 1 hour

  return NextResponse.json({
    upload: updated,
    previewUrl: signedUrl?.signedUrl ?? null,
  }, { status: 201 });
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : ".mp4";
}
