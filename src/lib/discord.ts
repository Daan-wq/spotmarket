export const REQUIRED_DISCORD_SCOPES = ["identify", "guilds.join"] as const;

interface DiscordAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function getDiscordAuthUrl({
  clientId,
  redirectUri,
  state,
}: DiscordAuthUrlParams): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: REQUIRED_DISCORD_SCOPES.join(" "),
    state,
    prompt: "consent",
  });

  return `https://discord.com/api/oauth2/authorize?${params}`;
}
