"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Eye,
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
import { useMemo, useState } from "react";
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

      <div className="grid gap-5 xl:grid-cols-[18rem_25rem_minmax(0,1fr)]">
        <aside className="report-studio-chrome space-y-4">
          <HistoryPanel
            reports={reports}
            brands={brands}
            campaigns={campaigns}
            filters={filters}
            selectedReportId={selectedReport?.id ?? null}
            historyCounts={historyCounts}
            buildHref={buildHref}
          />
        </aside>

        <section className="report-studio-chrome space-y-4">
          <EditorPanel
            title={title}
            setTitle={setTitle}
            executiveSummary={executiveSummary}
            setExecutiveSummary={setExecutiveSummary}
            keyTakeaways={keyTakeaways}
            setKeyTakeaways={setKeyTakeaways}
            learnings={learnings}
            setLearnings={setLearnings}
            nextCampaignRecommendations={nextCampaignRecommendations}
            setNextCampaignRecommendations={setNextCampaignRecommendations}
            periodStart={periodStart}
            setPeriodStart={setPeriodStart}
            periodEnd={periodEnd}
            setPeriodEnd={setPeriodEnd}
            sectionSettings={sectionSettings}
            setSectionSettings={setSectionSettings}
            liveData={liveData}
          />
        </section>

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
          />
        </main>
      </div>
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
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Rapporthistorie</h2>
          <p className="mt-1 text-xs text-neutral-500">Totaal: {historyCounts.all}</p>
        </div>
        <FileText className="h-4 w-4 text-neutral-400" />
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value })}
            className={cn(
              "rounded-md px-2 py-1.5 text-center text-xs font-semibold text-neutral-500 transition",
              filters.status === tab.value && "bg-white text-neutral-950 shadow-sm",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form action="/admin/reports" className="space-y-3">
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
        <div className="grid grid-cols-2 gap-2">
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
          <input name="dateTo" type="date" defaultValue={filters.dateTo} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
        </div>
        <Button type="submit" variant="outline" size="sm" className="w-full rounded-lg">
          <SlidersHorizontal className="h-4 w-4" />
          Filteren
        </Button>
      </form>

      <div className="space-y-2">
        {reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-8 text-center">
            <p className="text-sm font-medium text-neutral-950">Geen rapporten</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Nieuwe concepten verschijnen hier na het opslaan.</p>
          </div>
        ) : (
          reports.map((report) => (
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
              <p className="mt-2 text-xs text-neutral-500">{report.brand?.name ?? "Geen merk"} / {report.campaign?.name ?? "Campagne"}</p>
              <p className="mt-1 text-xs text-neutral-400">{formatDate(report.updatedAt, "nl")}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function EditorPanel({
  title,
  setTitle,
  executiveSummary,
  setExecutiveSummary,
  keyTakeaways,
  setKeyTakeaways,
  learnings,
  setLearnings,
  nextCampaignRecommendations,
  setNextCampaignRecommendations,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  sectionSettings,
  setSectionSettings,
  liveData,
}: {
  title: string;
  setTitle: (value: string) => void;
  executiveSummary: string;
  setExecutiveSummary: (value: string) => void;
  keyTakeaways: string[];
  setKeyTakeaways: (value: string[]) => void;
  learnings: string[];
  setLearnings: (value: string[]) => void;
  nextCampaignRecommendations: string[];
  setNextCampaignRecommendations: (value: string[]) => void;
  periodStart: string;
  setPeriodStart: (value: string) => void;
  periodEnd: string;
  setPeriodEnd: (value: string) => void;
  sectionSettings: CampaignReportSectionSettings;
  setSectionSettings: (value: CampaignReportSectionSettings) => void;
  liveData: CampaignReportLiveData | null;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Editor</h2>
          <p className="mt-1 text-xs text-neutral-500">{liveData ? liveData.campaign.brandName : "Geen campagne geselecteerd"}</p>
        </div>
        <Sparkles className="h-4 w-4 text-neutral-400" />
      </div>

      <Field label="Titel">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="report-input h-10" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start periode">
          <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="report-input h-10" />
        </Field>
        <Field label="Einde periode">
          <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="report-input h-10" />
        </Field>
      </div>

      <Field label="Samenvatting">
        <textarea value={executiveSummary} onChange={(event) => setExecutiveSummary(event.target.value)} rows={7} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Belangrijkste inzichten">
        <textarea value={keyTakeaways.join("\n")} onChange={(event) => setKeyTakeaways(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Learnings">
        <textarea value={learnings.join("\n")} onChange={(event) => setLearnings(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Aanbevelingen voor volgende campagne">
        <textarea value={nextCampaignRecommendations.join("\n")} onChange={(event) => setNextCampaignRecommendations(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Secties</p>
          <Eye className="h-4 w-4 text-neutral-400" />
        </div>
        <div className="space-y-1.5">
          {CAMPAIGN_REPORT_SECTION_KEYS.map((sectionKey) => (
            <label key={sectionKey} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <span className="font-medium text-neutral-700">{SECTION_LABELS[sectionKey]}</span>
              <input
                type="checkbox"
                checked={sectionSettings[sectionKey]}
                onChange={(event) => setSectionSettings({ ...sectionSettings, [sectionKey]: event.target.checked })}
                className="h-4 w-4 accent-neutral-950"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
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
  const reportPeriod = formatPeriod(periodStart || liveData.period.start, periodEnd || liveData.period.end);
  const metricCards = [
    { label: "Doelviews", value: liveData.performance.targetViews ? formatNumber(liveData.performance.targetViews, "nl") : "-", detail: liveData.performance.targetViewsSource === "budget_cpm" ? "budget / CPM" : "legacy doel" },
    { label: "Huidige views", value: formatNumber(liveData.performance.currentViews, "nl"), detail: percentOrDash(liveData.performance.deliveryProgress, "van doel") },
    { label: "Overdelivery", value: formatNumber(liveData.performance.overdeliveryViews, "nl"), detail: liveData.performance.overdeliveryViews > 0 ? "gratis extra bereik" : "nog geen bonusviews" },
    { label: "Budget gebruikt", value: formatCurrency(liveData.performance.budgetUsed, "EUR", "nl"), detail: percentOrDash(liveData.performance.budgetUsedPercent, "verbruikt") },
    { label: "Goedgekeurde clips", value: formatNumber(liveData.performance.approvedClips, "nl"), detail: `${formatNumber(liveData.performance.totalSubmissions, "nl")} inzendingen` },
    { label: "CPM", value: liveData.performance.cpmPerThousand == null ? "-" : formatCurrency(liveData.performance.cpmPerThousand, "EUR", "nl"), detail: "per 1.000 views" },
  ];

  return (
    <div className="report-print-root">
      <div className="report-print-scroll space-y-5 overflow-hidden">
        {enabled("cover") ? (
          <ReportPage className="flex min-h-[840px] flex-col justify-between bg-neutral-950 text-white">
            <div>
              <div className="flex items-center justify-between gap-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">Campagnerapport</p>
                <Badge variant={status === "FINAL" ? "verified" : "pending"}>{reportStatusLabel(status)}</Badge>
              </div>
              <h2 className="mt-20 max-w-2xl text-5xl font-semibold leading-tight tracking-normal">{title}</h2>
            </div>
            <div className="grid gap-6 border-t border-white/20 pt-8 md:grid-cols-3">
              <CoverFact label="Merk" value={liveData.campaign.brandName} />
              <CoverFact label="Campagne" value={liveData.campaign.name} />
              <CoverFact label="Periode" value={reportPeriod} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("executiveSummary") ? (
          <ReportPage>
            <ReportHeading icon={<FileText className="h-5 w-5" />} kicker={liveData.campaign.brandName} title="Samenvatting" />
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-700">{executiveSummary}</p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {keyTakeaways.map((takeaway, index) => (
                <NumberedItem key={`${takeaway}-${index}`} index={index + 1} text={takeaway} />
              ))}
            </div>
          </ReportPage>
        ) : null}

        {enabled("campaignSetup") ? (
          <ReportPage>
            <ReportHeading icon={<CalendarDays className="h-5 w-5" />} kicker={reportPeriod} title="Campagne-inrichting" />
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <SetupRow label="Platforms" value={liveData.campaign.platforms.join(", ") || "-"} />
              <SetupRow label="Doelviews" value={liveData.performance.targetViews ? formatNumber(liveData.performance.targetViews, "nl") : "-"} />
              <SetupRow label="Budget" value={formatCurrency(liveData.campaign.totalBudget, "EUR", "nl")} />
              <SetupRow label="CPM" value={liveData.performance.cpmPerThousand == null ? "-" : formatCurrency(liveData.performance.cpmPerThousand, "EUR", "nl")} />
              <SetupRow label="Min. volgers" value={formatNumber(liveData.campaign.target.minFollowers, "nl")} />
              <SetupRow label="Doelland" value={liveData.campaign.target.country ?? "-"} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <TextBlock title="Vereisten" text={liveData.campaign.requirements || "-"} />
              <TextBlock title="Contentrichtlijnen" text={liveData.campaign.contentGuidelines || "-"} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {liveData.campaign.requiredHashtags.length > 0
                ? liveData.campaign.requiredHashtags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">{tag}</span>)
                : <span className="text-sm text-neutral-500">Geen verplichte hashtags</span>}
            </div>
            <p className="mt-6 rounded-lg bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
              Measurement definition: doelviews zijn berekend uit budget en CPM. Huidige views zijn live goedgekeurde views. Overdelivery is extra bereik boven het afgesproken doel zonder extra budget.
            </p>
          </ReportPage>
        ) : null}

        {enabled("performance") ? (
          <ReportPage>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Live dashboarddata" title="Prestatieoverzicht" />
            <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-neutral-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">{card.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{card.detail}</p>
                </div>
              ))}
            </div>
            {liveData.performance.overdeliveryViews > 0 ? (
              <p className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
                Gratis bonus voor de client: deze campagne levert nog steeds views boven het afgesproken doel. Deze overdelivery laat zien dat oude campagnecontent blijft doorlopen zonder extra budget.
              </p>
            ) : null}
            <TimelineChart rows={liveData.timeline} />
            <StatusGrid statusCounts={liveData.performance.statusCounts} />
          </ReportPage>
        ) : null}

        {enabled("platformBreakdown") ? (
          <ReportPage>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Kanaallevering" title="Platformverdeling" />
            <div className="mt-7 space-y-3">
              {liveData.platformBreakdown.length === 0 ? <EmptyPreviewLine text="Nog geen goedgekeurde platformdata." /> : null}
              <BreakdownRows rows={liveData.platformBreakdown} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("topContent") ? (
          <ReportPage>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Beste clips" title="Topcontent" />
            <TopContentTable rows={liveData.topContent.slice(0, 8)} />
          </ReportPage>
        ) : null}

        {enabled("creatorPerformance") ? (
          <ReportPage>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.performance.activeCreators} actieve creators`} title="Creatorprestaties" />
            <CreatorTable rows={liveData.creators.slice(0, 10)} />
            <ReferralSummary data={liveData} />
          </ReportPage>
        ) : null}

        {enabled("audience") ? (
          <ReportPage>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.audience.sampleCount} publieksmetingen`} title="Publiek en bereikskwaliteit" />
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              <Distribution title="Toplanden" rows={liveData.audience.topCountries.map((row) => ({ label: row.code, value: row.share }))} suffix="%" />
              <Distribution title="Leeftijdsgroepen" rows={objectRows(liveData.audience.ageBuckets)} suffix="%" />
              <Distribution title="Genderverdeling" rows={objectRows(liveData.audience.genderSplit)} suffix="%" />
            </div>
          </ReportPage>
        ) : null}

        {enabled("quality") ? (
          <ReportPage>
            <ReportHeading icon={<ShieldCheck className="h-5 w-5" />} kicker="QC en signalen" title="Kwaliteit en compliance" />
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <QualityMetric label="Open signalen" value={liveData.quality.openSignals} />
              <QualityMetric label="Kritieke signalen" value={liveData.quality.criticalSignals} />
              <QualityMetric label="Opgeloste signalen" value={liveData.quality.resolvedSignals} />
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Distribution title="Signaaltypes" rows={objectRows(liveData.quality.signalCounts)} />
              <Distribution title="QC-beslissingen" rows={objectRows(liveData.quality.qcDecisionCounts)} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("nextCampaign") ? (
          <ReportPage>
            <ReportHeading icon={<RefreshCw className="h-5 w-5" />} kicker="Volgende campagne" title="Aanbeveling voor volgende campagne" />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">Learnings</h3>
                <BulletList items={learnings} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">Aanbevelingen</h3>
                <BulletList items={recommendations} />
              </div>
            </div>
          </ReportPage>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function ReportPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("report-print-page mx-auto min-h-[840px] w-full max-w-[820px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm", className)}>
      {children}
    </article>
  );
}

function ReportHeading({ icon, kicker, title }: { icon: React.ReactNode; kicker: string; title: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{kicker}</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-neutral-950">{title}</h2>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">{icon}</div>
    </div>
  );
}

function CoverFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function NumberedItem({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-neutral-200 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{index}</span>
      <p className="text-sm leading-6 text-neutral-700">{text}</p>
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

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-neutral-500">Geen items.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-lg border border-neutral-200 p-4 text-sm leading-6 text-neutral-700">
          {item}
        </li>
      ))}
    </ul>
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

function textAreaToList(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12);
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
