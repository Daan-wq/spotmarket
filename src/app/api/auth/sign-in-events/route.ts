import { z } from "zod";
import { logBrandAuthEvent } from "@/lib/brand-auth-events";

const eventSchema = z.object({
  event: z.enum(["form_opened", "network_error"]),
  attemptId: z.string().uuid(),
  brandFlow: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }

  logBrandAuthEvent(
    parsed.data.event === "network_error" ? "warn" : "info",
    parsed.data,
  );
  return new Response(null, { status: 204 });
}
