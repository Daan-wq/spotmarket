import type { User } from "@supabase/supabase-js";

export interface DiscordIdentity {
  discordId: string;
  discordUsername: string | null;
}

// Reads Discord info from auth.identities — the canonical source for which providers
// are linked to a user. Works regardless of which provider was used for the most recent sign-in.
export function extractDiscordIdentity(user: User | null | undefined): DiscordIdentity | null {
  if (!user) return null;

  const discord = user.identities?.find((i) => i.provider === "discord");
  if (!discord) return null;

  const data = (discord.identity_data ?? {}) as Record<string, unknown>;
  const customClaims = (data.custom_claims ?? {}) as Record<string, unknown>;

  const discordId =
    (typeof data.provider_id === "string" && data.provider_id) ||
    (typeof data.sub === "string" && data.sub) ||
    null;

  if (!discordId) return null;

  const discordUsername =
    (typeof customClaims.global_name === "string" && customClaims.global_name) ||
    (typeof data.full_name === "string" && data.full_name) ||
    (typeof data.name === "string" && data.name) ||
    (typeof data.user_name === "string" && data.user_name) ||
    (typeof data.username === "string" && data.username) ||
    null;

  return { discordId, discordUsername };
}
