"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { EllipsisIcon } from "@/components/animate-ui/icons/ellipsis";
import { Trash2Icon } from "@/components/animate-ui/icons/trash-2";

interface Props {
  label: string;
  platform: string;
  onConfirm: () => Promise<void>;
}

export function DisconnectButton({ label, platform, onConfirm }: Props) {
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Open options for ${label} on ${platform}`}
            title={`Options for ${label}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <EllipsisIcon size={17} animateOnHover animation="vertical" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-72 rounded-xl border border-neutral-200 bg-white p-1 text-neutral-950 shadow-lg"
        >
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            style={{ color: "var(--error-text)" }}
            onSelect={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
            <Trash2Icon size={16} aria-hidden />
            <span className="min-w-0 flex-1 text-left">
              Disconnect {label} on {platform} from Clipprofit
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
