import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["sent", "confirmed", "failed", "disputed"]),
  txHash: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id }, select: { id: true, role: true } });
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { payoutId } = await params;

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  if (payout.status === "processing") {
    return NextResponse.json({ error: "Cannot update payout while processing" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const now = new Date();

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: parsed.data.status,
      ...(parsed.data.txHash && { txHash: parsed.data.txHash }),
      ...(parsed.data.status === "sent" && { initiatedAt: now }),
      ...(parsed.data.status === "confirmed" && { confirmedAt: now }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `payout.${parsed.data.status}`,
      entityType: "Payout",
      entityId: payoutId,
      metadata: { txHash: parsed.data.txHash },
    },
  });

  return NextResponse.json(updated);
}
