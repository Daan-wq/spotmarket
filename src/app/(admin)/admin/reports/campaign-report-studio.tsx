"use client";

import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import {
  formatAudienceCountryLabel,
  formatAudienceShare,
  reportQualityStatusLabel,
  type ReportQualityStatus,
} from "@/lib/admin/campaign-report-display";
import {
  CAMPAIGN_REPORT_SECTION_KEYS,
  DEFAULT_AUDIENCE_INSIGHT_TEMPLATE,
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
  type CampaignReportEditorialContent,
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
  portalEnabled: boolean;
  portalCreatedAt: string | null;
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
  visibleToBrand: boolean;
  brandVisibleAt: string | null;
  brandVisibleBy: string | null;
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
  editorialContent: CampaignReportEditorialContent;
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
  updateTemplateBlock: (key: string, value: string) => void;
  updateContentPatternTags: (value: string[]) => void;
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
  campaignAtAGlance: "Campagne in het kort",
  campaignPerformance: "Campagneprestatie",
  contentPerformance: "Contentprestaties",
  platformPerformance: "Platformprestaties",
  creatorContribution: "Creatorbijdrage",
  audienceReach: "Publiek en bereik",
  budgetValue: "Budget en waarde",
  qualityAssurance: "Kwaliteitscontrole",
  nextCampaign: "Volgende campagne",
  appendix: "Appendix",
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
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const selectedBrand = selectedReport?.brand ?? selectedCampaign?.brand ?? null;

  const [title, setTitle] = useState(baseEditorial.title);
  const [keyTakeaways, setKeyTakeaways] = useState(() => normalizeTextList(baseEditorial.keyTakeaways));
  const [learnings, setLearnings] = useState(() => normalizeTextList(baseEditorial.learnings));
  const [nextCampaignRecommendations, setNextCampaignRecommendations] = useState(() => normalizeTextList(baseEditorial.nextCampaignRecommendations));
  const [sectionSettings, setSectionSettings] = useState<CampaignReportSectionSettings>(
    () => normalizeSectionSettings(baseEditorial.sectionSettings),
  );
  const [editorialContent, setEditorialContent] = useState<CampaignReportEditorialContent>(() => ({
    ...baseEditorial.editorialContent,
    templateBlocks: {
      ...defaultTemplateBlocks(baseEditorial),
      ...baseEditorial.editorialContent.templateBlocks,
    },
  }));
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [showTokenValues, setShowTokenValues] = useState(true);
  const [savingMode, setSavingMode] = useState<"draft" | "final" | null>(null);
  const [sharingMode, setSharingMode] = useState<"show" | "hide" | null>(null);
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
      executiveSummary: renderTemplateForLegacy(editorialContent.templateBlocks["summary.body"] ?? baseEditorial.executiveSummary),
      keyTakeaways,
      learnings,
      nextCampaignRecommendations,
      sectionSettings,
      editorialContent,
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

  async function toggleBrandVisibility(nextVisible: boolean) {
    if (!selectedReport) return;
    setNotice(null);
    setSharingMode(nextVisible ? "show" : "hide");
    const response = await fetch(`/api/admin/campaign-reports/${selectedReport.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToBrand: nextVisible }),
    });
    const payload = await response.json().catch(() => ({}));
    setSharingMode(null);

    if (!response.ok) {
      setNotice(typeof payload.error === "string" ? payload.error : "Publicatie mislukt.");
      return;
    }

    setNotice(nextVisible ? "Rapport zichtbaar voor brand." : "Rapport verborgen voor brand.");
    router.refresh();
  }

  function selectCampaign(campaignId: string) {
    router.push(buildHref({ campaignId, reportId: null }));
  }

  function updateTemplateBlock(key: string, value: string) {
    setEditorialContent((current) => ({
      ...current,
      templateBlocks: {
        ...current.templateBlocks,
        [key]: value,
      },
    }));
  }

  function updateContentPatternTags(value: string[]) {
    setEditorialContent((current) => ({
      ...current,
      contentPatternTags: value,
    }));
  }

  function printReport() {
    setShowTokenValues(true);
    window.setTimeout(() => window.print(), 50);
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
            {selectedReport?.visibleToBrand ? <Badge variant="verified">Zichtbaar voor brand</Badge> : null}
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
          {selectedReport?.visibleToBrand ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => toggleBrandVisibility(false)}
              isPending={sharingMode === "hide"}
              disabled={selectedReport.status !== "FINAL"}
            >
              Verbergen
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => toggleBrandVisibility(true)}
              isPending={sharingMode === "show"}
              disabled={!selectedReport || selectedReport.status !== "FINAL" || !selectedBrand?.portalEnabled}
            >
              Zichtbaar voor brand
            </Button>
          )}
          {selectedReport?.visibleToBrand ? (
            <Link
              href="/brand"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            >
              <ExternalLink className="h-4 w-4" />
              Open /brand
            </Link>
          ) : null}
          <Button type="button" variant="ghost" className="rounded-lg" onClick={printReport} disabled={!liveData}>
            <Printer className="h-4 w-4" />
            Printen
          </Button>
        </div>
      </header>

      {selectedBrand ? (
        <section className="report-studio-chrome rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedBrand.portalEnabled ? "verified" : "pending"}>
                  {selectedBrand.portalEnabled ? "/brand toegang aangemaakt" : "/brand toegang ontbreekt"}
                </Badge>
                <span className="text-sm font-semibold text-neutral-950">{selectedBrand.name}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {selectedBrand.portalEnabled
                  ? "Je kunt een definitief rapport zichtbaar maken op /brand."
                  : "Maak eerst /brand toegang aan en nodig een contact uit voordat je een rapport publiceert."}
              </p>
            </div>
            <Link
              href={`/admin/client-access?brandId=${selectedBrand.id}`}
              prefetch={false}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-neutral-300 hover:text-neutral-950"
            >
              <ShieldCheck className="h-4 w-4" />
              Beheer /brand toegang
            </Link>
          </div>
        </section>
      ) : null}

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
          keyTakeaways={keyTakeaways}
          learnings={learnings}
          recommendations={nextCampaignRecommendations}
          editorialContent={editorialContent}
          sectionSettings={sectionSettings}
          status={selectedReport?.status ?? "DRAFT"}
          periodStart={periodStart}
          periodEnd={periodEnd}
          showTokenValues={showTokenValues}
          editors={{
            setTitle,
            updateTemplateBlock,
            updateContentPatternTags,
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
              prefetch={false}
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
                prefetch={false}
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
              <span className="block text-xs font-semibold text-neutral-950">{showTokenValues ? "Live voorbeeld" : "Variabelen"}</span>
              <span className="block text-[11px] leading-4 text-neutral-500">
                {showTokenValues ? "Toont het klantbeeld met actuele waarden." : "Toont bewerkbare copy met variabelen."}
              </span>
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
  keyTakeaways,
  learnings,
  recommendations,
  editorialContent,
  sectionSettings,
  status,
  periodStart,
  periodEnd,
  showTokenValues,
  editors,
}: {
  liveData: CampaignReportLiveData | null;
  title: string;
  keyTakeaways: string[];
  learnings: string[];
  recommendations: string[];
  editorialContent: CampaignReportEditorialContent;
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
  const blocks = editorialContent.templateBlocks;
  const topPlatform = liveData.platformBreakdown[0] ?? null;
  const topContent = liveData.topContent.filter((row) => row.views > 0).slice(0, 6);
  const topCreators = liveData.creators.filter((row) => row.views > 0).slice(0, 8);
  const showAudience = liveData.audience.sampleCount > 0;
  const paidViews = liveData.performance.targetViews
    ? Math.min(liveData.performance.currentViews, liveData.performance.targetViews)
    : liveData.performance.paidEligibleViews;
  const progressPercent = liveData.performance.deliveryProgress == null
    ? null
    : Math.round(liveData.performance.deliveryProgress * 100);
  const qualityStatus = trafficQualityStatus(liveData);
  const summaryLine = liveData.performance.overdeliveryViews > 0
    ? "De campagne heeft het afgesproken viewdoel ruim overtroffen, met extra bereik zonder extra mediabudget."
    : "De campagneprestaties worden afgezet tegen het afgesproken viewdoel en de beschikbare live performance.";

  return (
    <TokenPreviewContext.Provider value={{ liveData, status, periodStart, periodEnd, showValues: showTokenValues }}>
      <div className="report-print-root rounded-xl bg-[#efede8] px-3 py-5 sm:px-6" style={{ fontFamily: "var(--font-report), var(--font-sans)" }}>
        <div className="report-print-scroll mx-auto w-full max-w-[1480px] space-y-5">
          {enabled("cover") ? (
            <ReportSection className="flex min-h-[500px] items-center bg-white p-8 text-neutral-950 sm:p-12 lg:p-16">
              <EditablePlainText
                value={title}
                onChange={editors?.setTitle}
                placeholder="Campagnerapport"
                className="max-w-5xl text-6xl font-black leading-[0.98] tracking-normal text-neutral-950 md:text-8xl"
              />
            </ReportSection>
          ) : null}

          {enabled("executiveSummary") ? (
            <ReportSection>
              <SectionHeader kicker="Samenvatting" title="Resultaat in een oogopslag" icon={<FileText className="h-5 w-5" />} />
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div>
                  <p className="text-5xl font-semibold leading-none tracking-normal text-neutral-950 md:text-7xl">
                    {progressPercent == null ? "Campagneprestatie" : `${progressPercent}% van doel`}
                  </p>
                  <p className="mt-4 max-w-3xl text-xl leading-8 text-neutral-700">{summaryLine}</p>
                  <CopyBlock
                    value={blocks["summary.body"] ?? liveData.defaults.executiveSummary}
                    onChange={(value) => editors?.updateTemplateBlock("summary.body", value)}
                    className="mt-8 max-w-4xl text-lg leading-8 text-neutral-800"
                  />
                </div>
                <div className="grid gap-3">
                  <HeroMetric label="Totale views" value={formatNumber(liveData.performance.currentViews, "nl")} />
                  <HeroMetric label="Doelviews" value={liveData.performance.targetViews ? formatNumber(liveData.performance.targetViews, "nl") : "-"} />
                  <HeroMetric label="Extra bereik" value={formatNumber(liveData.performance.overdeliveryViews, "nl")} accent={liveData.performance.overdeliveryViews > 0} />
                  <HeroMetric label="Effectieve CPM" value={formatCurrency(liveData.performance.costPerThousandViews ?? 0, "EUR", "nl")} />
                  <HeroMetric label="Goedgekeurde clips" value={formatNumber(liveData.performance.approvedClips, "nl")} />
                </div>
              </div>
              <InsightLine>
                <CopyBlock
                  value={blocks["summary.conclusion"] ?? "Dit vertaalt de campagneprestatie naar concreet extra bereik, budgetwaarde en richting voor de volgende campagne."}
                  onChange={(value) => editors?.updateTemplateBlock("summary.conclusion", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("campaignAtAGlance") ? (
            <ReportSection>
              <SectionHeader kicker="Campagne in het kort" title="Doel, bereik en overdelivery" icon={<Target className="h-5 w-5" />} />
              <DeliveryProgress data={liveData} />
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Betaalde views" value={formatNumber(paidViews, "nl")} helper="Gemaximeerd op het afgesproken doel" />
                <StatTile label="Extra bereik" value={formatNumber(liveData.performance.overdeliveryViews, "nl")} helper="Views boven doel zonder extra budget" />
                <StatTile label="Budget gebruikt" value={formatCurrency(liveData.performance.budgetUsed, "EUR", "nl")} helper={formatPercent(liveData.performance.budgetUsedPercent)} />
                <StatTile label="Afgesproken CPM" value={formatCurrency(liveData.performance.cpmPerThousand ?? 0, "EUR", "nl")} helper="Per 1.000 views" />
              </div>
              <InsightLine>
                <CopyBlock
                  value={blocks["glance.statement"] ?? "Extra bereik boven het afgesproken doel wordt zichtbaar als gratis bonus voor de klant."}
                  onChange={(value) => editors?.updateTemplateBlock("glance.statement", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("campaignPerformance") ? (
            <ReportSection>
              <SectionHeader kicker="Campagneprestatie" title="Groei van de campagne" icon={<TrendingUp className="h-5 w-5" />} />
              <CumulativeViewsChart rows={liveData.timeline} targetViews={liveData.performance.targetViews} currentViews={liveData.performance.currentViews} />
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <StatTile label="Inzendingen" value={formatNumber(liveData.performance.totalSubmissions, "nl")} helper="Alle statussen" />
                <StatTile label="Goedkeuringspercentage" value={formatPercent(liveData.performance.approvalRate)} helper="Goedgekeurd na review" />
                <StatTile label="Actieve creators" value={formatNumber(liveData.performance.activeCreators, "nl")} helper="Creators met inzendingen" />
              </div>
              <InsightLine>
                <CopyBlock
                  value={blocks["performance.insight"] ?? "De cumulatieve viewlijn laat zien wanneer de campagne tractie kreeg en welke momenten performance versnelden."}
                  onChange={(value) => editors?.updateTemplateBlock("performance.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("contentPerformance") && topContent.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Contentprestaties" title="Topclips en winnende patronen" icon={<Sparkles className="h-5 w-5" />} />
              <TopContentWall rows={topContent} blocks={blocks} editors={editors} />
              <div className="mt-8 rounded-xl bg-neutral-950 p-6 text-white">
                <p className="text-sm font-semibold text-neutral-300">Analyse van contentpatronen</p>
                <EditableTags
                  tags={editorialContent.contentPatternTags}
                  onChange={editors?.updateContentPatternTags}
                />
              </div>
              <InsightLine>
                  <CopyBlock
                  value={blocks["content.insight"] ?? "De best presterende clips combineren een snelle hook, duidelijke merkplaatsing en een editstijl die natuurlijk voelt voor het platform."}
                  onChange={(value) => editors?.updateTemplateBlock("content.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("platformPerformance") && liveData.platformBreakdown.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Platformprestaties" title="Kanaalvergelijking" icon={<BarChart3 className="h-5 w-5" />} />
              <PlatformPerformanceRows rows={liveData.platformBreakdown} />
              <InsightLine>
                <CopyBlock
                  value={blocks["platform.insight"] ?? "{{platformBreakdown[0].platform}} leverde het grootste deel van het bereik en verdient extra focus in de volgende campagne."}
                  onChange={(value) => editors?.updateTemplateBlock("platform.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("creatorContribution") && topCreators.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Creatorbijdrage" title="Bijdrage van creators" icon={<Users className="h-5 w-5" />} />
              <CreatorContribution rows={topCreators} />
              <InsightLine>
                <CopyBlock
                  value={blocks["creator.insight"] ?? "Heractiveer creators die hoge views combineren met consistente kwaliteit en duidelijke merkfit."}
                  onChange={(value) => editors?.updateTemplateBlock("creator.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("audienceReach") && showAudience ? (
            <ReportSection>
              <SectionHeader kicker="Publiek en bereik" title="Bereikt publiek" icon={<Users className="h-5 w-5" />} />
              <AudienceSnapshot data={liveData.audience} />
              <InsightLine>
                <CopyBlock
                  value={blocks["audience.insight"] ?? DEFAULT_AUDIENCE_INSIGHT_TEMPLATE}
                  onChange={(value) => editors?.updateTemplateBlock("audience.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("budgetValue") ? (
            <ReportSection>
              <SectionHeader kicker="Budget en waarde" title="Betaald bereik versus extra bereik" icon={<Wallet className="h-5 w-5" />} />
              <BudgetValueVisual data={liveData} />
              <InsightLine>
                <CopyBlock
                  value={blocks["budget.insight"] ?? "Betaalde views zijn gemaximeerd op het afgesproken doel. Extra views boven dit doel worden gerapporteerd als extra bereik zonder extra kosten."}
                  onChange={(value) => editors?.updateTemplateBlock("budget.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("qualityAssurance") ? (
            <ReportSection>
              <SectionHeader kicker="Kwaliteitscontrole" title="Validatie van prestaties" icon={<ShieldCheck className="h-5 w-5" />} />
              <QualityAssurance status={qualityStatus} data={liveData} />
              <InsightLine>
                <CopyBlock
                  value={blocks["quality.insight"] ?? "Alle clips en views zijn gecontroleerd op campagnevoorwaarden, dubbele activiteit en verkeerskwaliteit. Alleen geldige prestaties zijn meegenomen in de goedgekeurde resultaten."}
                  onChange={(value) => editors?.updateTemplateBlock("quality.insight", value)}
                />
              </InsightLine>
            </ReportSection>
          ) : null}

          {enabled("nextCampaign") ? (
            <ReportSection>
              <SectionHeader kicker="Aanbevelingen voor volgende campagne" title="Concreet plan voor de volgende ronde" icon={<RefreshCw className="h-5 w-5" />} />
              <CopyBlock
                value={blocks["next.plan"] ?? "Voor de volgende campagne adviseren we om de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de briefing te zetten en budget te sturen naar de kanalen met de laagste effectieve CPM."}
                onChange={(value) => editors?.updateTemplateBlock("next.plan", value)}
                className="max-w-5xl text-xl leading-9 text-neutral-800"
              />
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {[...new Set([...recommendations, ...learnings])].slice(0, 6).map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-700">
                    {item}
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {enabled("appendix") ? (
            <ReportSection>
              <SectionHeader kicker="Appendix" title="Definities en ruwe samenvatting" icon={<FileText className="h-5 w-5" />} />
              <Appendix data={liveData} keyTakeaways={keyTakeaways} />
            </ReportSection>
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
    return <span className="align-baseline">{previewValue ?? "geen waarde"}</span>;
  }

  return (
    <span className="align-baseline">
      {"{{"}{name}{"}}"}
    </span>
  );
}

function CopyBlock({
  value,
  onChange,
  className,
  placeholder = "Schrijf rapporttekst...",
}: {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const tokenContext = useContext(TokenPreviewContext);
  if (!tokenContext?.showValues && onChange) {
    return (
      <EditablePlainText
        key="template-editor"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }
  return (
    <div key="live-preview" className={cn("whitespace-pre-wrap", className)}>
      {renderTemplateText(value || placeholder)}
    </div>
  );
}

function EditablePlainText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  if (!onChange) {
    return <div className={cn("whitespace-pre-wrap", className)}>{value || placeholder}</div>;
  }
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      tabIndex={0}
      className={cn(
        "min-h-[1.25em] cursor-text whitespace-pre-wrap rounded-sm outline-none transition focus:bg-neutral-950/[0.025]",
        "selection:bg-neutral-950 selection:text-white",
        !value && "text-neutral-400",
        className,
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

function renderTemplateText(value: string) {
  const parts = value.split(/(\{\{[^}]+\}\})/g).filter(Boolean);
  return parts.map((part, index) => {
    const match = part.match(/^\{\{([^}]+)\}\}$/);
    return match ? <Token key={`${part}-${index}`} name={match[1].trim()} /> : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function ReportSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("report-print-page rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10", className)}>
      {children}
    </section>
  );
}

function SectionHeader({ kicker, title, icon }: { kicker: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6 border-b border-neutral-200 pb-5">
      <div>
        <p className="text-xs font-semibold text-neutral-400">{kicker}</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-neutral-950 md:text-4xl">{title}</h2>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">{icon}</div>
    </div>
  );
}

function HeroMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-5", accent ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white")}>
      <p className={cn("text-sm font-medium", accent ? "text-neutral-300" : "text-neutral-500")}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-normal">{value}</p>
    </div>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-normal text-neutral-950">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-5 text-neutral-500">{helper}</p> : null}
    </div>
  );
}

function InsightLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 border-l-4 border-neutral-950 bg-neutral-50 px-5 py-4 text-base leading-7 text-neutral-800">
      {children}
    </div>
  );
}

function DeliveryProgress({ data }: { data: CampaignReportLiveData }) {
  const target = data.performance.targetViews ?? 0;
  const current = data.performance.currentViews;
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const overdelivery = target > 0 ? Math.max(0, ((current - target) / target) * 100) : 0;
  return (
    <div className="rounded-2xl bg-neutral-950 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-400">Voortgang naar doel</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-normal">{formatNumber(current, "nl")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-400">Doelviews</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{target ? formatNumber(target, "nl") : "-"}</p>
        </div>
      </div>
      <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(2, progress)}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-neutral-300">Betaald doel tot {target ? formatNumber(target, "nl") : "-"}</span>
        {data.performance.overdeliveryViews > 0 ? (
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-neutral-950">
            +{formatNumber(data.performance.overdeliveryViews, "nl")} extra bereik
            {overdelivery > 0 ? ` / +${Math.round(overdelivery)}%` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CumulativeViewsChart({
  rows,
  targetViews,
  currentViews,
}: {
  rows: CampaignReportLiveData["timeline"];
  targetViews: number | null;
  currentViews: number;
}) {
  const cumulative = rows.reduce<Array<{ date: string; views: number }>>((acc, row) => {
    const previous = acc.at(-1)?.views ?? 0;
    acc.push({ date: row.date, views: previous + row.views });
    return acc;
  }, []);
  const visible = cumulative.length > 0 ? cumulative : [{ date: "Vandaag", views: currentViews }];
  const max = Math.max(1, targetViews ?? 0, currentViews, ...visible.map((row) => row.views));
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex h-64 items-end gap-2 border-b border-neutral-200 pb-4">
        {visible.map((row, index) => (
          <div key={`${row.date}-${index}`} className="group relative flex min-w-0 flex-1 items-end">
            <div
              className="w-full rounded-t bg-neutral-950 transition group-hover:bg-neutral-700"
              style={{ height: `${Math.max(4, (row.views / max) * 230)}px` }}
              title={`${formatDate(row.date, "nl")}: ${formatNumber(row.views, "nl")} cumulatieve views`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-neutral-500">
        <span>{visible.length} meetpunten</span>
        <span>Huidige views: {formatNumber(currentViews, "nl")}</span>
        {targetViews ? <span>Doelviews: {formatNumber(targetViews, "nl")}</span> : null}
      </div>
    </div>
  );
}

function TopContentWall({
  rows,
  blocks,
  editors,
}: {
  rows: CampaignReportLiveData["topContent"];
  blocks: Record<string, string>;
  editors?: ReportInlineEditors;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => {
        const noteKey = `topContent.${row.id}.note`;
        return (
          <article key={row.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="aspect-video bg-neutral-100">
              {row.thumbnailUrl ? (
                <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">Geen thumbnail</div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">#{index + 1} / {row.platform}</p>
                  <h3 className="mt-1 text-lg font-semibold text-neutral-950">{row.creator}</h3>
                </div>
                <a href={row.postUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-950 hover:text-white" aria-label="Bekijk video">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-neutral-500">Views</p>
                  <p className="mt-1 font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Engagement</p>
                  <p className="mt-1 font-semibold tabular-nums text-neutral-950">{formatNumber(row.engagement, "nl")}</p>
                </div>
              </div>
              <CopyBlock
                value={blocks[noteKey] ?? "Werkte door een snelle hook, duidelijke merkherkenning en een editstijl die natuurlijk voelt voor het platform."}
                onChange={(value) => editors?.updateTemplateBlock(noteKey, value)}
                className="mt-5 text-sm leading-6 text-neutral-700"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EditableTags({ tags, onChange }: { tags: string[]; onChange?: (value: string[]) => void }) {
  const value = tags.length > 0 ? tags.join(", ") : "snelle hook, platform-native editstijl, merk zichtbaar in eerste 3 seconden";
  return (
    <EditablePlainText
      value={value}
      onChange={onChange ? (nextValue) => onChange(nextValue.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12)) : undefined}
      placeholder="Voeg patronen toe, gescheiden door komma's"
      className="mt-4 text-2xl font-semibold leading-9 text-white"
    />
  );
}

function PlatformPerformanceRows({ rows }: { rows: CampaignReportLiveData["platformBreakdown"] }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.platform} className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-neutral-950">{row.platform}</h3>
              <p className="mt-1 text-sm text-neutral-500">{row.clips} goedgekeurde clips / {formatPercent(row.engagementRate)} engagementpercentage</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
              <p className="text-sm text-neutral-500">views</p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-neutral-100">
            <div className="h-3 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (row.views / max) * 100)}%` }} />
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <span>Gem. views per clip: <strong>{formatNumber(row.averageViewsPerClip, "nl")}</strong></span>
            <span>Effectieve CPM: <strong>{formatCurrency(row.effectiveCpm ?? 0, "EUR", "nl")}</strong></span>
            <span>Engagement: <strong>{formatNumber(row.engagement, "nl")}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreatorContribution({ rows }: { rows: CampaignReportLiveData["creators"] }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.creatorId} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-[220px_minmax(0,1fr)_160px] md:items-center">
          <div>
            <p className="font-semibold text-neutral-950">{row.creator}</p>
            <p className="text-sm text-neutral-500">{row.approvedSubmissions}/{row.submissions} clips goedgekeurd</p>
          </div>
          <div className="h-3 rounded-full bg-neutral-100">
            <div className="h-3 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (row.views / max) * 100)}%` }} />
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
            <p className="text-sm text-neutral-500">{formatPercent(row.approvalRate)} goedgekeurd</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AudienceSnapshot({ data }: { data: CampaignReportLiveData["audience"] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Distribution
        title="Top landen"
        rows={data.topCountries.map((row) => ({ label: row.code, value: row.share }))}
        formatLabel={formatAudienceCountryLabel}
        formatValue={formatAudienceShare}
      />
      <Distribution title="Leeftijd" rows={objectRows(data.ageBuckets)} formatValue={formatAudienceShare} />
      <Distribution title="Gender" rows={objectRows(data.genderSplit)} formatValue={formatAudienceShare} />
    </div>
  );
}

function BudgetValueVisual({ data }: { data: CampaignReportLiveData }) {
  const paidViews = data.performance.targetViews
    ? Math.min(data.performance.currentViews, data.performance.targetViews)
    : data.performance.paidEligibleViews;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <StatTile label="Betaald doel" value={data.performance.targetViews ? formatNumber(data.performance.targetViews, "nl") : "-"} helper="Afgesproken op basis van budget en CPM" />
      <StatTile label="Betaalde views" value={formatNumber(paidViews, "nl")} helper="Maximaal afgerekend tot doelbasis" />
      <StatTile label="Extra bereik" value={formatNumber(data.performance.overdeliveryViews, "nl")} helper="Niet extra doorbelast" />
      <StatTile label="Budget" value={formatCurrency(data.campaign.totalBudget, "EUR", "nl")} helper="Netto campagnebudget" />
      <StatTile label="Budget gebruikt" value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")} helper={formatPercent(data.performance.budgetUsedPercent)} />
      <StatTile label="Effectieve CPM totaal" value={formatCurrency(data.performance.costPerThousandViews ?? 0, "EUR", "nl")} helper="Gebaseerd op totale huidige views" />
    </div>
  );
}

