import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getConnectionHealthAlertsForViewer } from "@/lib/connection-health";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId, role } = await requireAuth("creator", "admin");
    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incidents = await getConnectionHealthAlertsForViewer({
      id: user.id,
      role: role as "creator" | "admin",
    });
    return NextResponse.json({ incidents });
  } catch (error) {
    return authErrorResponse(error);
  }
}

function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";
  const status = message === "Forbidden" ? 403 : 401;
  return NextResponse.json({ error: message }, { status });
}
