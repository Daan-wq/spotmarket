"use client";

import { BioVerifyCard } from "./bio-verify-card";

export function InstagramConnectButton() {
  return (
    <BioVerifyCard
      brand={{
        name: "Instagram",
        platform: "INSTAGRAM",
      }}
      oauthHref="/api/auth/instagram"
      oauthAvailable={true}
    />
  );
}