function QualityAssurance({ status, data }: { status: ReportQualityStatus; data: CampaignReportLiveData }) {
  const variant = status === "needs_attention" ? "border-amber-300 bg-amber-50" : status === "passed_with_exclusions" ? "border-neutral-300 bg-neutral-50" : "border-emerald-200 bg-emerald-50";
  return (
    <div className={cn("rounded-2xl border p-6", variant)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-600">Kwaliteitsstatus</p>
          <p className="mt-2 text-4xl font-semibold text-neutral-950">{reportQualityStatusLabel(status)}</p>
        </div>
        <ShieldCheck className="h-12 w-12 text-neutral-800" />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatTile label="Goedgekeurde prestaties" value={formatNumber(data.performance.currentViews, "nl")} helper="Goedgekeurde views" />
        <StatTile label="Uitgesloten activiteit" value={formatNumber(data.quality.resolvedSignals, "nl")} helper="Niet meegenomen in goedgekeurde prestaties" />
        <StatTile label="Open aandachtspunten" value={formatNumber(data.quality.criticalSignals, "nl")} helper="Kritieke reviewstatus" />
      </div>
    </div>
  );
}

function Appendix({ data, keyTakeaways }: { data: CampaignReportLiveData; keyTakeaways: string[] }) {
  const rows = [
    ["Definitie totale views", "Alle live gemeten views op goedgekeurde clips."],
    ["Definitie betaalde views", "Views die afgerekend worden binnen het afgesproken doel en de campagnevoorwaarden."],
    ["Definitie extra bereik", "Views boven het afgesproken doel zonder extra budget."],
    ["Doelbron", data.performance.targetViewsSource],
    ["Statusoverzicht", objectRows(data.performance.statusCounts).map((row) => `${adminEnumLabel(row.label)}: ${row.value}`).join(", ")],
    ["Belangrijkste inzichten", keyTakeaways.join(" ")],
  ].filter(([, value]) => Boolean(value));
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-3 border-b border-neutral-100 p-4 last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)]">
          <p className="text-sm font-semibold text-neutral-500">{label}</p>
          <p className="text-sm leading-6 text-neutral-800">{value}</p>
        </div>
      ))}
    </div>
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
  if (typeof value === "string") {
    if (name.toLowerCase().includes("trafficqualitystatus")) {
      return isReportQualityStatus(value) ? reportQualityStatusLabel(value) : value;
    }
    return truncateTokenValue(formatTokenString(value));
  }
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
    if ("code" in record && "share" in record) return `${formatAudienceCountryLabel(String(record.code))}: ${formatAudienceShare(Number(record.share) || 0)}`;
    if ("platform" in record && "views" in record) return `${record.platform}: ${formatNumber(Number(record.views) || 0, "nl")}`;
    if ("creator" in record && "views" in record) return `${record.creator}: ${formatNumber(Number(record.views) || 0, "nl")}`;
    return Object.entries(record).slice(0, 2).map(([key, item]) => `${key}: ${String(item)}`).join(", ");
  }
  return String(value);
}

