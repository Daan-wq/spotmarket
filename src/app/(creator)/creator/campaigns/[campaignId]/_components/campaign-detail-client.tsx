"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { buildConnectRequiredMessage } from "@/lib/campaign-eligibility";

interface CampaignDetailClientProps {
  campaignId: string;
  campaignName: string;
  canApply: boolean;
  hasApplication: boolean;
  applicationId?: string;
  hasRequiredPlatform: boolean;
  missingPlatformLabels: string[];
  hasDiscord: boolean;
}

export function CampaignDetailClient({
  campaignId,
  hasApplication,
  applicationId,
  hasRequiredPlatform,
  missingPlatformLabels,
  hasDiscord,
}: CampaignDetailClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [resolvedAppId, setResolvedAppId] = useState(applicationId);
  const router = useRouter();

  const handleSubmitContent = async () => {
    if (hasApplication && resolvedAppId) {
      router.push(`/creator/applications/${resolvedAppId}/submit`);
      return;
    }

    if (!hasRequiredPlatform) {
      setShowConnectDialog(true);
      return;
    }

    // Apply first, then redirect to submit page
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/applications`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to join campaign");
        return;
      }
      const data = await res.json();
      setResolvedAppId(data.id);
      router.push(`/creator/applications/${data.id}/submit`);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (hasRequiredPlatform && !hasDiscord && !hasApplication) {
    return (
      <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ background: "var(--accent-bg)", border: "1px solid var(--primary)" }}>
        <p className="text-sm" style={{ color: "var(--primary)" }}>
          Connect your Discord account to join campaigns.
        </p>
        <a
          href={`/api/auth/discord?return_to=${encodeURIComponent(`/creator/campaigns/${campaignId}`)}`}
          className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
          style={{ background: "var(--primary)" }}
        >
          Connect Discord
        </a>
      </div>
    );
  }

  const connectMessage = buildConnectRequiredMessage(missingPlatformLabels);

  return (
    <div className="mb-6 space-y-3">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          {error}
        </div>
      )}
      <button
        onClick={handleSubmitContent}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {loading ? (
          "Processing..."
        ) : hasApplication ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Submit clip
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
            Join campaign
          </>
        )}
      </button>
      <Dialog
        open={showConnectDialog}
        onClose={() => setShowConnectDialog(false)}
        title="Connect account"
        description={connectMessage}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConnectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/creator/connections")}
            >
              Go to accounts
            </Button>
          </>
        }
      />
    </div>
  );
}
