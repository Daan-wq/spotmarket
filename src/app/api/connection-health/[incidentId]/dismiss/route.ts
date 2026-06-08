import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  dismissed: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const [{ incidentId }, auth] = await Promise.all([
      context.params,
      requireAuth("creator", "admin"),
    ]);
    const user = await prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.connectionHealthIncident.findUnique({
      where: { id: incidentId },
      select: {
        id: true,
        creatorProfile: { select: { userId: true } },
      },
    });
    if (!incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      auth.role === "creator" &&
      incident.creatorProfile.userId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (input.dismissed) {
      await prisma.connectionHealthDismissal.upsert({
        where: {
          incidentId_viewerId: {
            incidentId,
            viewerId: user.id,
          },
        },
        create: {
          incidentId,
          viewerId: user.id,
        },
        update: {
          dismissedAt: new Date(),
        },
      });
    } else {
      await prisma.connectionHealthDismissal.deleteMany({
        where: {
          incidentId,
          viewerId: user.id,
        },
      });
    }

    return NextResponse.json({ dismissed: input.dismissed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
