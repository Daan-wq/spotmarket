"use client";

import {
  BarChart3,
  CalendarDays,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import type { CampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  type CampaignReportSectionKey,
  type CampaignReportSectionSettings,
  type CampaignReportStatusValue,
} from "@/lib/admin/campaign-report-shared";
import { cn } from "@/lib/cn";

export interface CampaignReportViewProps {
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
  widthMode?: "page" | "full";
}

export function CampaignReportView({
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
  widthMode = "page",
}: CampaignReportViewProps) {
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
    { label: "Approved views", value: formatNumber(liveData.performance.approvedViews, "nl"), detail: percentOrDash(liveData.performance.goalCompletion, "of goal") },
    { label: "Budget used", value: formatCurrency(liveData.performance.budgetUsed, "EUR", "nl"), detail: percentOrDash(liveData.performance.budgetUsedPercent, "burn") },
    { label: "Approved clips", value: formatNumber(liveData.performance.approvedClips, "nl"), detail: `${formatNumber(liveData.performance.totalSubmissions, "nl")} submissions` },
    { label: "CPM", value: liveData.performance.costPerThousandViews == null ? "-" : formatCurrency(liveData.performance.costPerThousandViews, "EUR", "nl"), detail: "eligible views" },
  ];

  return (
    <div className="report-print-root">
      <div className="report-print-scroll space-y-5 overflow-hidden">
        {enabled("cover") ? (
          <ReportPage widthMode={widthMode} className="flex flex-col justify-between bg-neutral-950 text-white">
            <div>
              <div className="flex items-center justify-between gap-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">Campaign report</p>
                <Badge variant={status === "FINAL" ? "verified" : "pending"}>{titleCaseEnum(status)}</Badge>
              </div>
              <h2 className={cn("mt-20 text-5xl font-semibold leading-tight tracking-normal", widthMode === "full" ? "max-w-5xl" : "max-w-2xl")}>{title}</h2>
            </div>
            <div className="grid gap-6 border-t border-white/20 pt-8 md:grid-cols-3">
              <CoverFact label="Brand" value={liveData.campaign.brandName} />
              <CoverFact label="Campaign" value={liveData.campaign.name} />
              <CoverFact label="Period" value={reportPeriod} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("executiveSummary") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<FileText className="h-5 w-5" />} kicker={liveData.campaign.brandName} title="Executive Summary" />
            <p className={cn("mt-6 text-lg leading-8 text-neutral-700", widthMode === "full" ? "max-w-5xl" : "max-w-3xl")}>{executiveSummary}</p>
            <div className={cn("mt-8 grid gap-3", widthMode === "full" ? "lg:grid-cols-3" : "md:grid-cols-2")}>
              {keyTakeaways.map((takeaway, index) => (
                <NumberedItem key={`${takeaway}-${index}`} index={index + 1} text={takeaway} />
              ))}
            </div>
          </ReportPage>
        ) : null}

        {enabled("campaignSetup") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<CalendarDays className="h-5 w-5" />} kicker={reportPeriod} title="Campaign Setup" />
            <div className={cn("mt-7 grid gap-4", widthMode === "full" ? "md:grid-cols-3" : "md:grid-cols-2")}>
              <SetupRow label="Platforms" value={liveData.campaign.platforms.join(", ") || "-"} />
              <SetupRow label="Goal views" value={liveData.campaign.goalViews ? formatNumber(liveData.campaign.goalViews, "nl") : "-"} />
              <SetupRow label="Budget" value={formatCurrency(liveData.campaign.totalBudget, "EUR", "nl")} />
              <SetupRow label="Business CPV" value={formatCurrency(liveData.campaign.businessCpv, "EUR", "nl")} />
              <SetupRow label="Min followers" value={formatNumber(liveData.campaign.target.minFollowers, "nl")} />
              <SetupRow label="Target country" value={liveData.campaign.target.country ?? "-"} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <TextBlock title="Requirements" text={liveData.campaign.requirements || "-"} />
              <TextBlock title="Content guidelines" text={liveData.campaign.contentGuidelines || "-"} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {liveData.campaign.requiredHashtags.length > 0
                ? liveData.campaign.requiredHashtags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">{tag}</span>)
                : <span className="text-sm text-neutral-500">No required hashtags</span>}
            </div>
          </ReportPage>
        ) : null}

        {enabled("performance") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Live dashboard data" title="Performance Overview" />
            <div className="mt-7 grid gap-3 md:grid-cols-4">
              {metricCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-neutral-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">{card.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{card.detail}</p>
                </div>
              ))}
            </div>
            <TimelineChart rows={liveData.timeline} />
            <StatusGrid statusCounts={liveData.performance.statusCounts} />
          </ReportPage>
        ) : null}

        {enabled("platformBreakdown") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Channel delivery" title="Platform Breakdown" />
            <div className="mt-7 space-y-3">
              {liveData.platformBreakdown.length === 0 ? <EmptyPreviewLine text="No approved platform data yet." /> : null}
              <BreakdownRows rows={liveData.platformBreakdown} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("topContent") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Best clips" title="Top Content" />
            <TopContentTable rows={liveData.topContent.slice(0, 8)} />
          </ReportPage>
        ) : null}

        {enabled("creatorPerformance") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.performance.activeCreators} active creators`} title="Creator Performance" />
            <CreatorTable rows={liveData.creators.slice(0, 10)} />
            <ReferralSummary data={liveData} />
          </ReportPage>
        ) : null}

        {enabled("audience") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.audience.sampleCount} audience samples`} title="Audience & Reach Quality" />
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              <Distribution title="Top countries" rows={liveData.audience.topCountries.map((row) => ({ label: row.code, value: row.share }))} suffix="%" />
              <Distribution title="Age buckets" rows={objectRows(liveData.audience.ageBuckets)} suffix="%" />
              <Distribution title="Gender split" rows={objectRows(liveData.audience.genderSplit)} suffix="%" />
            </div>
          </ReportPage>
        ) : null}

        {enabled("quality") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<ShieldCheck className="h-5 w-5" />} kicker="QC and signals" title="Quality & Compliance" />
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <QualityMetric label="Open signals" value={liveData.quality.openSignals} />
              <QualityMetric label="Critical signals" value={liveData.quality.criticalSignals} />
              <QualityMetric label="Resolved signals" value={liveData.quality.resolvedSignals} />
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Distribution title="Signal types" rows={objectRows(liveData.quality.signalCounts)} />
              <Distribution title="QC decisions" rows={objectRows(liveData.quality.qcDecisionCounts)} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("nextCampaign") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<RefreshCw className="h-5 w-5" />} kicker="Next campaign" title="Next Campaign Recommendation" />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">Learnings</h3>
                <BulletList items={learnings} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">Recommendations</h3>
                <BulletList items={recommendations} />
              </div>
            </div>
          </ReportPage>
        ) : null}
      </div>
    </div>
  );
}

