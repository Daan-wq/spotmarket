import { NextResponse } from "next/server";

// This endpoint is deprecated — the SocialAccount model has been removed.
// Instagram sync now uses CreatorIgConnection via the bio-verification flow.
export async function POST() {
  return NextResponse.json({ error: "This endpoint has been deprecated" }, { status: 410 });
}
