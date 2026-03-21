import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignSchema = z.object({ memberId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, networkId: dbUser.networkProfile.id },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.networkMember.findFirst({
    where: { id: parsed.data.memberId, networkId: dbUser.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const assignment = await prisma.networkMemberAssignment.upsert({
    where: { applicationId_memberId: { applicationId, memberId: parsed.data.memberId } },
    create: { applicationId, memberId: parsed.data.memberId },
    update: {},
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