function ReportPage({
  children,
  className,
  widthMode,
}: {
  children: React.ReactNode;
  className?: string;
  widthMode: "page" | "full";
}) {
  return (
    <article
      className={cn(
        "report-print-page w-full rounded-lg border border-neutral-200 bg-white shadow-sm",
        widthMode === "full" ? "max-w-none p-8 xl:p-10" : "mx-auto max-w-[820px] p-8",
        widthMode === "full" ? "min-h-[620px]" : "min-h-[840px]",
        className,
      )}
    >
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
        <h3 className="text-sm font-semibold text-neutral-950">Daily view growth</h3>
        <p className="text-xs text-neutral-500">{visible.length} days</p>
      </div>
      {visible.length === 0 ? (
        <EmptyPreviewLine text="No metric snapshots in this period." />
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{titleCaseEnum(row.label)}</p>
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
              <p className="mt-1 text-xs text-neutral-500">{row.clips} clips / {formatNumber(row.engagement, "nl")} engagements</p>
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
  if (rows.length === 0) return <EmptyPreviewLine text="No submitted content yet." />;
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
  if (rows.length === 0) return <EmptyPreviewLine text="No creator performance data yet." />;
  return (
    <div className="mt-7 overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Creator</th>
            <th className="px-4 py-3 text-right font-semibold">Clips</th>
            <th className="px-4 py-3 text-right font-semibold">Views</th>
            <th className="px-4 py-3 text-right font-semibold">Earned</th>
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
      <SetupRow label="Referral clicks" value={formatNumber(data.referral.totalClicks, "nl")} />
      <SetupRow label="Invites" value={formatNumber(data.referral.inviteCount, "nl")} />
      <SetupRow label="Active clippers" value={formatNumber(data.referral.activeClipperCount, "nl")} />
      <SetupRow label="Activation" value={formatPercent(data.referral.activationRate)} />
    </div>
  );
}

function Distribution({ title, rows, suffix = "" }: { title: string; rows: Array<{ label: string; value: number }>; suffix?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-neutral-500">No data</p> : null}
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-700">{titleCaseEnum(row.label)}</span>
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
  if (items.length === 0) return <p className="mt-3 text-sm text-neutral-500">No entries.</p>;
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

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "-";
  if (!start) return `Until ${formatDate(end, "nl")}`;
  if (!end) return `From ${formatDate(start, "nl")}`;
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

function objectRows(record: Record<string, number>) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}
