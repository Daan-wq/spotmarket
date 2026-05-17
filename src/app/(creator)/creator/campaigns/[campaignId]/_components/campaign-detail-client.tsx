"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toIntlLocale } from "@/lib/i18n-format";

interface CampaignDetailClientProps {
  campaignId: string;
  campaignName: string;
  canApply: boolean;
  hasApplication: boolean;
  applicationId?: string;
  hasRequiredPlatform: boolean;
  missingPlatformLabels: string[];
  hasDiscord: boolean;
  isClosedForSubmissions: boolean;
}

export function CampaignDetailClient({
  campaignId,
  hasApplication,
  applicationId,
  hasRequiredPlatform,
  missingPlatformLabels,
  hasDiscord,
  isClosedForSubmissions,
}: CampaignDetailClientProps) {
  const t = useTranslations("creator.campaigns.apply");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [resolvedAppId, setResolvedAppId] = useState(applicationId);
  const router = useRouter();

  const handleSubmitContent = async () => {
    if (isClosedForSubmissions) return;

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
        setError(getJoinErrorMessage(data, t, missingPlatformLabels, locale));
        return;
      }
      const data = await res.json();
      setResolvedAppId(data.id);
      router.push(`/creator/applications/${data.id}/submit`);
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  if (hasRequiredPlatform && !hasDiscord && !hasApplication) {
    return (
      <div
        className="mb-6 p-4 rounded-xl flex items-center justify-between"
        style={{
          background: "var(--accent-bg)",
          border: "1px solid var(--primary)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--primary)" }}>
          {t("discordPrompt")}
        </p>
        <a
          href={`/api/auth/discord?return_to=${encodeURIComponent(`/creator/campaigns/${campaignId}`)}`}
          className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
          style={{ background: "var(--primary)" }}
        >
          {t("connectDiscord")}
        </a>
      </div>
    );
  }

  const connectMessage = formatConnectRequiredMessage(
    missingPlatformLabels,
    locale,
    t,
  );
  const disabled = loading || isClosedForSubmissions;

  return (
    <div className="mb-6 space-y-3">
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleSubmitContent}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-100"
        style={{
          background: isClosedForSubmissions ? "#e5e5e5" : "var(--primary)",
          color: isClosedForSubmissions ? "var(--text-muted)" : "#fff",
        }}
      >
        {loading ? (
          t("processing")
        ) : hasApplication ? (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {t("submitClip")}
          </>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            {t("join")}
          </>
        )}
      </button>
      {isClosedForSubmissions ? (
        <p className="text-center text-sm text-neutral-500">
          {t("closedDescription")}
        </p>
      ) : null}
      <Dialog
        open={showConnectDialog}
        onClose={() => setShowConnectDialog(false)}
        title={t("connectAccountTitle")}
        description={connectMessage}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConnectDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/creator/connections")}
            >
              {t("goToAccounts")}
            </Button>
          </>
        }
      />
    </div>
  );
}

function formatConnectRequiredMessage(
  labels: readonly string[],
  locale: string,
  t: ReturnType<typeof useTranslations>,
) {
  const platforms =
    labels.length > 0
      ? new Intl.ListFormat(toIntlLocale(locale), {
          type: "disjunction",
        }).format([...labels])
      : t("social");

  return t("connectRequiredDescription", {
    platforms,
    count: Math.max(labels.length, 1),
  });
}

function getJoinErrorMessage(
  data: unknown,
  t: ReturnType<typeof useTranslations>,
  missingPlatformLabels: readonly string[],
  locale: string,
) {
  if (!data || typeof data !== "object") return t("error");
  const payload = data as {
    code?: string;
    error?: string;
    requiredPlatformLabels?: string[];
  };

  if (payload.code === "CONNECT_REQUIRED") {
    return formatConnectRequiredMessage(
      payload.requiredPlatformLabels?.length
        ? payload.requiredPlatformLabels
        : missingPlatformLabels,
      locale,
      t,
    );
  }

  if (payload.error === "Already applied") return t("alreadyApplied");
  if (payload.error === "Creator profile not found") return t("profileMissing");
  if (payload.error === "Campaign not found") return t("notFound");

  return t("error");
}
