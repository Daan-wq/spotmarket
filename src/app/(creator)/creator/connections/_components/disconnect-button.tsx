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
import { LinkIcon } from "@/components/animate-ui/icons/link";

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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Open options for ${label}`}
            title={`Options for ${label}`}
            className="button-hover-highlight inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white disabled:opacity-50"
            style={{
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
          className="w-60 rounded-xl border border-neutral-200 bg-white p-1 text-neutral-950 shadow-lg [&_[data-slot=dropdown-menu-highlight]]:!bg-neutral-100"
        >
          <DropdownMenuItem
            className="button-hover-highlight cursor-pointer gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-neutral-100 focus:bg-neutral-100 data-[highlighted]:bg-neutral-100"
            onSelect={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
            <LinkIcon size={16} animateOnHover className="text-red-500" aria-hidden />
            <span className="min-w-0 flex-1 text-left">Disconnect {label}</span>
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
