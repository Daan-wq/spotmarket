"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

interface CampaignReferralLinkCardProps {
  referralUrl: string;
}

export function CampaignReferralLinkCard({
  referralUrl,
}: CampaignReferralLinkCardProps) {
  const t = useTranslations("creator.campaigns.detail.referralLink");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          aria-label={t("copy")}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm text-neutral-700">
        <span className="block truncate">{referralUrl}</span>
      </div>
    </section>
  );
}