function truncateTokenValue(value: string, maxLength = 96) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function trafficQualityStatus(data: CampaignReportLiveData): ReportQualityStatus {
  if (data.quality.criticalSignals > 0) return "needs_attention";
  if (data.quality.openSignals > 0 || data.quality.resolvedSignals > 0) return "passed_with_exclusions";
  return "passed";
}

function isReportQualityStatus(value: string): value is ReportQualityStatus {
  return value === "passed" || value === "passed_with_exclusions" || value === "needs_attention";
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

function Distribution({
  title,
  rows,
  formatLabel = adminEnumLabel,
  formatValue = (value) => formatNumber(value, "nl"),
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  formatLabel?: (value: string) => string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-neutral-500">Geen data</p> : null}
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-700">{formatLabel(row.label)}</span>
              <span className="text-neutral-500">{formatValue(row.value)}</span>
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
    editorialContent: {
      templateBlocks: {},
      contentPatternTags: [],
      topContentNotes: {},
      platformRecommendations: {},
      creatorRecommendations: [],
      qualityNote: "",
      nextCampaignPlan: "",
      coverImageUrl: null,
    },
  };
}

function defaultTemplateBlocks(editorial: CampaignReportEditorial): Record<string, string> {
  return {
    "cover.kicker": "Campagne prestatierapport",
    "summary.body": editorial.executiveSummary || "De campagne heeft {{performance.currentViews}} totale views gegenereerd met {{performance.approvedClips}} goedgekeurde clips. Het afgesproken doel was {{performance.targetViews}} views. Extra bereik boven het doel wordt gerapporteerd als bonus zonder extra budget.",
    "summary.conclusion": "Dit betekent dat de campagneperformance direct te koppelen is aan bereik, budgetwaarde en concrete learnings voor de volgende ronde.",
    "glance.statement": "Extra bereik boven het afgesproken doel wordt zichtbaar als gratis bonus voor de klant.",
    "performance.insight": "De cumulatieve viewlijn laat zien wanneer de campagne tractie kreeg en welke momenten performance versnelden.",
    "content.insight": "De best presterende clips combineren een snelle hook, duidelijke merkplaatsing en een editstijl die natuurlijk voelt voor het platform.",
    "platform.insight": "{{platformBreakdown[0].platform}} leverde het grootste deel van het bereik en verdient extra focus in de volgende campagne.",
    "creator.insight": "Heractiveer creators die hoge views combineren met consistente kwaliteit en duidelijke merkfit.",
    "audience.insight": DEFAULT_AUDIENCE_INSIGHT_TEMPLATE,
    "budget.insight": "Betaalde views zijn gemaximeerd op het afgesproken doel. Extra views boven dit doel worden gerapporteerd als extra bereik zonder extra kosten.",
    "quality.insight": "Alle clips en views zijn gecontroleerd op campagnevoorwaarden, dubbele activiteit en verkeerskwaliteit. Alleen geldige prestaties zijn meegenomen in de goedgekeurde resultaten.",
    "next.plan": editorial.nextCampaignRecommendations[0] || "Voor de volgende campagne adviseren we om de best presterende creators opnieuw te activeren, winnende hooks expliciet in de briefing te zetten en budget te sturen naar kanalen met de laagste effectieve CPM.",
  };
}

function renderTemplateForLegacy(value: string) {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => `{${String(token).trim()}}`);
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function replaceTextListItem(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value.trim() : item)).filter(Boolean).slice(0, 12);
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
