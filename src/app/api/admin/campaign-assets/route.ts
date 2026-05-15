import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { uploadCampaignAssetImage } from "@/lib/supabase/storage";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireAuth("admin");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadCampaignAssetImage({
      buffer: Buffer.from(arrayBuffer),
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json({
      secureUrl: result.publicUrl,
      publicId: result.path,
    });
  } catch (err) {
    console.error("[POST /api/admin/campaign-assets]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
