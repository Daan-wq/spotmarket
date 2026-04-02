"use client";

import { useState } from "react";

interface FlagDialogProps {
  submissionId: string;
  creatorName: string;
  onFlag: () => void;
  onCancel: () => void;
}

export function FlagDialog({
  submissionId,
  creatorName,
  onFlag,
  onCancel,
}: FlagDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorSuspended, setCreatorSuspended] = useState(false);

  const handleFlag = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/autopost/submissions/${submissionId}/flag`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || null }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to flag submission");
      }

      const data = await res.json();
      if (data.creatorSuspended) {
        setCreatorSuspended(true);
      } else {
        onFlag();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  if (creatorSuspended) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 sm:mx-0">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Creator Suspended
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              {creatorName} has received 3 or more flags and has been suspended from this campaign. They will not receive payment for any submissions.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 sm:mx-0">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Flag Submission
        </h3>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Flagging will forfeit the creator&apos;s payout for this post. The post remains live on Instagram.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you flagging this submission?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleFlag}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "..." : "Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}
