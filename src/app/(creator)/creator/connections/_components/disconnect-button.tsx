"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Trash2Icon } from "@/components/animate-ui/icons/trash-2";

interface Props {
  label: string;
  onConfirm: () => Promise<void>;
}

export function DisconnectButton({ label, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AnimateIcon animateOnHover asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Disconnect ${label}`}
          title={`Disconnect ${label}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
          style={{
            background: "var(--error-bg)",
            color: "var(--error-text)",
          }}
        >
          <Trash2Icon size={16} />
        </button>
      </AnimateIcon>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        pending={pending}
        title="Are you sure you want to disconnect this page?"
        description={
          <>
            Disconnecting <strong>{label}</strong> stops stat tracking and submissions
            from this account. You can reconnect later from this page.
          </>
        }
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </>
  );
}
