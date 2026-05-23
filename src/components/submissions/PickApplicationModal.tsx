"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface ApplicationOption {
  applicationId: string;
  campaignName: string;
  status: string;
  closedForSubmissions?: boolean;
  closedForSubmissionsReason?: "paused" | "ended";
}

interface Props {
  open: boolean;
  onClose: () => void;
  postUrl: string;
  platform: "ig" | "tt" | "fb" | "yt";
  applications: ApplicationOption[];
}

export function PickApplicationModal({
  open,
  onClose,
  postUrl,
  platform,
  applications,
}: Props) {
  const router = useRouter();
  const openApplications = useMemo(
    () => applications.filter((app) => !app.closedForSubmissions),
    [applications],
  );
  const [selected, setSelected] = useState<string | null>(
    openApplications[0]?.applicationId ?? null,
  );
  const selectedApplicationId =
    selected && openApplications.some((app) => app.applicationId === selected)
      ? selected
      : openApplications[0]?.applicationId ?? null;

  if (!open) return null;

  const handleContinue = () => {
    if (!selectedApplicationId) return;
    const params = new URLSearchParams({
      prefillUrl: postUrl,
      platform,
    });
    router.push(
      `/creator/applications/${selectedApplicationId}/submit?${params.toString()}`,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-950">
          Submit post to a campaign
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Pick which campaign this post should be submitted to. We&apos;ll take you
          to the submit page with this post pre-selected.
        </p>

        {applications.length === 0 ? (
          <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-medium">You haven&apos;t applied to any campaigns yet.</p>
            <p className="mt-1 text-neutral-500">
              Apply to a campaign first, then come back to submit this post.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <Link
                href="/creator/campaigns"
                className="rounded-md bg-neutral-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Browse campaigns
              </Link>
            </div>
          </div>
        ) : openApplications.length === 0 ? (
          <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-medium">No campaigns are accepting submissions.</p>
            <p className="mt-1 text-neutral-500">
              Your applied campaigns are paused or have ended.
            </p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
              {applications.map((app) => {
                const isSelected = selectedApplicationId === app.applicationId;
                const isClosed = Boolean(app.closedForSubmissions);
                return (
                  <label
                    key={app.applicationId}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      isClosed
                        ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
                        : isSelected
                          ? "border-neutral-950 bg-neutral-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="application"
                        value={app.applicationId}
                        checked={isSelected}
                        disabled={isClosed}
                        onChange={() => {
                          if (!isClosed) setSelected(app.applicationId);
                        }}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-neutral-950">
                        {app.campaignName}
                      </span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {isClosed
                        ? app.closedForSubmissionsReason === "paused"
                          ? "Paused"
                          : "Ended"
                        : app.status}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedApplicationId}
                className="rounded-md bg-neutral-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
