"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getPageMatchResult, type PageMatchResult, type MatchCheck } from "@/lib/campaign-matching";
import type { SocialAccount, Campaign } from "@prisma/client";

interface PagePickerModalProps {
  campaign: Campaign;
  pages: SocialAccount[];
  onSubmit: (selectedPageIds: string[]) => Promise<void>;
  onCancel: () => void;
}

export function PagePickerModal({ campaign, pages, onSubmit, onCancel }: PagePickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const results = pages.map(p => getPageMatchResult(p, campaign));

  useEffect(() => {
    const autoSelected = results.filter(r => r.allPassed).map(r => r.page.id);
    setSelected(new Set(autoSelected));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    await onSubmit(Array.from(selected));
    setSubmitting(false);
  };

  const toggle = (pageId: string, allowed: boolean) => {
    if (!allowed) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  // Format requirement labels for header
  const reqSummary = [
    campaign.minFollowers > 0 && `${campaign.minFollowers.toLocaleString()}+ followers`,
    campaign.targetCountry && `${campaign.targetCountry} ${campaign.targetCountryPercent ?? 20}%+`,
    campaign.targetMalePercent && `Male ${campaign.targetMalePercent}%+`,
    campaign.targetMinAge18Percent && `18+ ${campaign.targetMinAge18Percent}%+`,
  ].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Select pages for &ldquo;{campaign.name}&rdquo;
          </h2>
          {reqSummary && (
            <p className="text-sm text-gray-500 mt-1">Requirements: {reqSummary}</p>
          )}
        </div>

        {/* Pages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {results.map(result => (
            <PagePickerCard
              key={result.page.id}
              result={result}
              isSelected={selected.has(result.page.id)}
              onToggle={() => toggle(result.page.id, result.allPassed)}
            />
          ))}
          {results.length === 0 && (
            <p className="text-center text-gray-400 py-8">No pages connected. Connect a page first.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end bg-gray-50 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || submitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Claiming..." : `Claim with ${selected.size} page${selected.size !== 1 ? "s" : ""} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PagePickerCard({
  result,
  isSelected,
  onToggle,
}: {
  result: PageMatchResult;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { page, allPassed, checks } = result;
  return (
    <div
      className={`border-2 rounded-lg p-4 transition ${
        allPassed
          ? "border-green-300 bg-green-50 cursor-pointer"
          : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
      }`}
      onClick={allPassed ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {page.igProfilePicUrl ? (
              <Image src={page.igProfilePicUrl} alt="" width={28} height={28} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                {page.platformUsername?.[0]?.toUpperCase()}
              </div>
            )}
            <p className="font-semibold text-sm text-gray-900">@{page.platformUsername}</p>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            {page.followerCount.toLocaleString()} followers · {Number(page.engagementRate).toFixed(1)}% eng
          </p>
          <div className="space-y-0.5">
            {checks.map((check, i) => (
              <CheckRow key={i} check={check} />
            ))}
            {checks.length === 0 && (
              <p className="text-xs text-green-600">No specific requirements</p>
            )}
          </div>
        </div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          disabled={!allPassed}
          className="mt-1 w-4 h-4 accent-blue-600"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: MatchCheck }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={check.pass ? "text-green-600" : "text-red-500"}>
        {check.pass ? "✓" : "✗"}
      </span>
      <span className={check.pass ? "text-gray-600" : "text-red-500"}>
        {check.label}: {check.actual ?? "—"}{typeof check.actual === "number" && check.label !== "Followers" ? "%" : ""}
        {!check.pass && check.required !== null && ` (need ${check.required}${check.label !== "Followers" ? "%" : ""})`}
      </span>
    </div>
  );
}
