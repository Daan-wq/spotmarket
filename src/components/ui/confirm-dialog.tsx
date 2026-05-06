"use client";

import * as React from "react";
import { Dialog } from "./dialog";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  pending?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  pending = false,
}: ConfirmDialogProps) {
  const [internalPending, setInternalPending] = React.useState(false);
  const isPending = pending || internalPending;

  const handleConfirm = async () => {
    setInternalPending(true);
    try {
      await onConfirm();
    } finally {
      setInternalPending(false);
    }
  };

  const confirmStyle: React.CSSProperties =
    variant === "destructive"
      ? { background: "var(--error-text, #dc2626)", color: "#fff", border: "none" }
      : { background: "var(--primary)", color: "#fff", border: "none" };

  return (
    <Dialog
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
            style={confirmStyle}
          >
            {isPending ? "…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}
