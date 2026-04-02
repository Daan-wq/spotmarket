"use client";

import { useState, useCallback } from "react";
import { SubmissionRow } from "./submission-row";

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

type StatusFilter = "all" | "pending" | "approved" | "flagged";

interface SubmissionsListProps {
  submissions: Submission[];
}

export function SubmissionsList({ submissions }: SubmissionsListProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const normalizedSubmissions = submissions.map((sub) => ({
    ...sub,
    publishedAt: sub.publishedAt instanceof Date ? sub.publishedAt : new Date(sub.publishedAt),
    reviewedAt: sub.reviewedAt instanceof Date ? sub.reviewedAt : (sub.reviewedAt ? new Date(sub.reviewedAt) : null),
    autoApprovedAt: sub.autoApprovedAt instanceof Date ? sub.autoApprovedAt : (sub.autoApprovedAt ? new Date(sub.autoApprovedAt) : null),
  }));

  const filtered = normalizedSubmissions.filter((sub) => {
    if (filter === "all") return true;
    const status = sub.status.toLowerCase();
    if (filter === "pending") return status === "pending_review";
    if (filter === "approved") return status === "approved";
    if (filter === "flagged") return status === "flagged";
    return true;
  });

  const counts = {
    all: normalizedSubmissions.length,
    pending: normalizedSubmissions.filter(
      (s) => s.status.toLowerCase() === "pending_review"
    ).length,
    approved: normalizedSubmissions.filter(
      (s) => s.status.toLowerCase() === "approved"
    ).length,
    flagged: normalizedSubmissions.filter(
      (s) => s.status.toLowerCase() === "flagged"
    ).length,
  };

  return (
    <div key={refreshKey}>
      <div className="flex gap-3 mb-6 border-b border-gray-200">
        {(
          [
            { label: "All", value: "all" as const, count: counts.all },
            { label: "Pending", value: "pending" as const, count: counts.pending },
            { label: "Approved", value: "approved" as const, count: counts.approved },
            { label: "Flagged", value: "flagged" as const, count: counts.flagged },
          ] as const
        ).map(({ label, value, count }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((submission) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
