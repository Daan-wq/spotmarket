import { NextResponse } from "next/server";
import { z } from "zod";
import { hashBrandInviteToken, normalizeBrandContactEmail } from "@/lib/brand-invites";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const acceptSchema = z.object({
  token: z.string().min(24),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const parsed = acceptSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite details." }, { status: 400 });
  }

  const { token, name, password } = parsed.data;
  const contact = await prisma.brandContact.findUnique({
    where: { inviteTokenHash: hashBrandInviteToken(token) },
    include: { brand: { select: { id: true, name: true } } },
  });

  if (!contact || contact.status === "REVOKED") {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (!contact.inviteExpiresAt || contact.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }

  const email = normalizeBrandContactEmail(contact.email);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.role !== "brand") {
    return NextResponse.json({ error: "This email is already used by another ClipProfit account." }, { status: 409 });
  }

  const admin = createSupabaseAdminClient();
  const supabaseUser = await ensureSupabaseBrandUser(admin, email, password);
  const dbUser = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: { supabaseId: supabaseUser.id, role: "brand" },
      })
    : await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email,
          role: "brand",
        },
      });

  await admin.auth.admin.updateUserById(supabaseUser.id, {
    user_metadata: { role: "brand", name },
  });

  await prisma.brandContact.update({
    where: { id: contact.id },
    data: {
      userId: dbUser.id,
      name,
      email,
      status: "ACTIVE",
      acceptedAt: new Date(),
      inviteTokenHash: null,
      inviteExpiresAt: null,
      revokedAt: null,
    },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: "Failed to generate session." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError || !sessionData.session) {
    return NextResponse.json({ error: "Failed to establish session." }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    },
    redirect: "/brand",
    brand: contact.brand,
  });
}

async function ensureSupabaseBrandUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
  password: string,
) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "brand" },
  });

  if (!created.error && created.data.user) return created.data.user;
  if (!created.error?.message?.includes("already")) {
    throw new Error(created.error?.message || "Failed to create brand user.");
  }

  const { data } = await admin.auth.admin.listUsers();
  const existing = data.users.find((user) => user.email?.toLowerCase() === email);
  if (!existing) throw new Error("Existing Supabase user not found.");

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { role: "brand" },
  });
  if (updated.error || !updated.data.user) {
    throw new Error(updated.error?.message || "Failed to update brand user.");
  }

  return updated.data.user;
}
