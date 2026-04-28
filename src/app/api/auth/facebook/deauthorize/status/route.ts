import { NextRequest, NextResponse } from "next/server";

/**
 * Public status page for a Facebook Deauthorize confirmation_code.
 * Deauthorization removes the local Page connection synchronously, so any
 * code we issued represents an already-processed request.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  return NextResponse.json({
    code,
    status: "deauthorized",
    message: "ClipProfit access has been revoked for this Facebook user.",
  });
}
