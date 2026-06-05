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
  requiresBioGate: boolean;
  bioRequirement?: string | null;
  bioKeywords: string[];
  bioGateAccounts: BioGateAccount[];
  verifiedBioGateAccountKeys: string[];
  hasRequiredPlatform: boolean;
  missingPlatformLabels: string[];
  hasDiscord: boolean;
  isClosedForSubmissions: boolean;
  closedForSubmissionsReason: "paused" | "ended";
}

interface BioGateAccount {
  connectionType: "IG" | "TT" | "YT" | "FB";
  connectionId: string;
  platform: "ig" | "tt" | "yt" | "fb";
  label: string;
  handle: string | null;
  audienceCount: number | null;
  isVerified: boolean;
}

interface BioGateResult extends BioGateAccount {
  status: "VERIFIED" | "FAILED" | "SKIPPED";
  missingKeywords: string[];
  failureReason: string | null;
}

export function CampaignDetailClient({
  campaignId,
  hasApplication,
  applicationId,
  requiresBioGate,
  bioRequirement,
  bioKeywords,
  bioGateAccounts,
  verifiedBioGateAccountKeys,
  hasRequiredPlatform,
  missingPlatformLabels,
  hasDiscord,
  isClosedForSubmissions,
  closedForSubmissionsReason,
}: CampaignDetailClientProps) {
  const t = useTranslations("creator.campaigns.apply");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showBioDialog, setShowBioDialog] = useState(false);
  const [selectedAccountKeys, setSelectedAccountKeys] = useState<Set<string>>(
    () => new Set(verifiedBioGateAccountKeys),
  );
  const [bioResults, setBioResults] = useState<BioGateResult[]>([]);
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

    if (requiresBioGate) {
      setShowBioDialog(true);
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

  const submitBioGate = async (skipFailed = false) => {
    const selectedAccounts = bioGateAccounts
      .filter((account) => selectedAccountKeys.has(accountKey(account)))
      .map((account) => ({
        connectionType: account.connectionType,
        connectionId: account.connectionId,
      }));
    if (selectedAccounts.length === 0) {
      setError(t("selectBioAccount"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const failedIds = bioResults
        .filter((result) => result.status === "FAILED")
        .map((result) => result.connectionId);
      const res = await fetch(`/api/campaigns/${campaignId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedAccounts,
          skipFailedConnectionIds: skipFailed ? failedIds : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.failedAccounts) || Array.isArray(data.verifiedAccounts)) {
          setBioResults([
            ...((data.verifiedAccounts ?? []) as BioGateResult[]),
            ...((data.failedAccounts ?? []) as BioGateResult[]),
          ]);
        }
        setError(getJoinErrorMessage(data, t, missingPlatformLabels, locale));
        return;
      }
      setResolvedAppId(data.id);
      setShowBioDialog(false);
      router.push(`/creator/applications/${data.id}/submit`);
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const failedResults = bioResults.filter((result) => result.status === "FAILED");
  const verifiedResults = bioResults.filter((result) => result.status === "VERIFIED");

  if (hasRequiredPlatform && !hasDiscord && !hasApplication && !isClosedForSubmissions) {
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
  const closedDescription =
    closedForSubmissionsReason === "paused"
      ? t("pausedDescription")
      : t("endedDescription");

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
        ) : isClosedForSubmissions ? (
          t("closed")
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
          {closedDescription}
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
      <Dialog
        open={showBioDialog}
        onClose={() => setShowBioDialog(false)}
        title={t("bioGateTitle")}
        description={t("bioGateDescription")}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowBioDialog(false)}
            >
              {t("cancel")}
            </Button>
            {failedResults.length > 0 && verifiedResults.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => submitBioGate(true)}
              >
                {t("skipFailed")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={loading || selectedAccountKeys.size === 0}
              onClick={() => submitBioGate(false)}
            >
              {loading ? t("checkingBio") : t("verifyBio")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {t("requiredBio")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-neutral-950">
              {bioRequirement || bioKeywords.join(", ")}
            </p>
            {bioKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {bioKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {bioGateAccounts.length === 0 ? (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                {t("noBioAccounts")}
              </p>
            ) : (
              bioGateAccounts.map((account) => {
                const key = accountKey(account);
                const selected = selectedAccountKeys.has(key);
                const result = bioResults.find((item) => accountKey(item) === key);
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm transition hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected}
                      onChange={(event) => {
                        setSelectedAccountKeys((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-neutral-950">
                        {account.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {platformLabel(account.platform)}
                        {account.handle ? ` · ${account.handle}` : ""}
                      </span>
                      {result?.status === "FAILED" ? (
                        <span className="mt-2 block rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          {t("bioAccountFailed", { page: account.label })}
                          {result.missingKeywords.length > 0
                            ? ` ${t("missingKeywords", { keywords: result.missingKeywords.join(", ") })}`
                            : ""}
                        </span>
                      ) : result?.status === "VERIFIED" ? (
                        <span className="mt-2 block rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                          {t("bioAccountVerified")}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Dialog>
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
  if (
    payload.code === "DISCORD_REQUIRED" ||
    payload.code === "DISCORD_GUILD_MEMBER_REQUIRED" ||
    payload.code === "DISCORD_ROLE_ASSIGN_FAILED" ||
    payload.code === "DISCORD_ROLE_SYNC_FAILED"
  ) {
    return payload.error ?? t("error");
  }

  if (payload.code === "BIO_ACCOUNTS_REQUIRED") return t("selectBioAccount");
  if (payload.code === "BIO_GATE_NOT_CONFIGURED") return payload.error ?? t("bioGateNotConfigured");
  if (payload.code === "BIO_VERIFICATION_FAILED") return payload.error ?? t("bioVerificationFailed");

  if (payload.error === "Already applied") return t("alreadyApplied");
  if (payload.error === "Creator profile not found") return t("profileMissing");
  if (payload.error === "Campaign not found") return t("notFound");

  return t("error");
}

function accountKey(account: { connectionType: string; connectionId: string }) {
  return `${account.connectionType}:${account.connectionId}`;
}

function platformLabel(platform: BioGateAccount["platform"]) {
  const labels: Record<BioGateAccount["platform"], string> = {
    ig: "Instagram",
    tt: "TikTok",
    yt: "YouTube",
    fb: "Facebook",
  };
  return labels[platform];
}
