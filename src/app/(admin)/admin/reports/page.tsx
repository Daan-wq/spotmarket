import type { Prisma } from "@prisma/client";
import { serialize } from "@/lib/admin/agency-api";
import {
  getCampaignReportLiveData,
  type CampaignReportLiveData,
} from "@/lib/admin/campaign-reporting";
import {
  mergeEditorialContent,
  normalizeEditorialContent,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
  type CampaignReportEditorialContent,
  type CampaignReportStatusValue,
} from "@/lib/admin/campaign-report-shared";
import { prisma } from "@/lib/prisma";
import {
  CampaignReportStudio,
  type BrandOption,
  type CampaignOption,
  type CampaignReportRecord,
  type ReportFilters,
  type ReportHistoryItem,
  type ReportStudioTab,
} from "./campaign-report-studio";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    reportId?: string;
    campaignId?: string;
    brandId?: string;
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
  }>;
}

const reportInclude = {
  brand: { select: { id: true, name: true, currency: true } },
  campaign: { select: { id: true, name: true } },
} as const;

type ReportWithRelations = Prisma.CampaignReportGetPayload<{ include: typeof reportInclude }>;

export default async function ReportsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusFilter: ReportFilters["status"] = sp.status === "DRAFT" || sp.status === "FINAL" ? sp.status : "ALL";
  const tab: ReportStudioTab = sp.tab === "report" ? "report" : "edit";
  const filters: ReportFilters = {
    brandId: sp.brandId || "",
    campaignId: sp.campaignId || "",
    status: statusFilter,
    q: sp.q || "",
    dateFrom: normalizeDateInput(sp.dateFrom),
    dateTo: normalizeDateInput(sp.dateTo),
    tab,
  };

  const reportWhere = buildReportWhere(filters);

  const [brands, campaigns, reports, selectedReport] = await Promise.all([
    prisma.brand.findMany({
      where: { campaigns: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
      take: 100,
    }),
    prisma.campaign.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        brandId: true,
        startsAt: true,
        deadline: true,
        brand: { select: { id: true, name: true, currency: true } },
      },
      take: 150,
    }),
    prisma.campaignReport.findMany({
      where: reportWhere,
      include: reportInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    sp.reportId
      ? prisma.campaignReport.findUnique({
          where: { id: sp.reportId },
          include: reportInclude,
        })
      : Promise.resolve(null),
  ]);

  const selectedCampaignId = selectedReport?.campaignId || filters.campaignId || campaigns[0]?.id || null;
  const liveData = selectedCampaignId
    ? await getCampaignReportLiveData({
        campaignId: selectedCampaignId,
        periodStart: selectedReport?.periodStart ?? null,
        periodEnd: selectedReport?.periodEnd ?? null,
      })
    : null;

  const initialEditorial = buildInitialEditorial(selectedReport, liveData);

  return (
    <CampaignReportStudio
      brands={serialize(brands) as BrandOption[]}
      campaigns={serialize(campaigns) as unknown as CampaignOption[]}
      reports={reports.map(toHistoryItem)}
      selectedReport={selectedReport ? toReportRecord(selectedReport) : null}
      liveData={liveData ? (serialize(liveData) as CampaignReportLiveData) : null}
      initialEditorial={initialEditorial}
      filters={filters}
    />
  );
}

function buildReportWhere(filters: ReportFilters): Prisma.CampaignReportWhereInput {
  const where: Prisma.CampaignReportWhereInput = {};
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.campaignId) where.campaignId = filters.campaignId;
  if (filters.status !== "ALL") where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { brand: { name: { contains: filters.q, mode: "insensitive" } } },
      { campaign: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    where.updatedAt = {};
    if (filters.dateFrom) where.updatedAt.gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) where.updatedAt.lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  }
  return where;
}

function buildInitialEditorial(
  report: ReportWithRelations | null,
  liveData: CampaignReportLiveData | null,
): CampaignReportEditorial | null {
  if (!report && !liveData) return null;
  if (!report) return liveData?.defaults ?? null;
  const defaultEditorialContent = liveData?.defaults.editorialContent ?? normalizeEditorialContent(null);

  return {
    title: report.title,
    executiveSummary: report.executiveSummary,
    keyTakeaways: normalizeTextList(report.keyTakeaways),
    learnings: normalizeTextList(report.learnings),
    nextCampaignRecommendations: normalizeTextList(report.nextCampaignRecommendations),
    sectionSettings: normalizeSectionSettings(report.sectionSettings),
    editorialContent: mergeEditorialContent(defaultEditorialContent, report.editorialContent),
  };
}

function toHistoryItem(report: ReportWithRelations): ReportHistoryItem {
  const row = serialize(report) as unknown as ReportHistoryItem;
  return {
    ...row,
    status: row.status as CampaignReportStatusValue,
  };
}

function toReportRecord(report: ReportWithRelations): CampaignReportRecord {
  const row = serialize(report) as unknown as CampaignReportRecord;
  return {
    ...row,
    status: row.status as CampaignReportStatusValue,
    keyTakeaways: normalizeTextList(report.keyTakeaways),
    learnings: normalizeTextList(report.learnings),
    nextCampaignRecommendations: normalizeTextList(report.nextCampaignRecommendations),
    sectionSettings: normalizeSectionSettings(report.sectionSettings),
    editorialContent: normalizeEditorialContent(report.editorialContent) as CampaignReportEditorialContent,
  };
}

function normalizeDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}
