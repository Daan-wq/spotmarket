import { NextRequest, NextResponse } from "next/server";

/**
 * Public status page for a Facebook Data Deletion confirmation_code.
 * We delete data synchronously in the deletion callback, so any code we
 * issued is, by definition, already fully processed.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  return NextResponse.json({
    code,
    status: "deleted",
    message: "All ClipProfit data associated with this Facebook user has been deleted.",
  });
}
