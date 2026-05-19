"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PaymentRequestActionsProps {
  id: string;
  iban: string | null;
  accountName: string | null;
}

export function PaymentRequestActions({
  id,
  iban,
  accountName,
}: PaymentRequestActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bankReference, setBankReference] = useState("");

  function copyBankDetails() {
    const details = [accountName, iban].filter(Boolean).join("\n");
    if (!details) return;
    navigator.clipboard.writeText(details);
    toast.success("Bank details copied");
  }

  function updateStatus(status: "confirmed" | "failed") {
    if (isPending) return;
    if (status === "confirmed" && !bankReference.trim()) {
      toast.error("Add a bank reference before marking as paid.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/payouts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(status === "confirmed"
              ? { bankReference: bankReference.trim() }
              : {}),
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(body.error ?? "Could not update request.");
          return;
        }
        toast.success(status === "confirmed" ? "Payment marked paid" : "Payment request rejected");
        router.refresh();
      } catch {
        toast.error("Network error while updating request.");
      }
    });
  }

  return (
    <div className="flex min-w-[260px] flex-col gap-2">
      <button
        type="button"
        onClick={copyBankDetails}
        className="self-start text-xs font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-950"
      >
        Copy bank details
      </button>
      <input
        type="text"
        value={bankReference}
        onChange={(event) => setBankReference(event.target.value)}
        placeholder="Bank reference or note"
        className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          isPending={isPending}
          onClick={() => updateStatus("confirmed")}
        >
          Mark paid
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => updateStatus("failed")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
