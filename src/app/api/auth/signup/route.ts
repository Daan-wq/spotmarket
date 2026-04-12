import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { password, ref } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // Rate limit: 1 ticket per email per 60s
  const recentTicket = await prisma.signupTicket.findFirst({
    where: {
      email,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentTicket) {
    return NextResponse.json(
      { error: "Please wait before requesting another verification email." },
      { status: 429 }
    );
  }

  // Create Supabase user (unconfirmed)
  const admin = createSupabaseAdminClient();
  const { data: userData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: createError.message || "Failed to create account." },
      { status: 500 }
    );
  }

  // Create ticket
  const ticket = await prisma.signupTicket.create({
    data: {
      email,
      ref: ref || null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  });

  // Send verification email via Resend
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.clipprofit.com";
  const confirmUrl = `${baseUrl}/auth/confirm?ticket=${ticket.id}`;

  await getResend().emails.send({
    from: "ClipProfit <noreply@clipprofit.com>",
    to: email,
    subject: "Confirm your ClipProfit account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #ffffff; margin-bottom: 8px;">Confirm your account</h2>
        <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
          Click the button below to verify your email and activate your ClipProfit account.
        </p>
        <a href="${confirmUrl}"
           style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 16px;">
          Confirm my account
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link expires in 15 minutes. If you didn't create a ClipProfit account, you can ignore this email.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, ticketId: ticket.id });
}
