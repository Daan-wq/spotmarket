import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticket");

  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticket." }, { status: 400 });
  }

  const ticket = await prisma.signupTicket.findUnique({
    where: { id: ticketId },
    select: {
      usedAt: true,
      expiresAt: true,
      accessToken: true,
      refreshToken: true,
      ref: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ticket expired." }, { status: 410 });
  }

  if (!ticket.usedAt || !ticket.accessToken || !ticket.refreshToken) {
    return NextResponse.json({ pending: true });
  }

  return NextResponse.json({
    session: {
      access_token: ticket.accessToken,
      refresh_token: ticket.refreshToken,
    },
    ref: ticket.ref,
  });
}
