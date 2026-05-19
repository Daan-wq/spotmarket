"use client";

import { BioVerifyCard } from "./bio-verify-card";

interface ConnectWarningCopy {
  title: string;
  description: string;
  continueLabel: string;
  doNotWarnLabel: string;
  cancelLabel: string;
  saveErrorLabel: string;
}

export function InstagramConnectButton({
  dismissed = false,
  warningCopy,
}: {
  dismissed?: boolean;
  warningCopy?: ConnectWarningCopy;
}) {
  return (
    <BioVerifyCard
      brand={{
        name: "Instagram",
        platform: "INSTAGRAM",
      }}
      oauthHref="/api/auth/instagram"
      oauthAvailable={true}
      oauthWarning={
        warningCopy
          ? {
              platform: "INSTAGRAM",
              dismissed,
              ...warningCopy,
            }
          : undefined
      }
    />
  );
}
