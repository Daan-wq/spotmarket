"use client";

import { BioVerifyCard } from "./bio-verify-card";

export function TikTokConnectButton() {
  return (
    <BioVerifyCard
      brand={{ name: "TikTok", platform: "TIKTOK" }}
      oauthHref="/api/auth/tiktok"
      oauthAvailable={true}
    />
  );
}
