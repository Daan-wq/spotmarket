"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import {
  CAMPAIGN_REPORT_SECTION_KEYS,
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
  type CampaignReportSectionKey,
  type CampaignReportSectionSettings,
  type CampaignReportStatusValue,
} from "@/lib/admin/campaign-report-shared";
import { cn } from "@/lib/cn";
import type { CampaignReportLiveData } from "@/lib/admin/campaign-reporting";

export interface BrandOption {
  id: string;
  name: string;
  currency: string;
}

export interface CampaignOption {
  id: string;
  name: string;
  status: string;
  brandId: string | null;
  startsAt: string | null;
  deadline: string;
  brand: BrandOption | null;
}

export interface ReportFilters {
  brandId: string;
  campaignId: string;
  status: CampaignReportStatusValue | "ALL";
  q: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportHistoryItem {
  id: string;
  title: string;
  status: CampaignReportStatusValue;
  brandId: string | null;
  campaignId: string;
  updatedAt: string;
  brand: BrandOption | null;
  campaign: { id: string; name: string } | null;
}

export interface CampaignReportRecord extends ReportHistoryItem {
  periodStart: string | null;
  periodEnd: string | null;
  executiveSummary: string;
  keyTakeaways: string[];
  learnings: string[];
  nextCampaignRecommendations: string[];
  sectionSettings: CampaignReportSectionSettings;
}

interface CampaignReportStudioProps {
  brands: BrandOption[];
  campaigns: CampaignOption[];
  reports: ReportHistoryItem[];
  selectedReport: CampaignReportRecord | null;
  liveData: CampaignReportLiveData | null;
  initialEditorial: CampaignReportEditorial | null;
  filters: ReportFilters;
}

interface ReportInlineEditors {
  setTitle: (value: string) => void;
  setExecutiveSummary: (value: string) => void;
  updateKeyTakeaway: (index: number, value: string) => void;
  addKeyTakeaway: () => void;
  updateLearning: (index: number, value: string) => void;
  addLearning: () => void;
  updateRecommendation: (index: number, value: string) => void;
  addRecommendation: () => void;
}

interface TokenPreviewContextValue {
  liveData: CampaignReportLiveData;
  status: CampaignReportStatusValue;
  periodStart: string;
  periodEnd: string;
  showValues: boolean;
}

const TokenPreviewContext = createContext<TokenPreviewContextValue | null>(null);

const SECTION_LABELS: Record<CampaignReportSectionKey, string> = {
  cover: "Omslag",
  executiveSummary: "Samenvatting",
  campaignSetup: "Campagne-inrichting",
  performance: "Prestatieoverzicht",
  platformBreakdown: "Platformverdeling",
  topContent: "Topcontent",
  creatorPerformance: "Creatorprestaties",
  audience: "Publiek en bereikskwaliteit",
  quality: "Kwaliteit en compliance",
  nextCampaign: "Volgende campagne",
};

const STATUS_TABS: Array<{ label: string; value: ReportFilters["status"] }> = [
  { label: "Alles", value: "ALL" },
  { label: "Concept", value: "DRAFT" },
  { label: "Definitief", value: "FINAL" },
];

const REPORT_STATUS_LABELS: Record<CampaignReportStatusValue, string> = {
  DRAFT: "Concept",
  FINAL: "Definitief",
};

const ENUM_LABELS: Record<string, string> = {
  APPROVED: "Goedgekeurd",
  REJECTED: "Afgewezen",
  NEEDS_REVISION: "Aanpassing nodig",
  PENDING: "In behandeling",
  FLAGGED: "Gemarkeerd",
  UNKNOWN: "Onbekend",
  RATIO_ANOMALY: "Afwijkende ratio",
  LOGO_MISSING: "Logo ontbreekt",
  DUPLICATE_CONTENT: "Dubbele content",
  TOKEN_BROKEN: "Token stuk",
  BIO_MISMATCH: "Bio wijkt af",
  male: "Man",
  female: "Vrouw",
  other: "Anders",
};

export function CampaignReportStudio({
  brands,
  campaigns,
  reports,
  selectedReport,
  liveData,
  initialEditorial,
  filters,
}: CampaignReportStudioProps) {
  const selectedCampaignId = liveData?.campaign.id ?? selectedReport?.campaignId ?? filters.campaignId ?? campaigns[0]?.id ?? "";
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const baseEditorial = initialEditorial ?? liveData?.defaults ?? createEmptyEditorial(selectedCampaign?.name ?? "Campagne");
  const initialPeriodStart = dateInputValue(selectedReport?.periodStart ?? liveData?.period.start ?? liveData?.campaign.startsAt ?? null);
  const initialPeriodEnd = dateInputValue(selectedReport?.periodEnd ?? liveData?.period.end ?? liveData?.campaign.deadline ?? null);
  const editorKey = [
    selectedReport?.id ?? "new",
    selectedReport?.updatedAt ?? "",
    liveData?.campaign.id ?? selectedCampaignId,
    initialPeriodStart,
    initialPeriodEnd,
  ].join(":");

  return (
    <CampaignReportStudioEditor
      key={editorKey}
      brands={brands}
      campaigns={campaigns}
      reports={reports}
      selectedReport={selectedReport}
      liveData={liveData}
      filters={filters}
      selectedCampaignId={selectedCampaignId}
      baseEditorial={baseEditorial}
      initialPeriodStart={initialPeriodStart}
      initialPeriodEnd={initialPeriodEnd}
    />
  );
}

function CampaignReportStudioEditor({
  brands,
  campaigns,
  reports,
  selectedReport,
  liveData,
  filters,
  selectedCampaignId,
  baseEditorial,
  initialPeriodStart,
  initialPeriodEnd,
}: Omit<CampaignReportStudioProps, "initialEditorial"> & {
  selectedCampaignId: string;
  baseEditorial: CampaignReportEditorial;
  initialPeriodStart: string;
  initialPeriodEnd: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(baseEditorial.title);
  const [executiveSummary, setExecutiveSummary] = useState(baseEditorial.executiveSummary);
  const [keyTakeaways, setKeyTakeaways] = useState(() => normalizeTextList(baseEditorial.keyTakeaways));
  const [learnings, setLearnings] = useState(() => normalizeTextList(baseEditorial.learnings));
  const [nextCampaignRecommendations, setNextCampaignRecommendations] = useState(() => normalizeTextList(baseEditorial.nextCampaignRecommendations));
  const [sectionSettings, setSectionSettings] = useState<CampaignReportSectionSettings>(
    () => normalizeSectionSettings(baseEditorial.sectionSettings),
  );
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [showTokenValues, setShowTokenValues] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "final" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const historyCounts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.all += 1;
        if (report.status === "DRAFT") acc.draft += 1;
        if (report.status === "FINAL") acc.final += 1;
        return acc;
      },
      { all: 0, draft: 0, final: 0 },
    );
  }, [reports]);

  function buildHref(overrides: Partial<ReportFilters> & { reportId?: string | null; campaignId?: string | null }) {
    const next = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (overrides.reportId) params.set("reportId", overrides.reportId);
    if (next.campaignId) params.set("campaignId", next.campaignId);
    if (next.brandId) params.set("brandId", next.brandId);
    if (next.status !== "ALL") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.dateFrom) params.set("dateFrom", next.dateFrom);
    if (next.dateTo) params.set("dateTo", next.dateTo);
    const query = params.toString();
    return query ? `/admin/reports?${query}` : "/admin/reports";
  }

  async function saveReport(nextStatus?: CampaignReportStatusValue) {
    if (!liveData) return;
    setNotice(null);
    setSavingMode(nextStatus === "FINAL" ? "final" : "draft");

    const editorialPayload = {
      title: title.trim() || liveData.defaults.title,
      status: nextStatus ?? selectedReport?.status ?? "DRAFT",
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      executiveSummary,
      keyTakeaways,
      learnings,
      nextCampaignRecommendations,
      sectionSettings,
    };

    const response = await fetch(
      selectedReport ? `/api/admin/campaign-reports/${selectedReport.id}` : "/api/admin/campaign-reports",
      {
        method: selectedReport ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedReport
            ? editorialPayload
            : {
                ...editorialPayload,
                campaignId: liveData.campaign.id,
              },
        ),
      },
    );

    const payload = await response.json().catch(() => ({}));
    setSavingMode(null);

    if (!response.ok) {
      setNotice(typeof payload.error === "string" ? payload.error : "Opslaan mislukt.");
      return;
    }

    setNotice(nextStatus === "FINAL" ? "Definitief rapport opgeslagen." : "Concept opgeslagen.");
    if (!selectedReport && payload.report?.id) {
      router.replace(buildHref({ reportId: payload.report.id, campaignId: liveData.campaign.id }));
    }
    router.refresh();
  }

  function selectCampaign(campaignId: string) {
    router.push(buildHref({ campaignId, reportId: null }));
  }

  function updateKeyTakeaway(index: number, value: string) {
    setKeyTakeaways((items) => replaceTextListItem(items, index, value));
  }

  function updateLearning(index: number, value: string) {
    setLearnings((items) => replaceTextListItem(items, index, value));
  }

  function updateRecommendation(index: number, value: string) {
    setNextCampaignRecommendations((items) => replaceTextListItem(items, index, value));
  }

  return (
    <div className="report-studio-shell space-y-5">
      <header className="report-studio-chrome flex flex-col gap-4 border-b border-neutral-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Adminrapportages</p>
          <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-neutral-950">Campagnerapport-studio</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <Badge variant={selectedReport?.status === "FINAL" ? "verified" : "pending"}>
              {selectedReport?.status ? reportStatusLabel(selectedReport.status) : "Niet-opgeslagen concept"}
            </Badge>
            {selectedReport ? <span>Bijgewerkt {formatDate(selectedReport.updatedAt, "nl")}</span> : null}
            {notice ? <span className="font-medium text-neutral-700">{notice}</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="min-w-[260px]">
            <span className="sr-only">Campagne</span>
            <select
              value={selectedCampaignId}
              onChange={(event) => selectCampaign(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none focus:border-neutral-400"
            >
              {campaigns.length === 0 ? <option value="">Geen campagnes</option> : null}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.brand?.name ? `${campaign.brand.name} - ` : ""}
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push(buildHref({ campaignId: selectedCampaignId, reportId: null }))}>
            <Plus className="h-4 w-4" />
            Nieuw
          </Button>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => saveReport("DRAFT")} isPending={savingMode === "draft"} disabled={!liveData}>
            <Save className="h-4 w-4" />
            Opslaan
          </Button>
          <Button type="button" className="rounded-lg" onClick={() => saveReport("FINAL")} isPending={savingMode === "final"} disabled={!liveData}>
            <CheckCircle2 className="h-4 w-4" />
            Definitief opslaan
          </Button>
          <Button type="button" variant="ghost" className="rounded-lg" onClick={() => window.print()} disabled={!liveData}>
            <Printer className="h-4 w-4" />
            Printen
          </Button>
        </div>
      </header>

      <section className="report-studio-chrome">
        <HistoryPanel
          reports={reports}
          brands={brands}
          campaigns={campaigns}
          filters={filters}
          selectedReportId={selectedReport?.id ?? null}
          historyCounts={historyCounts}
          buildHref={buildHref}
        />
      </section>

      <ReportMetaControls
        periodStart={periodStart}
        setPeriodStart={setPeriodStart}
        periodEnd={periodEnd}
        setPeriodEnd={setPeriodEnd}
        sectionSettings={sectionSettings}
        setSectionSettings={setSectionSettings}
        showTokenValues={showTokenValues}
        setShowTokenValues={setShowTokenValues}
      />

      <main className="report-studio-preview min-w-0">
        <ReportPreview
          liveData={liveData}
          title={title}
          executiveSummary={executiveSummary}
          keyTakeaways={keyTakeaways}
          learnings={learnings}
          recommendations={nextCampaignRecommendations}
          sectionSettings={sectionSettings}
          status={selectedReport?.status ?? "DRAFT"}
          periodStart={periodStart}
          periodEnd={periodEnd}
          showTokenValues={showTokenValues}
          editors={{
            setTitle,
            setExecutiveSummary,
            updateKeyTakeaway,
            addKeyTakeaway: () => setKeyTakeaways((items) => [...items, "Nieuw inzicht"]),
            updateLearning,
            addLearning: () => setLearnings((items) => [...items, "Nieuwe learning"]),
            updateRecommendation,
            addRecommendation: () => setNextCampaignRecommendations((items) => [...items, "Nieuwe aanbeveling"]),
          }}
        />
      </main>
    </div>
  );
}

