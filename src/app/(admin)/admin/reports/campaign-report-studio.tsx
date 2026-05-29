"use client";

import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
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
import { CampaignReportView } from "./campaign-report-view";

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
  tab: ReportStudioTab;
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

export type ReportStudioTab = "edit" | "report";

const SECTION_LABELS: Record<CampaignReportSectionKey, string> = {
  cover: "Cover",
  executiveSummary: "Executive Summary",
  campaignSetup: "Campaign Setup",
  performance: "Performance Overview",
  platformBreakdown: "Platform Breakdown",
  topContent: "Top Content",
  creatorPerformance: "Creator Performance",
  audience: "Audience & Reach Quality",
  quality: "Quality & Compliance",
  nextCampaign: "Next Campaign",
};

const STATUS_TABS: Array<{ label: string; value: ReportFilters["status"] }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Final", value: "FINAL" },
];

export function CampaignReportStudio({
  brands,
  campaigns,
  reports,
  selectedReport,
  liveData,
  initialEditorial,
  filters,
}: CampaignReportStudioProps) {
  const router = useRouter();
  const selectedCampaignId = liveData?.campaign.id ?? selectedReport?.campaignId ?? filters.campaignId ?? campaigns[0]?.id ?? "";
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const baseEditorial = initialEditorial ?? liveData?.defaults ?? createEmptyEditorial(selectedCampaign?.name ?? "Campaign");

  const [title, setTitle] = useState(baseEditorial.title);
  const [executiveSummary, setExecutiveSummary] = useState(baseEditorial.executiveSummary);
  const [keyTakeaways, setKeyTakeaways] = useState(baseEditorial.keyTakeaways);
  const [learnings, setLearnings] = useState(baseEditorial.learnings);
  const [nextCampaignRecommendations, setNextCampaignRecommendations] = useState(baseEditorial.nextCampaignRecommendations);
  const [sectionSettings, setSectionSettings] = useState<CampaignReportSectionSettings>(
    normalizeSectionSettings(baseEditorial.sectionSettings),
  );
  const [periodStart, setPeriodStart] = useState(dateInputValue(selectedReport?.periodStart ?? liveData?.period.start ?? liveData?.campaign.startsAt ?? null));
  const [periodEnd, setPeriodEnd] = useState(dateInputValue(selectedReport?.periodEnd ?? liveData?.period.end ?? liveData?.campaign.deadline ?? null));
  const [savingMode, setSavingMode] = useState<"draft" | "final" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportStudioTab>(filters.tab);
  const [printWhenReportTabIsReady, setPrintWhenReportTabIsReady] = useState(false);

  useEffect(() => {
    const next = initialEditorial ?? liveData?.defaults ?? createEmptyEditorial(selectedCampaign?.name ?? "Campaign");
    setTitle(next.title);
    setExecutiveSummary(next.executiveSummary);
    setKeyTakeaways(normalizeTextList(next.keyTakeaways));
    setLearnings(normalizeTextList(next.learnings));
    setNextCampaignRecommendations(normalizeTextList(next.nextCampaignRecommendations));
    setSectionSettings(normalizeSectionSettings(next.sectionSettings));
    setPeriodStart(dateInputValue(selectedReport?.periodStart ?? liveData?.period.start ?? liveData?.campaign.startsAt ?? null));
    setPeriodEnd(dateInputValue(selectedReport?.periodEnd ?? liveData?.period.end ?? liveData?.campaign.deadline ?? null));
    setNotice(null);
  }, [initialEditorial, liveData?.campaign.id, selectedCampaign?.name, selectedReport?.id, selectedReport?.periodEnd, selectedReport?.periodStart]);

  useEffect(() => {
    setActiveTab(filters.tab);
  }, [filters.tab]);

  useEffect(() => {
    if (!printWhenReportTabIsReady || activeTab !== "report") return;
    const timeout = window.setTimeout(() => {
      window.print();
      setPrintWhenReportTabIsReady(false);
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [activeTab, printWhenReportTabIsReady]);

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
    const nextReportId = overrides.reportId !== undefined ? overrides.reportId : selectedReport?.id ?? null;
    const nextCampaignId = overrides.campaignId !== undefined ? overrides.campaignId : next.campaignId || selectedCampaignId;
    if (nextReportId) params.set("reportId", nextReportId);
    if (nextCampaignId) params.set("campaignId", nextCampaignId);
    if (next.brandId) params.set("brandId", next.brandId);
    if (next.status !== "ALL") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.dateFrom) params.set("dateFrom", next.dateFrom);
    if (next.dateTo) params.set("dateTo", next.dateTo);
    if (next.tab !== "edit") params.set("tab", next.tab);
    const query = params.toString();
    return query ? `/admin/reports?${query}` : "/admin/reports";
  }

  function switchTab(tab: ReportStudioTab) {
    setActiveTab(tab);
    router.replace(buildHref({ tab }), { scroll: false });
  }

  function printReport() {
    if (activeTab === "report") {
      window.print();
      return;
    }
    setPrintWhenReportTabIsReady(true);
    switchTab("report");
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

    setNotice(nextStatus === "FINAL" ? "Final report opgeslagen." : "Draft opgeslagen.");
    if (!selectedReport && payload.report?.id) {
      router.replace(buildHref({ reportId: payload.report.id, campaignId: liveData.campaign.id, tab: activeTab }));
    }
    router.refresh();
  }

  function selectCampaign(campaignId: string) {
    router.push(buildHref({ campaignId, reportId: null, tab: "edit" }));
  }

  return (
    <div className="report-studio-shell space-y-5">
      <header className="report-studio-chrome flex flex-col gap-4 border-b border-neutral-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Admin Reports</p>
          <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-neutral-950">Campaign Report Studio</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <Badge variant={selectedReport?.status === "FINAL" ? "verified" : "pending"}>
              {selectedReport?.status ? titleCaseEnum(selectedReport.status) : "Unsaved draft"}
            </Badge>
            {selectedReport ? <span>Updated {formatDate(selectedReport.updatedAt, "nl")}</span> : null}
            {notice ? <span className="font-medium text-neutral-700">{notice}</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="min-w-[260px]">
            <span className="sr-only">Campaign</span>
            <select
              value={selectedCampaignId}
              onChange={(event) => selectCampaign(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none focus:border-neutral-400"
            >
              {campaigns.length === 0 ? <option value="">No campaigns</option> : null}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.brand?.name ? `${campaign.brand.name} - ` : ""}
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push(buildHref({ campaignId: selectedCampaignId, reportId: null, tab: "edit" }))}>
            <Plus className="h-4 w-4" />
            New
          </Button>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => saveReport("DRAFT")} isPending={savingMode === "draft"} disabled={!liveData}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button type="button" className="rounded-lg" onClick={() => saveReport("FINAL")} isPending={savingMode === "final"} disabled={!liveData}>
            <CheckCircle2 className="h-4 w-4" />
            Save final
          </Button>
          <Button type="button" variant="ghost" className="rounded-lg" onClick={printReport} disabled={!liveData}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      <div className="report-studio-chrome flex items-center justify-between gap-3">
        <Tabs
          items={[
            { key: "edit", label: "Edit" },
            { key: "report", label: "Full report" },
          ]}
          value={activeTab}
          onChange={(key) => switchTab(key as ReportStudioTab)}
          size="md"
        />
      </div>

      {activeTab === "edit" ? (
        <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,46rem)]">
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
        </div>
      ) : (
        <main className="min-w-0">
          <CampaignReportView
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
            widthMode="full"
          />
        </main>
      )}
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
          <h2 className="text-sm font-semibold text-neutral-950">Report history</h2>
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
            placeholder="Search"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </label>

        <select name="brandId" defaultValue={filters.brandId} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <select name="campaignId" defaultValue={filters.campaignId} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        <input type="hidden" name="status" value={filters.status === "ALL" ? "" : filters.status} />
        <input type="hidden" name="tab" value={filters.tab} />
        <div className="grid grid-cols-2 gap-2">
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
          <input name="dateTo" type="date" defaultValue={filters.dateTo} className="h-10 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-neutral-400" />
        </div>
        <Button type="submit" variant="outline" size="sm" className="w-full rounded-lg">
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
      </form>

      <div className="space-y-2">
        {reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-8 text-center">
            <p className="text-sm font-medium text-neutral-950">Geen rapporten</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Nieuwe drafts verschijnen hier na opslaan.</p>
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
                <Badge variant={report.status === "FINAL" ? "verified" : "pending"}>{titleCaseEnum(report.status)}</Badge>
              </div>
              <p className="mt-2 text-xs text-neutral-500">{report.brand?.name ?? "No brand"} / {report.campaign?.name ?? "Campaign"}</p>
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
          <p className="mt-1 text-xs text-neutral-500">{liveData ? liveData.campaign.brandName : "No campaign selected"}</p>
        </div>
        <Sparkles className="h-4 w-4 text-neutral-400" />
      </div>

      <Field label="Title">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="report-input h-10" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Period start">
          <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="report-input h-10" />
        </Field>
        <Field label="Period end">
          <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="report-input h-10" />
        </Field>
      </div>

      <Field label="Executive summary">
        <textarea value={executiveSummary} onChange={(event) => setExecutiveSummary(event.target.value)} rows={7} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Key takeaways">
        <textarea value={keyTakeaways.join("\n")} onChange={(event) => setKeyTakeaways(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Learnings">
        <textarea value={learnings.join("\n")} onChange={(event) => setLearnings(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <Field label="Next campaign recommendations">
        <textarea value={nextCampaignRecommendations.join("\n")} onChange={(event) => setNextCampaignRecommendations(textAreaToList(event.target.value))} rows={5} className="report-input resize-y leading-6" />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Sections</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function createEmptyEditorial(campaignName: string): CampaignReportEditorial {
  return {
    title: `${campaignName} Campaign Report`,
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
