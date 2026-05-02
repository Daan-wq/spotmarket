import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findDuplicate } from "@/lib/duplicate-detector";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("creator");

    const campaignId = req.nextUrl.searchParams.get("campaignId");
    const postUrl = req.nextUrl.searchParams.get("postUrl");

    if (!postUrl) {
      return NextResponse.json({ isDuplicate: false });
    }

    const dup = await findDuplicate({
      postUrl,
      ...(campaignId ? { campaignId } : {}),
    });

    return NextResponse.json({
      isDuplicate: !!dup,
      ...(dup
        ? {
            match: {
              submissionId: dup.submissionId,
              matchType: dup.matchType,
            },
          }
        : {}),
    });
  } catch {
    return NextResponse.json({ isDuplicate: false });
  }
}
