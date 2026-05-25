"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PaymentRequestActionsProps {
  id: string;
  method: "BANK_TRANSFER" | "CRYPTO" | "STRIPE" | null;
  iban: string | null;
  accountName: string | null;
  walletAddress: string | null;
}

export function PaymentRequestActions({
  id,
  method,
  iban,
  accountName,
  walletAddress,
}: PaymentRequestActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bankReference, setBankReference] = useState("");
  const [txHash, setTxHash] = useState("");
  const isCrypto = method === "CRYPTO";

  function copyPayoutDetails() {
    const details = isCrypto ? walletAddress : [accountName, iban].filter(Boolean).join("\n");
    if (!details) return;
    navigator.clipboard.writeText(details);
    toast.success(isCrypto ? "Wallet address copied" : "Bank details copied");
  }

  function updateStatus(status: "confirmed" | "failed") {
    if (isPending) return;
    if (!isCrypto && status === "confirmed" && !bankReference.trim()) {
      toast.error("Add a bank reference before marking as paid.");
      return;
    }
    if (isCrypto && status === "confirmed" && !txHash.trim()) {
      toast.error("Add a Solana transaction hash before marking as paid.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/payouts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(status === "confirmed" && isCrypto
              ? { txHash: txHash.trim() }
              : {}),
            ...(status === "confirmed" && !isCrypto
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
        onClick={copyPayoutDetails}
        className="self-start text-xs font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-950"
      >
        {isCrypto ? "Copy wallet address" : "Copy bank details"}
      </button>
      <input
        type="text"
        value={isCrypto ? txHash : bankReference}
        onChange={(event) => {
          if (isCrypto) setTxHash(event.target.value);
          else setBankReference(event.target.value);
        }}
        placeholder={isCrypto ? "Solana transaction hash" : "Bank reference or note"}
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
