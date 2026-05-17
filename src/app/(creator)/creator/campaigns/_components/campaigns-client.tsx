"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CampaignAvatar,
  CampaignBudgetProgress,
  CampaignDeadlineBadge,
  CampaignPlatformRow,
  CampaignStatusBadge,
} from "@/components/campaigns/campaign-display";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
} from "../../_components/creator-journey";
import { formatCurrency, formatNumber } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface Eligibility {
  status: "eligible" | "ineligible" | "unknown";
  reasonKind?: "platforms" | "followers";
  reasonValue?: string | number;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  rewardRate: number;
  totalBudget: number;
  totalPaid: number;
  platforms: string[];
  status: string;
  contentType: string | null;
  niche: string | null;
  brandName: string;
  bannerUrl: string | null;
  deadlineIso: string;
  createdAtIso: string;
  eligibility: Eligibility;
  applicationId?: string;
  closedForSubmissions: boolean;
}

interface CampaignsClientProps {
  marketplace: CampaignData[];
  myCampaigns: CampaignData[];
}

type CampaignTab = "marketplace" | "my";
type SortKey = "recommended" | "newest" | "highest-cpv" | "ending-soon";

const PLATFORM_OPTIONS = [
  { value: "all", labelKey: "allPlatforms" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE_SHORTS", label: "YouTube" },
  { value: "FACEBOOK", label: "Facebook" },
];

export function CampaignsClient({ marketplace, myCampaigns }: CampaignsClientProps) {
  const t = useTranslations("creator.campaigns");
  const sharedT = useTranslations("creator.shared");
  const [activeTab, setActiveTab] = useState<CampaignTab>("marketplace");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [guideDialog, setGuideDialog] = useState<"rules" | "how" | null>(null);

  const campaigns = activeTab === "my" ? myCampaigns : marketplace;
  const filtersActive =
    search.trim().length > 0 || platformFilter !== "all" || typeFilter !== "all";
  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        [...marketplace, ...myCampaigns]
          .map((c) => c.contentType)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    return [{ value: "all", label: sharedT("filters.allTypes") }, ...values.map((value) => ({ value, label: value }))];
  }, [marketplace, myCampaigns, sharedT]);

  const filtered = useMemo(() => {
    const result = campaigns.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      if (platformFilter !== "all" && !c.platforms.includes(platformFilter)) return false;
      if (typeFilter !== "all" && c.contentType !== typeFilter) return false;
      return true;
    });
    return sortCampaigns(result, sort);
  }, [campaigns, search, platformFilter, typeFilter, sort]);

  function resetFilters() {
    setSearch("");
    setPlatformFilter("all");
    setTypeFilter("all");
    setSort("recommended");
  }

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
        <CreatorPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description", { count: marketplace.length })}
      />

      <CampaignGuideCard onOpen={setGuideDialog} />

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full rounded-xl border border-neutral-200 bg-neutral-50 p-1 md:w-auto">
            <TabButton active={activeTab === "marketplace"} onClick={() => setActiveTab("marketplace")}>
              {t("page.marketplace")}
            </TabButton>
            <TabButton active={activeTab === "my"} onClick={() => setActiveTab("my")}>
              {t("page.joined")}
            </TabButton>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-3xl">
            <label className="relative hidden flex-1 md:block">
              <span className="sr-only">{t("page.searchLabel")}</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={t("page.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:bg-white"
              />
            </label>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950 md:w-auto"
                >
                  {sharedT("actions.filters")}
                  {filtersActive ? <Badge variant="eligible">{sharedT("filters.on")}</Badge> : null}
                  <ChevronDownIcon />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl border border-neutral-200 bg-white p-1 text-neutral-900 shadow-lg"
              >
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {t("page.platform")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={platformFilter} onValueChange={setPlatformFilter}>
                  {PLATFORM_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {"labelKey" in option ? sharedT(`filters.${option.labelKey}`) : option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {t("page.type")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={typeFilter} onValueChange={setTypeFilter}>
                  {typeOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {t("page.sort")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  {sortOptions(sharedT).map((option) => (
                    <DropdownMenuRadioItem key={option.key} value={option.key}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!filtersActive}
                  onSelect={(e) => {
                    e.preventDefault();
                    resetFilters();
                  }}
                >
                  {sharedT("actions.resetFilters")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CreatorSectionHeader
          title={activeTab === "my" ? t("page.joined") : t("page.marketplace")}
          description={activeTab === "my" ? t("page.joinedDescription") : t("page.marketplaceDescription")}
        />

        {filtered.length === 0 ? (
          activeTab === "my" && !filtersActive ? (
            <EmptyState
              title={t("empty.noJoinedTitle")}
              description={t("empty.noJoinedDescription")}
              primaryCta={{ label: sharedT("actions.browseCampaigns"), onClick: () => setActiveTab("marketplace") }}
            />
          ) : (
            <EmptyState
              title={t("empty.noMatchesTitle")}
              description={t("empty.noMatchesDescription")}
              primaryCta={filtersActive ? { label: sharedT("actions.resetFilters"), onClick: resetFilters } : undefined}
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      <CampaignGuideDialog type={guideDialog} onClose={() => setGuideDialog(null)} />
    </div>
  );
}

function CampaignGuideCard({
  onOpen,
}: {
  onOpen: (dialog: "rules" | "how") => void;
}) {
  const t = useTranslations("creator.campaigns.guide");
  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-600">
        {t("intro")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen("rules")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-100"
        >
          {t("rules")}
        </button>
        <button
          type="button"
          onClick={() => onOpen("how")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-100"
        >
          {t("howItWorks")}
        </button>
      </div>
    </section>
  );
}

function CampaignGuideDialog({
  type,
  onClose,
}: {
  type: "rules" | "how" | null;
  onClose: () => void;
}) {
  const t = useTranslations("creator.campaigns.guide");
  if (!type) return null;

  const isRules = type === "rules";

  return (
    <Dialog
      open
      onClose={onClose}
      title={isRules ? t("rulesTitle") : t("howTitle")}
      size="lg"
      className="max-h-[82vh] overflow-hidden rounded-3xl sm:rounded-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 min-w-24 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-800"
        >
          {isRules ? t("understand") : t("gotIt")}
        </button>
      }
    >
      <div className="max-h-[58vh] space-y-5 overflow-y-auto pr-1 text-sm leading-6 text-neutral-600">
        {isRules ? <CampaignRulesContent /> : <CampaignHowItWorksContent />}
      </div>
    </Dialog>
  );
}

function CampaignHowItWorksContent() {
  const t = useTranslations("creator.campaigns.guide");
  return (
    <>
      <p>
        {t("howIntro")}
      </p>
      <GuideSection title={t("durationTitle")}>
        <p>{t("durationDeadline")}</p>
        <p>{t("durationBudget")}</p>
      </GuideSection>
      <GuideSection title={t("payoutTitle")}>
        <p>{t("payoutRate")}</p>
        <p>{t("payoutPot")}</p>
      </GuideSection>
    </>
  );
}

function CampaignRulesContent() {
  const t = useTranslations("creator.campaigns.guide");
  return (
    <>
      <p>
        {t("rulesIntro")}
      </p>
      <GuideSection title={t("noBottingTitle")}>
        <p>{t("noBotting")}</p>
      </GuideSection>
      <GuideSection title={t("audienceTitle")}>
        <p>{t("audience")}</p>
      </GuideSection>
      <GuideSection title={t("requirementsTitle")}>
        <p>{t("requirements")}</p>
      </GuideSection>
    </>
  );
}

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-950">
        {title}
      </h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition md:flex-none ${
        active ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function sortCampaigns(list: CampaignData[], sort: SortKey): CampaignData[] {
  const arr = [...list];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
    case "highest-cpv":
      return arr.sort((a, b) => b.rewardRate - a.rewardRate);
    case "ending-soon":
      return arr.sort((a, b) => a.deadlineIso.localeCompare(b.deadlineIso));
    case "recommended":
    default:
      return arr.sort((a, b) => {
        const aEligible = a.eligibility.status === "eligible" ? 0 : 1;
        const bEligible = b.eligibility.status === "eligible" ? 0 : 1;
        if (aEligible !== bEligible) return aEligible - bEligible;
        return b.rewardRate - a.rewardRate;
      });
  }
}

function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("creator.campaigns.card");
  const sharedT = useTranslations("creator.shared");
  const campaignHref = `/creator/campaigns/${campaign.id}`;
  const primaryHref = campaign.applicationId && !campaign.closedForSubmissions
    ? `/creator/applications/${campaign.applicationId}/submit`
    : campaignHref;
  const primaryLabel = campaign.applicationId ? sharedT("actions.submitClip") : sharedT("actions.campaignInfo");
  const submitDisabled = Boolean(campaign.applicationId && campaign.closedForSubmissions);
  const cardLabel = `${sharedT("actions.campaignInfo")}: ${campaign.name}`;

  function openCampaign() {
    router.push(campaignHref);
  }

  function openCampaignFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openCampaign();
  }

  function keepCardClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={cardLabel}
      onClick={openCampaign}
      onKeyDown={openCampaignFromKeyboard}
      className="flex h-full cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 md:p-5"
    >
      <div className="flex items-start gap-3">
        <CampaignAvatar name={campaign.brandName || campaign.name} imageUrl={campaign.bannerUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-normal text-neutral-950 md:text-lg">
            {campaign.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CampaignStatusBadge status={campaign.status} deadline={campaign.deadlineIso} />
            {campaign.eligibility.status === "eligible" ? <Badge variant="eligible">{t("youQualify")}</Badge> : null}
            {campaign.eligibility.status === "ineligible" && campaign.eligibility.reasonKind ? (
              <Badge variant="ineligible">
                {campaign.eligibility.reasonKind === "followers"
                  ? t("needFollowers", { count: formatNumber(Number(campaign.eligibility.reasonValue ?? 0), locale) })
                  : t("connectPlatforms", { platforms: String(campaign.eligibility.reasonValue ?? "") })}
              </Badge>
            ) : null}
            <CampaignDeadlineBadge deadline={campaign.deadlineIso} />
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-medium text-neutral-500">{t("payout")}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-normal text-neutral-950 md:text-3xl">
          {formatCurrency(campaign.rewardRate, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="text-sm text-neutral-500">{sharedT("units.perOneKViews")}</span>
      </div>

      <div className="mt-5">
        <CampaignBudgetProgress totalPaid={campaign.totalPaid} totalBudget={campaign.totalBudget} compact />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <CampaignPlatformRow platforms={campaign.platforms} size={24} />
        {campaign.contentType && campaign.contentType !== "UGC" ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200">
            {campaign.contentType}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {submitDisabled ? (
          <button
            type="button"
            disabled
            className="inline-flex h-12 flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-neutral-200 px-4 text-sm font-semibold text-neutral-500 sm:h-10"
          >
            {primaryLabel}
          </button>
        ) : (
          <Link
            href={primaryHref}
            onClick={keepCardClick}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition hover:bg-neutral-800 sm:h-10"
          >
            {primaryLabel}
          </Link>
        )}
        {campaign.applicationId ? (
          <Link
            href={campaignHref}
            onClick={keepCardClick}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 sm:h-10"
          >
            {sharedT("actions.campaignInfo")}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function sortOptions(t: ReturnType<typeof useTranslations>): Array<{ key: SortKey; label: string }> {
  return [
    { key: "recommended", label: t("filters.recommended") },
    { key: "newest", label: t("filters.newest") },
    { key: "highest-cpv", label: t("filters.highestPayout") },
    { key: "ending-soon", label: t("filters.endingSoon") },
  ];
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
