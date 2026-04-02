import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { getPairingStore } from "../device-pairing/route";

const schema = z.object({
  pairingCode: z.string().length(6),
  deviceName: z.string().min(1).max(100),
  deviceType: z.enum(["desktop_agent", "browser"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { pairingCode, deviceName, deviceType } = parsed.data;

    const pairingStore = getPairingStore();
    const pairing = pairingStore.get(pairingCode);

    if (!pairing) {
      return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 400 });
    }

    if (pairing.expiresAt < Date.now()) {
      pairingStore.delete(pairingCode);
      return NextResponse.json({ error: "Pairing code expired" }, { status: 400 });
    }

    // Generate device token
    const rawToken = randomBytes(48).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // Store hashed token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: pairing.userId,
        deviceName,
        tokenHash,
        deviceType,
      },
    });

    // Remove used pairing code
    pairingStore.delete(pairingCode);

    return NextResponse.json({
      deviceTokenId: deviceToken.id,
      token: rawToken, // Only returned once
      deviceName,
    });
  } catch (error) {
    console.error("POST /auth/device-token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
