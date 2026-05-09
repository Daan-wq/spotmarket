/**
 * Internal Discord delivery — single destination for any message that is not
 * intended to be visible to every Discord member.
 *
 * Use this for: admin signal alerts (VELOCITY_SPIKE, BOT_SUSPECTED, …),
 * notification dispatcher fan-out, feedback / bug reports, and any other
 * staff-only payload.
 *
 * Genuinely public posts (campaign launches, role-mentioned announcements)
 * stay in `lib/discord.ts` and target their own region channels.
 */

export const INTERNAL_ALERTS_CHANNEL_ID = "1500945642195914782";

export type DiscordPostResult = { ok: true } | { ok: false; error: string };

export async function postViaBot(
  channelId: string,
  body: Record<string, unknown>,
): Promise<DiscordPostResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { ok: false, error: "DISCORD_BOT_TOKEN not configured" };
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Discord HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function postInternalAlert(
  body: Record<string, unknown>,
): Promise<DiscordPostResult> {
  return postViaBot(INTERNAL_ALERTS_CHANNEL_ID, body);
}
