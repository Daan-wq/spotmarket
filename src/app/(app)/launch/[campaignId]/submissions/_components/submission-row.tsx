"use client";

import { useState } from "react";
import { FlagDialog } from "./flag-dialog";

interface Creator {
  email: string;
  creatorProfile: {
    displayName: string;
  } | null;
}

interface Submission {
  id: string;
  creatorId: string;
  igMediaId: string;
  igPermalink: string | null;
  publishedAt: Date;
  status: string;
  reviewedAt: Date | null;
  autoApprovedAt: Date | null;
  creator: Creator;
}

interface SubmissionRowProps {
  submission: Submission;
  onStatusChange: () => void;
}

const getStatusColor = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "pending_review") {
    return {
      bg: "#fef3c7",
      text: "#92400e",
      label: "Pending",
    };
  }
  if (normalized === "approved") {
    return {
      bg: "#dcfce7",
      text: "#166534",
      label: "Approved",
    };
  }
  if (normalized === "flagged") {
    return {
      bg: "#fee2e2",
      text: "#991b1b",
      label: "Flagged",
    };
  }
  return {
    bg: "#f3f4f6",
    text: "#374151",
    label: status,
  };
};

export function SubmissionRow({
  submission,
  onStatusChange,
}: SubmissionRowProps) {
  const [approveLoading, setApproveLoading] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusColor = getStatusColor(submission.status);
  const creatorName =
    submission.creator.creatorProfile?.displayName || submission.creator.email || "Unknown";
  const publishedDate = new Date(submission.publishedAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  const isPending = submission.status.toLowerCase() === "pending_review";

  const handleApprove = async () => {
    setApproveLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/autopost/submissions/${submission.id}/approve`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve submission");
      }

      onStatusChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setApproveLoading(false);
    }
  };

  return (
    <>
      <div
        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        style={{ "--bg-primary": "#f7f9f9", "--text-primary": "#010405" } as React.CSSProperties}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {creatorName}
                </p>
                <p className="text-xs text-gray-500">
                  Published {publishedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div
                style={{
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              >
                {statusColor.label}
                {submission.autoApprovedAt && (
                  <span className="ml-1 text-xs font-normal">Auto</span>
                )}
              </div>

              {submission.igPermalink && (
                <a
                  href={submission.igPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  View Post
                </a>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
          </div>

          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="px-3 py-2 text-sm font-medium border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {approveLoading ? "..." : "Approve"}
              </button>
              <button
                onClick={() => setFlagDialogOpen(true)}
                className="px-3 py-2 text-sm font-medium border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Flag
              </button>
            </div>
          )}
        </div>
      </div>

      {flagDialogOpen && (
        <FlagDialog
          submissionId={submission.id}
          creatorName={creatorName}
          onFlag={() => {
            setFlagDialogOpen(false);
            onStatusChange();
          }}
          onCancel={() => setFlagDialogOpen(false)}
        />
      )}
    </>
  );
}
