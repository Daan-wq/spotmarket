"use client";

import { removeYtPage } from "../actions";
import { DisconnectButton } from "./disconnect-button";

export function RemoveYtPageButton({
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
        await removeYtPage(connectionId);
      }}
    />
  );
}
