import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "AI features coming soon" }, { status: 503 });
}
