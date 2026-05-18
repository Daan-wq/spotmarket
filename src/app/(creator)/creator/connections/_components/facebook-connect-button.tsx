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

export function FacebookConnectButton({
  dismissed = false,
  warningCopy,
}: {
  dismissed?: boolean;
  warningCopy?: ConnectWarningCopy;
}) {
  return (
    <BioVerifyCard
      brand={{ name: "Facebook Page", platform: "FACEBOOK" }}
      oauthHref="/api/auth/facebook"
      oauthAvailable={true}
      oauthWarning={
        warningCopy
          ? {
              platform: "FACEBOOK",
              dismissed,
              ...warningCopy,
            }
          : undefined
      }
    />
  );
}
