"use client";

import { BioVerifyCard } from "./bio-verify-card";

export function TikTokConnectButton() {
  return (
    <BioVerifyCard
      platform="tiktok"
      brand={{ name: "TikTok", color: "#010101" }}
      oauthHref="/api/auth/tiktok"
      oauthAvailable={false}
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.19a8.16 8.16 0 0 0 4.77 1.52V7.27a4.85 4.85 0 0 1-1-.58z" />
        </svg>
      }
    />
  );
}
