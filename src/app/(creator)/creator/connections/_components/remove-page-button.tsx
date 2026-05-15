"use client";

import { removePage } from "../actions";
import { DisconnectButton } from "./disconnect-button";

export function RemovePageButton({
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
        await removePage(connectionId);
      }}
    />
  );
}
