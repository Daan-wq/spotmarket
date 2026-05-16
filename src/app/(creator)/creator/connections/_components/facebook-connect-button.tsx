"use client";

import { BioVerifyCard } from "./bio-verify-card";

export function FacebookConnectButton() {
  return (
    <BioVerifyCard
      brand={{ name: "Facebook Page", platform: "FACEBOOK" }}
      oauthHref="/api/auth/facebook"
      oauthAvailable={true}
    />
  );
}
