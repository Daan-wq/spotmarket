import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNetworkSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  networkSize: z.number().int().positive().optional(),
  inviteCode: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  walletAddress: z.string().optional(),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      networkProfile: {
        include: {
          _count: { select: { members: true, applications: true } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.networkProfile) return NextResponse.json({ error: "No network profile" }, { status: 404 });

  return NextResponse.json({ network: user.networkProfile });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createNetworkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.networkProfile.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (existing) return NextResponse.json({ error: "Invite code already taken" }, { status: 409 });

  const [networkProfile] = await prisma.$transaction([
    prisma.networkProfile.create({
      data: {
        userId: user.id,
        ...parsed.data,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { role: "network" },
    }),
  ]);

  return NextResponse.json({ network: networkProfile }, { status: 201 });
}
