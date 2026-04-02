import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomInt } from "crypto";

// In-memory pairing code store (short-lived, 5 minutes)
const pairingCodes = new Map<string, { userId: string; expiresAt: number }>();

// Clean expired codes every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [code, entry] of pairingCodes) {
      if (entry.expiresAt < now) pairingCodes.delete(code);
    }
  }, 60_000);
}

export function getPairingStore() {
  return pairingCodes;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate 6-digit pairing code
    const code = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    pairingCodes.set(code, { userId: user.id, expiresAt });

    return NextResponse.json({ code, expiresIn: 300 });
  } catch (error) {
    console.error("POST /auth/device-pairing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
