"use client";

import { removeTikTokPage } from "../actions";
import { DisconnectButton } from "./disconnect-button";

export function RemoveTikTokPageButton({
  connectionId,
  label,
}: {
  connectionId: string;
  label: string;
}) {
  return (
    <DisconnectButton
      label={label}
      onConfirm={async () => {
        await removeTikTokPage(connectionId);
      }}
    />
  );
}
