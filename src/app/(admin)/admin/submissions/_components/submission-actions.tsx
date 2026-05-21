"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SubmissionActionsProps {
  id: string;
  status: string;
}

export default function SubmissionActions({ id, status }: SubmissionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  function approve() {
    if (isPending) return;
    submitReview("APPROVED");
  }

  function reject() {
    if (isPending) return;

    const note = rejectionNote.trim();
    if (!note) {
      toast.error("Add a rejection note before rejecting");
      return;
    }

    submitReview("REJECTED", note);
  }

  function submitReview(nextStatus: "APPROVED" | "REJECTED", note?: string) {
    startTransition(async () => {
      setOptimisticStatus(nextStatus);

      try {
        const res = await fetch(`/api/submissions/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, rejectionNote: note }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setOptimisticStatus(status);
          toast.error(body.error ?? "Failed to update submission");
          return;
        }

        toast.success(nextStatus === "APPROVED" ? "Submission approved" : "Submission rejected");
        setShowRejectNote(false);
        setRejectionNote("");
        router.refresh();
      } catch (err) {
        console.error(err);
        setOptimisticStatus(status);
        toast.error("Network error. Submission was not updated.");
      }
    });
  }

  if (optimisticStatus === "APPROVED" || optimisticStatus === "REJECTED") {
    return <span className="text-sm font-semibold text-neutral-500">{toTitleCase(optimisticStatus)}</span>;
  }

  return (
    <div className="w-full space-y-3 sm:max-w-md">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button type="button" size="sm" onClick={approve} isPending={isPending}>
          Approve
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => setShowRejectNote(true)} disabled={isPending}>
          Reject
        </Button>
      </div>

      {showRejectNote ? (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <textarea
            value={rejectionNote}
            onChange={(event) => setRejectionNote(event.target.value)}
            placeholder="Rejection note"
            rows={3}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-500"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={reject} isPending={isPending} disabled={!rejectionNote.trim()}>
              Confirm reject
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowRejectNote(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toTitleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
