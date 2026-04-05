import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const uploadSchema = z.object({
  screenshotUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth("creator");

    const body = await req.json();
    const { screenshotUrl } = uploadSchema.parse(body);

    return NextResponse.json({ url: screenshotUrl }, { status: 200 });
  } catch (err: any) {
    console.error("[upload screenshot]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
