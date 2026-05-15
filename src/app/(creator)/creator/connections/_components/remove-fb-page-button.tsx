"use client";

import { removeFbPage } from "../actions";
import { DisconnectButton } from "./disconnect-button";

export function RemoveFbPageButton({
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
        await removeFbPage(connectionId);
      }}
    />
  );
}
