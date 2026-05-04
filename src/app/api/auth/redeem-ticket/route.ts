import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const redeemSchema = z.object({
  ticketId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = redeemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { ticketId } = parsed.data;

  // Find and validate ticket
  const ticket = await prisma.signupTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.usedAt) {
    return NextResponse.json(
      { error: "This verification link has already been used." },
      { status: 410 }
    );
  }

  if (ticket.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This verification link has expired. Please sign up again." },
      { status: 410 }
    );
  }

  // Mark ticket as used
  await prisma.signupTicket.update({
    where: { id: ticketId },
    data: { usedAt: new Date() },
  });

  const admin = createSupabaseAdminClient();

  // Confirm the user's email
  const { data: users } = await admin.auth.admin.listUsers();
  const ticketEmailLower = ticket.email.toLowerCase();
  const user = users?.users?.find((u) => u.email?.toLowerCase() === ticketEmailLower);

  if (!user) {
    return NextResponse.json(
      { error: "User account not found." },
      { status: 404 }
    );
  }

  // Confirm email
  await admin.auth.admin.updateUserById(user.id, { email_confirm: true });

  // Generate a magic link to create a session
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: ticket.email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: "Failed to generate session." },
      { status: 500 }
    );
  }

  // Verify the token server-side to create a session
  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: verifyError } =
    await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    });

  if (verifyError || !sessionData.session) {
    return NextResponse.json(
      { error: "Failed to establish session." },
      { status: 500 }
    );
  }

  // Store tokens on the ticket so the original sign-up tab can poll and auto-login
  await prisma.signupTicket.update({
    where: { id: ticketId },
    data: {
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    },
  });

  return NextResponse.json({
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    },
    ref: ticket.ref,
  });
}
