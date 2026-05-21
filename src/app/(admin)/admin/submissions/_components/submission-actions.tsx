"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const REVIEWABLE_STATUSES = new Set(["PENDING", "FLAGGED", "NEEDS_REVISION"]);

const REJECTION_REASONS = [
  { value: "BOT_TRAFFIC", label: "Botted traffic" },
  { value: "INVALID_POST", label: "Invalid post" },
  { value: "RULE_VIOLATION", label: "Rule violation" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "OTHER", label: "Other" },
] as const;

type RejectionReason = (typeof REJECTION_REASONS)[number]["value"];

interface SubmissionActionsProps {
  id: string;
  status: string;
  postUrl: string | null;
  canRejectApproved?: boolean;
}

export default function SubmissionActions({
  id,
  status,
  postUrl,
  canRejectApproved = false,
}: SubmissionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>("BOT_TRAFFIC");

  const canReview = REVIEWABLE_STATUSES.has(optimisticStatus);
  const canRejectCurrent =
    canReview || (optimisticStatus === "APPROVED" && canRejectApproved);

  function approve() {
    if (isPending) return;

    startTransition(async () => {
      setOptimisticStatus("APPROVED");

      try {
        const res = await fetch(`/api/submissions/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        });
        if (!res.ok) {
          setOptimisticStatus(status);
          toast.error(await responseError(res, "Failed to approve submission - reverting"));
          return;
        }
        toast.success("Submission approved");
        router.refresh();
      } catch (err) {
        console.error(err);
        setOptimisticStatus(status);
        toast.error("Network error - reverting");
      }
    });
  }

  function reject() {
    if (isPending) return;
    if (!rejectionReason) {
      toast.error("Choose a reason before rejecting.");
      return;
    }

    startTransition(async () => {
      setOptimisticStatus("REJECTED");

      try {
        const res = await fetch(`/api/submissions/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "REJECTED",
            rejectionReason,
          }),
        });
        if (!res.ok) {
          setOptimisticStatus(status);
          toast.error(await responseError(res, "Failed to reject submission - reverting"));
          return;
        }
        toast.success("Submission rejected");
        setShowRejectForm(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setOptimisticStatus(status);
        toast.error("Network error - reverting");
      }
    });
  }

  if (!canReview && optimisticStatus !== "APPROVED") {
    return <span className="text-xs text-neutral-400">-</span>;
  }

  if (optimisticStatus === "APPROVED" && !canRejectApproved) {
    return <span className="text-xs text-neutral-500">Paid/locked</span>;
  }

  return (
    <div className="min-w-[220px] space-y-2">
      {postUrl ? (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-medium underline"
          style={{ color: "var(--primary)" }}
        >
          View post
        </a>
      ) : null}

      {showRejectForm ? (
        <div className="space-y-2">
          <select
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value as RejectionReason)}
            className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-950 outline-none focus:border-neutral-500"
          >
            {REJECTION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reject}
              disabled={isPending}
              className="h-8 rounded-md px-3 text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
            >
              {isPending ? "..." : "Confirm reject"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="h-8 rounded-md border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canReview ? (
            <button
              type="button"
              onClick={approve}
              disabled={isPending}
              className="h-8 rounded-md px-3 text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
            >
              {isPending ? "..." : "Approve"}
            </button>
          ) : null}
          {canRejectCurrent ? (
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              disabled={isPending}
              className="h-8 rounded-md px-3 text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
            >
              {optimisticStatus === "APPROVED" ? "Reject approved" : "Reject"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}