function HistoryPanel({
  reports,
  brands,
  campaigns,
  filters,
  selectedReportId,
  historyCounts,
  buildHref,
}: {
  reports: ReportHistoryItem[];
  brands: BrandOption[];
  campaigns: CampaignOption[];
  filters: ReportFilters;
  selectedReportId: string | null;
  historyCounts: { all: number; draft: number; final: number };
  buildHref: (overrides: Partial<ReportFilters> & { reportId?: string | null; campaignId?: string | null }) => string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Rapporthistorie</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Totaal: {historyCounts.all} / Concept: {historyCounts.draft} / Definitief: {historyCounts.final}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1 sm:w-auto sm:min-w-[260px]">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ status: tab.value })}
              className={cn(
                "rounded-md px-3 py-2 text-center text-xs font-semibold text-neutral-500 transition",
                filters.status === tab.value && "bg-white text-neutral-950 shadow-sm",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <form action="/admin/reports" className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(180px,0.9fr)_minmax(140px,0.65fr)_minmax(140px,0.65fr)_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Zoeken"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>

        <select name="brandId" defaultValue={filters.brandId} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="">Alle merken</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <select name="campaignId" defaultValue={filters.campaignId} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="">Alle campagnes</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        <input type="hidden" name="status" value={filters.status === "ALL" ? "" : filters.status} />
        <input name="dateFrom" type="date" defaultValue={filters.dateFrom} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
        <input name="dateTo" type="date" defaultValue={filters.dateTo} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
        <Button type="submit" variant="outline" size="sm" className="h-10 rounded-lg px-4">
          <SlidersHorizontal className="h-4 w-4" />
          Filteren
        </Button>
      </form>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          <FileText className="h-4 w-4" />
          Opgeslagen rapporten
        </div>
        {reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-center">
            <p className="text-sm font-medium text-neutral-950">Geen rapporten</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Nieuwe concepten verschijnen hier na het opslaan.</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={buildHref({ reportId: report.id, campaignId: report.campaignId })}
                className={cn(
                  "block rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50",
                  selectedReportId === report.id && "border-neutral-900 bg-neutral-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-neutral-950">{report.title}</p>
                  <Badge variant={report.status === "FINAL" ? "verified" : "pending"}>{reportStatusLabel(report.status)}</Badge>
                </div>
                <p className="mt-2 truncate text-xs text-neutral-500">{report.brand?.name ?? "Geen merk"} / {report.campaign?.name ?? "Campagne"}</p>
                <p className="mt-1 text-xs text-neutral-400">{formatDate(report.updatedAt, "nl")}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportMetaControls({
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  sectionSettings,
  setSectionSettings,
  showTokenValues,
  setShowTokenValues,
}: {
  periodStart: string;
  setPeriodStart: (value: string) => void;
  periodEnd: string;
  setPeriodEnd: (value: string) => void;
  sectionSettings: CampaignReportSectionSettings;
  setSectionSettings: (value: CampaignReportSectionSettings) => void;
  showTokenValues: boolean;
  setShowTokenValues: (value: boolean) => void;
}) {
  return (
    <section className="report-studio-chrome rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Rapportinstellingen</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Pas periode en zichtbare secties aan; tekst wijzig je direct in het rapport.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Start</span>
              <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Einde</span>
              <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
            </label>
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2">
            <span>
              <span className="block text-xs font-semibold text-neutral-950">Live waarden tonen</span>
              <span className="block text-[11px] leading-4 text-neutral-500">Vervang tokens door actuele databasewaarden.</span>
            </span>
            <input
              type="checkbox"
              checked={showTokenValues}
              onChange={(event) => setShowTokenValues(event.target.checked)}
              className="h-4 w-4 accent-neutral-950"
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            <SlidersHorizontal className="h-4 w-4" />
            Secties
          </div>
          <div className="flex flex-wrap gap-2">
          {CAMPAIGN_REPORT_SECTION_KEYS.map((sectionKey) => (
            <label
              key={sectionKey}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                sectionSettings[sectionKey]
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300",
              )}
            >
              <input
                type="checkbox"
                checked={sectionSettings[sectionKey]}
                onChange={(event) => setSectionSettings({ ...sectionSettings, [sectionKey]: event.target.checked })}
                className="sr-only"
              />
              {SECTION_LABELS[sectionKey]}
            </label>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportPreview({
  liveData,
  title,
  executiveSummary,
  keyTakeaways,
  learnings,
  recommendations,
  sectionSettings,
  status,
  periodStart,
  periodEnd,
  showTokenValues,
  editors,
}: {
  liveData: CampaignReportLiveData | null;
  title: string;
  executiveSummary: string;
  keyTakeaways: string[];
  learnings: string[];
  recommendations: string[];
  sectionSettings: CampaignReportSectionSettings;
  status: CampaignReportStatusValue;
  periodStart: string;
  periodEnd: string;
  showTokenValues: boolean;
  editors?: ReportInlineEditors;
}) {
  if (!liveData) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-6 py-16 text-center">
        <FileText className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm font-semibold text-neutral-950">Geen campagne beschikbaar</p>
        <p className="mt-1 text-sm text-neutral-500">Campagnerapporten verschijnen zodra er campagnegegevens zijn.</p>
      </div>
    );
  }

  const enabled = (sectionKey: CampaignReportSectionKey) => sectionSettings[sectionKey];

  return (
    <TokenPreviewContext.Provider value={{ liveData, status, periodStart, periodEnd, showValues: showTokenValues }}>
      <div className="report-print-root rounded-lg bg-neutral-200 px-3 py-6 sm:px-6">
        <div className="report-print-scroll space-y-6 overflow-visible">
        {enabled("cover") ? (
          <ReportPage>
            <div>
              <div className="flex items-center justify-between gap-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  <EditableCopy>Campagnerapport</EditableCopy>
                </p>
                <Token name="report.status" />
              </div>
              <h2 className="mt-20 max-w-[130mm] text-4xl font-semibold leading-tight tracking-normal text-neutral-400">
                <Token name="campaign.brandName" /> <EditableCopy>campagnerapport</EditableCopy>
              </h2>
            </div>
            <div className="mt-8 grid gap-6">
              <CoverTokenFact label="Merk" token="campaign.brandName" />
              <CoverTokenFact label="Campagne" token="campaign.name" />
              <CoverTokenFact label="Periode" tokens={["period.start", "period.end"]} separator=" - " />
              <CoverTokenFact label="Rapportdatum" token="generatedAt" />
            </div>
          </ReportPage>
        ) : null}

        {enabled("executiveSummary") ? (
          <ReportPage>
            <ReportHeading icon={<FileText className="h-5 w-5" />} kicker="Master template" title="Samenvatting" />
            <EditableMarker name="executiveSummary" />
            <TemplateParagraph>
              <Token name="campaign.brandName" /> behaalde <Token name="performance.currentViews" /> huidige goedgekeurde views met <Token name="performance.approvedClips" /> goedgekeurde clips.
              Het afgesproken doel was <Token name="performance.targetViews" /> views, berekend uit budget en CPM. De campagne leverde <Token name="performance.overdeliveryViews" /> extra views boven het afgesproken doel.
              <Token name="platformBreakdown[0].platform" /> was het sterkste bereikskanaal. Voor de volgende campagne adviseren we om de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de briefing te zetten en budget te sturen naar de kanalen met de laagste CPM.
            </TemplateParagraph>
            <TemplateOption title="Variant: onder doel">
              De campagne staat momenteel op <Token name="performance.deliveryProgress" /> van het afgesproken doel van <Token name="performance.targetViews" /> views. De belangrijkste optimalisatie voor een volgende campagne is meer volume op creators/formats die sneller approved views genereren.
            </TemplateOption>
            <TemplateOption title="Variant: overdelivery">
              De campagne heeft het afgesproken doel van <Token name="performance.targetViews" /> views overschreden en staat op <Token name="performance.currentViews" /> huidige goedgekeurde views. De extra <Token name="performance.overdeliveryViews" /> views zijn overdelivery: gratis extra bereik zonder extra budget.
            </TemplateOption>
            <TemplateKpiGrid
              items={[
                ["Doelviews", "performance.targetViews"],
                ["Huidige views", "performance.currentViews"],
                ["Overdelivery", "performance.overdeliveryViews"],
                ["Delivery progress", "performance.deliveryProgress"],
                ["Budget gebruikt", "performance.budgetUsed"],
                ["Budget gebruikt %", "performance.budgetUsedPercent"],
                ["CPM", "performance.cpmPerThousand"],
                ["Goedgekeurde clips", "performance.approvedClips"],
                ["Actieve creators", "performance.activeCreators"],
                ["Topplatform", "platformBreakdown[0].platform"],
                ["Topplatform views", "platformBreakdown[0].views"],
              ]}
            />
          </ReportPage>
        ) : null}

        {enabled("campaignSetup") ? (
          <ReportPage>
            <ReportHeading icon={<CalendarDays className="h-5 w-5" />} kicker="Template setup" title="Campagne-inrichting" />
            <TemplateVariableGrid
              rows={[
                ["Platforms", "campaign.platforms"],
                ["Budget", "campaign.totalBudget"],
                ["CPM", "performance.cpmPerThousand"],
                ["Doelviews", "performance.targetViews"],
                ["Minimum betaalde views", "campaign.minimumPaidViews"],
                ["Maximum betaalde views", "campaign.maximumPaidViews"],
                ["Campagneperiode", "campaign.startsAt", "campaign.deadline"],
                ["Doelland", "campaign.target.country"],
                ["Minimale volgers", "campaign.target.minFollowers"],
                ["Minimale engagement rate", "campaign.target.minEngagementRate"],
                ["Requirements", "campaign.requirements"],
                ["Content guidelines", "campaign.contentGuidelines"],
                ["Verplichte hashtags", "campaign.requiredHashtags"],
              ]}
            />
            <TemplateCallout title="Measurement definition">
              Doelviews worden berekend uit <Token name="campaign.totalBudget" /> en <Token name="campaign.creatorCpv" />. Huidige views zijn live goedgekeurde views. Overdelivery is extra bereik boven het afgesproken doel zonder extra budget.
            </TemplateCallout>
          </ReportPage>
        ) : null}

        {enabled("performance") ? (
          <ReportPage>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Live dashboarddata" title="Prestatieoverzicht" />
            <TemplateRepeat title="Views over time" source="timeline">
              <Token name="timeline[].date" /> <Token name="timeline[].views" /> <Token name="timeline[].likes" /> <Token name="timeline[].comments" /> <Token name="timeline[].shares" />
            </TemplateRepeat>
            <TemplateVariableGrid
              rows={[
                ["Status breakdown", "performance.statusCounts"],
                ["Doelviews", "performance.targetViews"],
                ["Huidige live views", "performance.currentViews"],
                ["Betaalbare / eligible views", "performance.paidEligibleViews"],
                ["Overdelivery views", "performance.overdeliveryViews"],
                ["Overdelivery %", "performance.overdeliveryPercent"],
                ["Delivery progress", "performance.deliveryProgress"],
                ["Approval rate", "performance.approvalRate"],
              ]}
            />
            <EditableMarker name="performanceInsight" />
            <TemplateParagraph>
              De campagne staat op <Token name="performance.deliveryProgress" /> van het afgesproken viewdoel. Huidige views blijven live doorlopen via goedgekeurde clips. Views boven <Token name="performance.targetViews" /> worden zichtbaar als overdelivery.
            </TemplateParagraph>
          </ReportPage>
        ) : null}

        {enabled("performance") ? (
          <ReportPage>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Budget en delivery" title="Financial Overview" />
            <TemplateVariableGrid
              rows={[
                ["Totaal budget", "campaign.totalBudget"],
                ["Budget gebruikt", "performance.budgetUsed"],
                ["Budget gebruikt %", "performance.budgetUsedPercent"],
                ["Betaalbare / eligible views", "performance.paidEligibleViews"],
                ["Huidige live views", "performance.currentViews"],
                ["Doelviews", "performance.targetViews"],
                ["Overdelivery", "performance.overdeliveryViews"],
                ["CPM", "performance.cpmPerThousand"],
                ["Effectieve cost per 1.000 views", "performance.costPerThousandViews"],
              ]}
            />
            <EditableMarker name="financialNote" />
            <TemplateParagraph>
              Het afgesproken viewdoel is gebaseerd op budget en CPM. Eventuele overdelivery wordt niet extra doorbelast en vertegenwoordigt extra bereik voor de client.
            </TemplateParagraph>
          </ReportPage>
        ) : null}

        {enabled("platformBreakdown") ? (
          <ReportPage>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Kanaallevering" title="Platform Performance" />
            <TemplateRepeat title="Herhaal per platform" source="platformBreakdown">
              <TemplateVariableGrid
                rows={[
                  ["Platform", "platformBreakdown[].platform"],
                  ["Views", "platformBreakdown[].views"],
                  ["Clips", "platformBreakdown[].clips"],
                  ["Engagement", "platformBreakdown[].engagement"],
                  ["Cost", "platformBreakdown[].cost"],
                ]}
              />
              <EditableMarker name="platformRecommendation[]" />
              <TemplateParagraph>
                <Token name="platformBreakdown[].platform" /> leverde <Token name="platformBreakdown[].views" /> views via <Token name="platformBreakdown[].clips" /> clips. Dit kanaal is relevant voor de volgende campagne op basis van bereik, kosten en engagement.
              </TemplateParagraph>
            </TemplateRepeat>
          </ReportPage>
        ) : null}

        {enabled("topContent") ? (
          <ReportPage>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Beste clips" title="Topcontent" />
            <TemplateRepeat title="Herhaal per top clip" source="topContent">
              <TemplateVariableGrid
                rows={[
                  ["Thumbnail", "topContent[].thumbnailUrl"],
                  ["Creator", "topContent[].creator"],
                  ["Platform", "topContent[].platform"],
                  ["Post URL", "topContent[].postUrl"],
                  ["Views", "topContent[].views"],
                  ["Engagement", "topContent[].engagement"],
                  ["Earned amount", "topContent[].earnedAmount"],
                  ["Status", "topContent[].status"],
                ]}
              />
              <EditableMarker name="topContentLearning[]" />
              <TemplateParagraph>
                Deze clip werkte door een sterke hook, snelle herkenbaarheid en een format dat native aanvoelde voor <Token name="topContent[].platform" />.
              </TemplateParagraph>
            </TemplateRepeat>
          </ReportPage>
        ) : null}

        {enabled("topContent") ? (
          <ReportPage>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Strategische patronen" title="Content Insights" />
            <EditableMarker name="contentInsights" />
            <TemplateParagraph>
              De best presterende content combineerde een duidelijke hook, snelle merkplaatsing en een format dat paste bij het platform. Clips die sneller tot de kern kwamen, presteerden beter dan content met een tragere opening.
            </TemplateParagraph>
            <TemplateOption title="Opties">
              <TemplateBullets
                items={[
                  <>Directe problem/solution hooks presteerden het sterkst.</>,
                  <>Creator-native edits presteerden beter dan te gepolijste branded content.</>,
                  <>Product of merk zichtbaar in de eerste seconden verhoogde de performance.</>,
                  <><Token name="platformBreakdown[0].platform" /> verdient extra focus in de volgende briefing.</>,
                ]}
              />
            </TemplateOption>
          </ReportPage>
        ) : null}

        {enabled("creatorPerformance") ? (
          <ReportPage>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker="Creator pool" title="Creator Performance Breakdown" />
            <TemplateRepeat title="Herhaal per creator" source="creators">
              <TemplateVariableGrid
                rows={[
                  ["Creator", "creators[].creator"],
                  ["Submissions", "creators[].submissions"],
                  ["Views", "creators[].views"],
                  ["Earned amount", "creators[].earnedAmount"],
                  ["Flagged count", "creators[].flagged"],
                ]}
              />
            </TemplateRepeat>
            <EditableMarker name="creatorRecommendation" />
            <TemplateParagraph>
              Voor de volgende campagne raden we aan creators opnieuw te activeren die hoge views combineren met consistente kwaliteit, lage revision-rate en duidelijke merkfit.
            </TemplateParagraph>
          </ReportPage>
        ) : null}

        {enabled("audience") ? (
          <ReportPage>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker="Audience snapshots" title="Audience & Reach Quality" />
            <TemplateVariableGrid
              rows={[
                ["Audience sample count", "audience.sampleCount"],
                ["Top countries", "audience.topCountries[]"],
                ["Age buckets", "audience.ageBuckets"],
                ["Gender split", "audience.genderSplit"],
              ]}
            />
            <EditableMarker name="audienceInsight" />
            <TemplateParagraph>
              Audience-data is gebaseerd op beschikbare creator audience snapshots. De databeschikbaarheid kan per platform verschillen.
            </TemplateParagraph>
          </ReportPage>
        ) : null}

        {enabled("creatorPerformance") ? (
          <ReportPage>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker="Optioneel" title="Community Activation Performance" />
            <TemplateCallout title="Voorwaarde">
              Toon deze sectie alleen als <Token name="referral.totalClicks" /> of <Token name="referral.inviteCount" /> groter is dan 0.
            </TemplateCallout>
            <TemplateVariableGrid
              rows={[
                ["Total clicks", "referral.totalClicks"],
                ["Invites", "referral.inviteCount"],
                ["Active clippers", "referral.activeClipperCount"],
                ["Activation rate", "referral.activationRate"],
                ["CPA per invite", "referral.cpaPerInvite"],
                ["CPA per active clipper", "referral.cpaPerActiveClipper"],
              ]}
            />
            <EditableMarker name="communityInsight" />
            <TemplateParagraph>
              De campagne activeerde <Token name="referral.activeClipperCount" /> actieve clippers vanuit <Token name="referral.inviteCount" /> invites. Dit laat zien hoeveel extra creator-distributie via de campagneflow is ontstaan.
            </TemplateParagraph>
          </ReportPage>
        ) : null}

        {enabled("quality") ? (
          <ReportPage>
            <ReportHeading icon={<ShieldCheck className="h-5 w-5" />} kicker="Client-safe wording" title="Quality & Compliance Review" />
            <TemplateVariableGrid
              rows={[
                ["Traffic Quality Status", "computed.trafficQualityStatus"],
                ["Open signals", "quality.openSignals"],
                ["Critical signals", "quality.criticalSignals"],
                ["Resolved signals", "quality.resolvedSignals"],
                ["Signal counts", "quality.signalCounts"],
                ["QC decisions", "quality.qcDecisionCounts"],
              ]}
            />
            <TemplateParagraph>
              Alle clips en views zijn beoordeeld op campagnevoorwaarden, content compliance, duplicate activity en traffic quality. Alleen goedgekeurde prestaties worden meegenomen in approved views en payout.
            </TemplateParagraph>
            <EditableMarker name="qualityNote" />
            <TemplateOption title="Status opties">
              <TemplateBullets
                items={[
                  <>Passed: geen open kritieke kwaliteitsissues.</>,
                  <>Passed with exclusions: niet-kwalificerende activiteit is uitgesloten van approved performance.</>,
                  <>Needs attention: er zijn open signalen die handmatige review vragen.</>,
                ]}
              />
            </TemplateOption>
          </ReportPage>
        ) : null}

        {enabled("nextCampaign") ? (
          <>
            <ReportPage>
              <ReportHeading icon={<RefreshCw className="h-5 w-5" />} kicker="Praktische conclusies" title="Key Learnings" />
              <EditableMarker name="learnings[]" />
              <TemplateBullets
                items={[
                  <>Herhaal formats die op <Token name="platformBreakdown[0].platform" /> vroeg aandacht trekken.</>,
                  <>Gebruik topcontent van <Token name="topContent[0].creator" /> als referentie voor hook, tempo en visuele brand placement.</>,
                  <>Activeer creators opnieuw die veel views leveren met consistente kwaliteit.</>,
                  <>Houd contentregels concreet om revision-rate te beperken.</>,
                  <>Gebruik overdelivery van <Token name="performance.overdeliveryViews" /> als bewijs dat campagnecontent na livegang blijft doorlopen.</>,
                ]}
              />
            </ReportPage>

            <ReportPage>
              <ReportHeading icon={<RefreshCw className="h-5 w-5" />} kicker="Volgende campagne" title="Next Campaign Recommendations" />
              <EditableMarker name="nextCampaignRecommendations[]" />
              <TemplateBullets
                items={[
                  <>Reserveer extra budget voor <Token name="platformBreakdown[0].platform" />, omdat dit kanaal de sterkste delivery liet zien.</>,
                  <>Nodig de best presterende creators opnieuw uit.</>,
                  <>Maak 3 concrete hook-angles voor de volgende briefing.</>,
                  <>Gebruik winnende topclips als voorbeeldmateriaal in de creator brief.</>,
                  <>Stuur budget op basis van CPM, approved views en overdelivery.</>,
                  <>Houd quality review actief op brand placement, duplicate content en engagementratio's.</>,
                ]}
              />
            </ReportPage>

            <ReportPage>
              <ReportHeading icon={<FileText className="h-5 w-5" />} kicker="Admin appendix" title="Appendix / Raw Data" />
              <TemplateVariableGrid
                rows={[
                  ["Campagne ID", "campaign.id"],
                  ["Brand ID", "campaign.brandId"],
                  ["Target views source", "performance.targetViewsSource"],
                  ["Approved views", "performance.approvedViews"],
                  ["Current views", "performance.currentViews"],
                  ["Paid eligible views", "performance.paidEligibleViews"],
                  ["All status counts", "performance.statusCounts"],
                  ["All signal counts", "quality.signalCounts"],
                  ["All QC decisions", "quality.qcDecisionCounts"],
                ]}
              />
            </ReportPage>
          </>
        ) : null}
        </div>
      </div>
    </TokenPreviewContext.Provider>
  );
}

function Token({ name }: { name: string }) {
  const tokenContext = useContext(TokenPreviewContext);
  const previewValue = tokenContext?.showValues
    ? formatTokenPreviewValue(name, resolveTokenPreviewValue(name, tokenContext))
    : null;

  if (tokenContext?.showValues) {
    return (
      <span className="inline-flex max-w-full items-center rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 align-baseline text-[0.85em] font-semibold leading-5 text-neutral-900">
        <span className="max-w-[220px] truncate">{previewValue ?? "geen waarde"}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 align-baseline font-mono text-[0.85em] font-semibold leading-5 text-neutral-700">
      <span className="max-w-full truncate">
        {"{{"}{name}{"}}"}
      </span>
    </span>
  );
}

function EditableCopy({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{renderEditableCopy(children)}</span>;
}

function EditableText({ value }: { value: string }) {
  const [text, setText] = useState(value);
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="report-copy-edit rounded-sm outline-none transition focus:bg-amber-50 focus:ring-2 focus:ring-amber-200"
      onBlur={(event) => setText(event.currentTarget.innerText)}
    >
      {text}
    </span>
  );
}

function renderEditableCopy(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <EditableText value={String(child)} />;
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment) {
      return <>{renderEditableCopy(child.props.children)}</>;
    }
    return child;
  });
}

function resolveTokenPreviewValue(name: string, context: TokenPreviewContextValue) {
  const tokenSource = {
    ...context.liveData,
    report: { status: reportStatusLabel(context.status) },
    period: {
      start: context.periodStart || context.liveData.period.start,
      end: context.periodEnd || context.liveData.period.end,
    },
    computed: {
      trafficQualityStatus: trafficQualityStatus(context.liveData),
    },
  };

  return resolveTokenPath(tokenSource, name);
}

function resolveTokenPath(source: unknown, path: string): unknown {
  let current = source;
  for (const segment of path.split(".")) {
    if (current == null) return null;
    const arrayMatch = segment.match(/^(.+)\[(\d*)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = readObjectKey(current, key);
      if (!Array.isArray(current)) return current;
      current = index === "" ? current : current[Number(index)];
      continue;
    }
    current = readObjectKey(current, segment);
  }
  return current;
}

function readObjectKey(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  return (value as Record<string, unknown>)[key];
}

function formatTokenPreviewValue(name: string, value: unknown): string {
  if (value == null || value === "") return "geen waarde";
  if (typeof value === "number") return formatTokenNumber(name, value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return truncateTokenValue(formatTokenString(value));
  if (Array.isArray(value)) {
    if (value.length === 0) return "lege lijst";
    return truncateTokenValue(value.slice(0, 3).map(formatTokenArrayItem).join(", ") + (value.length > 3 ? ` +${value.length - 3}` : ""));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
    if (entries.length === 0) return "{}";
    return truncateTokenValue(entries.map(([key, entryValue]) => `${key}: ${formatTokenPreviewValue(key, entryValue)}`).join(", "));
  }
  return truncateTokenValue(String(value));
}

function formatTokenNumber(name: string, value: number) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("percent") || lowerName.includes("progress") || lowerName.includes("rate")) {
    return formatPercent(value);
  }
  if (
    lowerName.includes("budget") ||
    lowerName.includes("cost") ||
    lowerName.includes("cpm") ||
    lowerName.includes("cpv") ||
    lowerName.includes("cpa") ||
    lowerName.includes("amount") ||
    lowerName.includes("earned")
  ) {
    return formatCurrency(value, "EUR", "nl");
  }
  return formatNumber(value, "nl");
}

function formatTokenString(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value, "nl");
  return value;
}

function formatTokenArrayItem(value: unknown) {
  if (value == null) return "geen waarde";
  if (typeof value === "string") return formatTokenString(value);
  if (typeof value === "number") return formatNumber(value, "nl");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("code" in record && "share" in record) return `${record.code}: ${formatNumber(Number(record.share) || 0, "nl")}%`;
    if ("platform" in record && "views" in record) return `${record.platform}: ${formatNumber(Number(record.views) || 0, "nl")}`;
    if ("creator" in record && "views" in record) return `${record.creator}: ${formatNumber(Number(record.views) || 0, "nl")}`;
    return Object.entries(record).slice(0, 2).map(([key, item]) => `${key}: ${String(item)}`).join(", ");
  }
  return String(value);
}

function truncateTokenValue(value: string, maxLength = 96) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function trafficQualityStatus(data: CampaignReportLiveData) {
  if (data.quality.criticalSignals > 0) return "Needs attention";
  if (data.quality.openSignals > 0 || data.quality.resolvedSignals > 0) return "Passed with exclusions";
  return "Passed";
}

function EditableMarker({ name }: { name: string }) {
  return (
    <div className="mt-5 inline-flex items-center rounded-md border border-dashed border-neutral-300 bg-white px-2 py-1 font-mono text-xs font-semibold text-neutral-500">
      [editable: {name}]
    </div>
  );
}

function CoverTokenFact({
  label,
  token,
  tokens,
  separator = "",
}: {
  label: string;
  token?: string;
  tokens?: string[];
  separator?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
        <EditableCopy>{label}</EditableCopy>
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-sm font-semibold text-neutral-400">
        {token ? <Token name={token} /> : null}
        {tokens?.map((item, index) => (
          <span key={item} className="inline-flex items-center gap-1">
            {index > 0 ? <span>{separator}</span> : null}
            <Token name={item} />
          </span>
        ))}
      </p>
    </div>
  );
}

function TemplateParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-sm leading-7 text-neutral-700">
      <EditableCopy>{children}</EditableCopy>
    </p>
  );
}

function TemplateOption({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        <EditableCopy>{title}</EditableCopy>
      </p>
      <p className="mt-2 text-sm leading-7 text-neutral-700">
        <EditableCopy>{children}</EditableCopy>
      </p>
    </div>
  );
}

function TemplateCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        <EditableCopy>{title}</EditableCopy>
      </p>
      <p className="mt-2 text-sm leading-7 text-neutral-700">
        <EditableCopy>{children}</EditableCopy>
      </p>
    </div>
  );
}

function TemplateKpiGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-7 grid gap-3 md:grid-cols-2">
      {items.map(([label, token]) => (
        <div key={label} className="rounded-lg border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            <EditableCopy>{label}</EditableCopy>
          </p>
          <p className="mt-3">
            <Token name={token} />
          </p>
        </div>
      ))}
    </div>
  );
}

function TemplateVariableGrid({ rows }: { rows: Array<[string, ...string[]]> }) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {rows.map(([label, ...tokens]) => (
        <div key={label} className="rounded-lg border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            <EditableCopy>{label}</EditableCopy>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tokens.map((token, index) => (
              <span key={`${label}-${token}`} className="inline-flex items-center gap-1">
                {index > 0 ? <span className="text-xs text-neutral-400">-</span> : null}
                <Token name={token} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateRepeat({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          <EditableCopy>{title}</EditableCopy>
        </p>
        <span className="rounded-full bg-neutral-100 px-2 py-1 font-mono text-[11px] font-semibold text-neutral-500">[repeat: {source}]</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TemplateBullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item, index) => (
        <li key={index} className="rounded-lg border border-neutral-200 p-4 text-sm leading-7 text-neutral-700">
          <EditableCopy>{item}</EditableCopy>
        </li>
      ))}
    </ul>
  );
}

function InlineEditable({
  value,
  onChange,
  placeholder,
  className,
  dark = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  className?: string;
  dark?: boolean;
}) {
  if (!onChange) {
    return <div className={cn("whitespace-pre-line", className)}>{value || placeholder}</div>;
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      className={cn(
        "report-inline-edit -mx-2 -my-1 min-h-[1.5em] whitespace-pre-wrap rounded-md border border-transparent px-2 py-1 outline-none transition focus:border-neutral-200 focus:bg-white focus:ring-4 focus:ring-neutral-950/5",
        dark && "focus:border-white/20 focus:bg-white/5 focus:ring-white/10",
        className,
        !value && "text-neutral-400",
      )}
      onFocus={(event) => {
        if (!value) event.currentTarget.textContent = "";
      }}
      onBlur={(event) => {
        const nextValue = event.currentTarget.innerText.trim();
        onChange(nextValue);
        if (!nextValue) event.currentTarget.textContent = placeholder;
      }}
    >
      {value || placeholder}
    </div>
  );
}

function ReportPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("report-print-page group/report mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-none border border-neutral-300 bg-white px-[28mm] py-[18mm] shadow-sm", className)}>
      {children}
    </article>
  );
}

function ReportHeading({ icon, kicker, title }: { icon: React.ReactNode; kicker: string; title: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          <EditableCopy>{kicker}</EditableCopy>
        </p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-neutral-950">
          <EditableCopy>{title}</EditableCopy>
        </h2>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">{icon}</div>
    </div>
  );
}

function CoverFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-400">{value}</p>
    </div>
  );
}

function NumberedItem({ index, text, onChange }: { index: number; text: string; onChange?: (value: string) => void }) {
  return (
    <div className="flex gap-3 rounded-lg border border-neutral-200 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{index}</span>
      <InlineEditable value={text} onChange={onChange} placeholder="Nieuw inzicht" className="w-full text-sm leading-6 text-neutral-700" />
    </div>
  );
}

function SetupRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">{text}</p>
    </div>
  );
}

function TimelineChart({ rows }: { rows: CampaignReportLiveData["timeline"] }) {
  const visible = rows.slice(-14);
  const max = Math.max(1, ...visible.map((row) => row.views));

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-950">Dagelijkse viewgroei</h3>
        <p className="text-xs text-neutral-500">{visible.length} dagen</p>
      </div>
      {visible.length === 0 ? (
        <EmptyPreviewLine text="Geen metricsnapshots in deze periode." />
      ) : (
        <div className="flex h-36 items-end gap-1">
          {visible.map((row) => (
            <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-neutral-900" style={{ height: `${Math.max(6, (row.views / max) * 128)}px` }} title={`${row.date}: ${formatNumber(row.views, "nl")} views`} />
              <span className="w-full truncate text-center text-[10px] text-neutral-400">{new Date(row.date).getDate()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusGrid({ statusCounts }: { statusCounts: Record<string, number> }) {
  const rows = objectRows(statusCounts);
  if (rows.length === 0) return null;

  return (
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{adminEnumLabel(row.label)}</p>
          <p className="mt-1 text-xl font-semibold text-neutral-950">{formatNumber(row.value, "nl")}</p>
        </div>
      ))}
    </div>
  );
}

function BreakdownRows({ rows }: { rows: CampaignReportLiveData["platformBreakdown"] }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return (
    <>
      {rows.map((row) => (
        <div key={row.platform} className="rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-950">{row.platform}</h3>
              <p className="mt-1 text-xs text-neutral-500">{row.clips} clips / {formatNumber(row.engagement, "nl")} engagement</p>
            </div>
            <p className="text-sm font-semibold text-neutral-950">{formatNumber(row.views, "nl")} views</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-neutral-100">
            <div className="h-2 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (row.views / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

function TopContentTable({ rows }: { rows: CampaignReportLiveData["topContent"] }) {
  if (rows.length === 0) return <EmptyPreviewLine text="Nog geen ingezonden content." />;
  return (
    <div className="mt-7 overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Clip</th>
            <th className="px-4 py-3 font-semibold">Creator</th>
            <th className="px-4 py-3 text-right font-semibold">Views</th>
            <th className="px-4 py-3 text-right font-semibold">Engagement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {row.thumbnailUrl ? <img src={row.thumbnailUrl} alt="" className="h-10 w-16 rounded-md object-cover" /> : <div className="h-10 w-16 rounded-md bg-neutral-100" />}
                  <a href={row.postUrl} target="_blank" rel="noreferrer" className="font-medium text-neutral-950">{row.platform}</a>
                </div>
              </td>
              <td className="px-4 py-3 text-neutral-600">{row.creator}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-950">{formatNumber(row.views, "nl")}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{formatNumber(row.engagement, "nl")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreatorTable({ rows }: { rows: CampaignReportLiveData["creators"] }) {
  if (rows.length === 0) return <EmptyPreviewLine text="Nog geen creatorprestaties beschikbaar." />;
  return (
    <div className="mt-7 overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Creator</th>
            <th className="px-4 py-3 text-right font-semibold">Clips</th>
            <th className="px-4 py-3 text-right font-semibold">Views</th>
            <th className="px-4 py-3 text-right font-semibold">Verdiend</th>
            <th className="px-4 py-3 text-right font-semibold">Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.creatorId}>
              <td className="px-4 py-3 font-medium text-neutral-950">{row.creator}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{row.submissions}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-950">{formatNumber(row.views, "nl")}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{formatCurrency(row.earnedAmount, "EUR", "nl")}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{row.flagged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferralSummary({ data }: { data: CampaignReportLiveData }) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-4">
      <SetupRow label="Referralclicks" value={formatNumber(data.referral.totalClicks, "nl")} />
      <SetupRow label="Invites" value={formatNumber(data.referral.inviteCount, "nl")} />
      <SetupRow label="Actieve clippers" value={formatNumber(data.referral.activeClipperCount, "nl")} />
      <SetupRow label="Activatie" value={formatPercent(data.referral.activationRate)} />
    </div>
  );
}

function Distribution({ title, rows, suffix = "" }: { title: string; rows: Array<{ label: string; value: number }>; suffix?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-neutral-500">Geen data</p> : null}
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-700">{adminEnumLabel(row.label)}</span>
              <span className="text-neutral-500">{formatNumber(row.value, "nl")}{suffix}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100">
              <div className="h-2 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-neutral-950">{formatNumber(value, "nl")}</p>
    </div>
  );
}

function BulletList({
  items,
  onItemChange,
  onAdd,
  addLabel,
}: {
  items: string[];
  onItemChange?: (index: number, value: string) => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3">
        <p className="text-sm text-neutral-500">Geen items.</p>
        {onAdd ? (
          <Button type="button" variant="outline" size="sm" className="report-inline-control mt-3 rounded-lg opacity-0 transition focus:opacity-100 group-hover/report:opacity-100" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel ?? "Item toevoegen"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-lg border border-neutral-200 p-4">
            <InlineEditable value={item} onChange={onItemChange ? (value) => onItemChange(index, value) : undefined} placeholder="Nieuw item" className="text-sm leading-6 text-neutral-700" />
          </li>
        ))}
      </ul>
      {onAdd ? (
        <Button type="button" variant="outline" size="sm" className="report-inline-control mt-3 rounded-lg opacity-0 transition focus:opacity-100 group-hover/report:opacity-100" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel ?? "Item toevoegen"}
        </Button>
      ) : null}
    </>
  );
}

function EmptyPreviewLine({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">{text}</p>;
}

function createEmptyEditorial(campaignName: string): CampaignReportEditorial {
  return {
    title: `${campaignName} campagnerapport`,
    executiveSummary: "",
    keyTakeaways: [],
    learnings: [],
    nextCampaignRecommendations: [],
    sectionSettings: { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS },
  };
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function replaceTextListItem(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value.trim() : item)).filter(Boolean).slice(0, 12);
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "-";
  if (!start) return `Tot ${formatDate(end, "nl")}`;
  if (!end) return `Vanaf ${formatDate(start, "nl")}`;
  return `${formatDate(start, "nl")} - ${formatDate(end, "nl")}`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function percentOrDash(value: number | null | undefined, label: string) {
  if (value == null) return "-";
  return `${formatPercent(value)} ${label}`;
}

function reportStatusLabel(status: CampaignReportStatusValue) {
  return REPORT_STATUS_LABELS[status];
}

function adminEnumLabel(value: string) {
  if (ENUM_LABELS[value]) return ENUM_LABELS[value];
  return value.replace(/_/g, " ").toLowerCase();
}

function objectRows(record: Record<string, number>) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}
