import { describe, expect, test } from "vitest";
import { getDiscordAuthUrl, REQUIRED_DISCORD_SCOPES } from "./discord";

describe("Discord OAuth URL", () => {
  test("requires explicit consent when connecting an account", () => {
    const authUrl = getDiscordAuthUrl({
      clientId: "discord-client-id",
      redirectUri: "https://app.clipprofit.com/api/auth/discord/callback",
      state: "state-token",
    });
    const parsed = new URL(authUrl);

    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://discord.com/api/oauth2/authorize"
    );
    expect(parsed.searchParams.get("client_id")).toBe("discord-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.clipprofit.com/api/auth/discord/callback"
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(REQUIRED_DISCORD_SCOPES.join(" "));
    expect(parsed.searchParams.get("state")).toBe("state-token");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
  });
});
