import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM"]),
  dismissed: z.boolean(),
});

const select = {
  dismissedFacebookPageWarning: true,
  dismissedInstagramProfessionalWarning: true,
};

export async function PATCH(req: Request) {
  try {
    const { userId: supabaseId } = await requireAuth("creator");
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data =
      parsed.data.platform === "FACEBOOK"
        ? { dismissedFacebookPageWarning: parsed.data.dismissed }
        : { dismissedInstagramProfessionalWarning: parsed.data.dismissed };

    const user = await prisma.user.update({
      where: { supabaseId },
      data,
      select,
    });

    return NextResponse.json({
      preferences: {
        facebookPage: user.dismissedFacebookPageWarning,
        instagramProfessional: user.dismissedInstagramProfessionalWarning,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
