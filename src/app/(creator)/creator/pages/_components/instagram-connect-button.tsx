"use client";

import { BioVerifyCard } from "./bio-verify-card";

export function InstagramConnectButton() {
  return (
    <BioVerifyCard
      platform="instagram"
      brand={{
        name: "Instagram",
        color: "#E1306C",
        gradient: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
      }}
      oauthHref="/api/auth/instagram"
      oauthAvailable={false}
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      }
    />
  );
}
