import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  reviewDemographicsSubmission,
  reviewCampaignApplication,
} from "@/lib/submission-review";

const KINDS = ["demographics", "applications"] as const;
type Kind = (typeof KINDS)[number];

const bodySchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { kind, id } = await params;

    if (!KINDS.includes(kind as Kind)) {
      return NextResponse.json(
        { error: `Unsupported review kind. Use one of: ${KINDS.join(", ")}. For video submissions use POST /api/submissions/[id]/review.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { decision, reason } = bodySchema.parse(body);

    if (decision === "REJECT" && !reason) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 }
      );
    }

    if (kind === "demographics") {
      await reviewDemographicsSubmission({
        submissionId: id,
        decision,
        reason,
        reviewerSupabaseId: userId,
      });
    } else {
      await reviewCampaignApplication({
        applicationId: id,
        decision,
        reason,
        reviewerSupabaseId: userId,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[admin review decision]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
