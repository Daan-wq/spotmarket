"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page";
import { formatCurrencyPrecise, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import SubmissionActions from "../../submissions/_components/submission-actions";

export interface CampaignSubmissionOverviewRow {
  id: string;
  creatorId: string;
  creatorEmail: string;
  creatorDisplayName: string | null;
  creatorProfileId: string | null;
  postUrl: string;
  status: string;
  sourcePlatform: string | null;
  createdAt: string;
  reviewedAt: string | null;
  eligibleViews: number | null;
  viewCount: number | null;
  claimedViews: number;
  earnedAmount: number;
  rejectionNote: string | null;
  settledAt: string | null;
  payoutRunItemCount: number;
  signals: Array<{
    id: string;
    type: string;
    severity: string;
  }>;
}

interface CreatorOption {
  id: string;
  label: string;
  email: string;
}

interface CampaignSubmissionsOverviewProps {
  submissions: CampaignSubmissionOverviewRow[];
  creators: CreatorOption[];
}

export function CampaignSubmissionsOverview({
  submissions,
  creators,
}: CampaignSubmissionsOverviewProps) {
  const [creatorId, setCreatorId] = useState("all");
  const filtered = useMemo(
    () =>
      creatorId === "all"
        ? submissions
        : submissions.filter((submission) => submission.creatorId === creatorId),
    [creatorId, submissions],
  );

  const selectedCreator = creators.find((creator) => creator.id === creatorId);

  return (
    <section>
      <SectionHeader
        title="Campaign submissions"
        description={
          selectedCreator
            ? `${filtered.length} submissions from ${selectedCreator.label}.`
            : `${submissions.length} submissions across ${creators.length} creators.`
        }
        action={
          creators.length > 0 ? (
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              Creator
              <select
                value={creatorId}
                onChange={(event) => setCreatorId(event.target.value)}
                className="h-10 min-w-[220px] rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition focus:border-neutral-500"
              >
                <option value="all">All creators</option>
                {creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      />
      <DataTable
        rows={filtered}
        rowKey={(submission) => submission.id}
        emptyState={
          <EmptyState
            title="No submissions match this filter"
            description="Choose another creator or wait for campaign work to arrive."
          />
        }
        columns={[
          {
            key: "creator",
            header: "Creator",
            className: "min-w-[220px]",
            cell: (submission) => {
              const name = submission.creatorDisplayName || submission.creatorEmail;
              return (
                <div>
                  {submission.creatorProfileId ? (
                    <Link
                      href={`/admin/creators/${submission.creatorProfileId}`}
                      className="font-semibold text-neutral-950 underline-offset-2 hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-neutral-950">{name}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">{submission.creatorEmail}</p>
                </div>
              );
            },
          },
          {
            key: "post",
            header: "Post",
            cell: (submission) => (
              <div className="space-y-1">
                <a
                  href={submission.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-neutral-950 underline-offset-2 hover:underline"
                >
                  Open post
                </a>
                <p className="text-xs text-neutral-500">
                  {submission.sourcePlatform ? titleCaseEnum(submission.sourcePlatform) : "Unknown source"}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (submission) => (
              <div className="flex flex-col items-start gap-2">
                <Badge variant={submissionStatusVariant(submission.status)}>
                  {titleCaseEnum(submission.status)}
                </Badge>
                {submission.settledAt ? <Badge variant="paid">Settled</Badge> : null}
                {submission.payoutRunItemCount > 0 ? <Badge variant="pending">In payout run</Badge> : null}
              </div>
            ),
          },
          {
            key: "views",
            header: "Views",
            align: "right",
            cell: (submission) => (
              <div className="tabular-nums text-neutral-950">
                <p className="font-semibold">{formatNumber(displayViews(submission))}</p>
                {submission.eligibleViews == null ? (
                  <p className="mt-1 text-xs text-neutral-500">Claimed/current</p>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500">Eligible</p>
                )}
              </div>
            ),
          },
          {
            key: "earned",
            header: "Earned",
            align: "right",
            cell: (submission) => (
              <span className="font-semibold tabular-nums text-neutral-950">
                {submission.earnedAmount > 0 ? formatCurrencyPrecise(submission.earnedAmount, "EUR") : "-"}
              </span>
            ),
          },
          {
            key: "submitted",
            header: "Submitted",
            cell: (submission) => (
              <div className="text-xs text-neutral-500">
                <p>{formatDate(submission.createdAt)}</p>
                {submission.reviewedAt ? <p className="mt-1">Reviewed {formatDate(submission.reviewedAt)}</p> : null}
              </div>
            ),
          },
          {
            key: "signals",
            header: "Signals",
            className: "min-w-[160px]",
            cell: (submission) =>
              submission.signals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {submission.signals.map((signal) => (
                    <Badge
                      key={signal.id}
                      variant={signal.severity === "CRITICAL" ? "failed" : "pending"}
                    >
                      {titleCaseEnum(signal.type)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-400">-</span>
              ),
          },
          {
            key: "reason",
            header: "Reason",
            className: "min-w-[220px] max-w-[280px]",
            cell: (submission) => (
              <p className="line-clamp-3 text-xs leading-5 text-neutral-500">
                {submission.rejectionNote || "-"}
              </p>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            cell: (submission) => (
              <SubmissionActions
                id={submission.id}
                status={submission.status}
                postUrl={submission.postUrl}
                canRejectApproved={canRejectApproved(submission)}
              />
            ),
          },
        ]}
      />
    </section>
  );
}

function displayViews(submission: CampaignSubmissionOverviewRow) {
  return submission.eligibleViews ?? submission.viewCount ?? submission.claimedViews;
}

function canRejectApproved(submission: CampaignSubmissionOverviewRow) {
  return (
    submission.status === "APPROVED" &&
    !submission.settledAt &&
    submission.payoutRunItemCount === 0
  );
}

function submissionStatusVariant(status: string) {
  if (status === "APPROVED") return "verified";
  if (status === "PENDING" || status === "NEEDS_REVISION" || status === "FLAGGED") return "pending";
  return "failed";
}
