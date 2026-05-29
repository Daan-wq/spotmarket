"use client";

import {
  BarChart3,
  CalendarDays,
  DollarSign,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import type { CampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  type CampaignReportEditorialContent,
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
  editorialContent: CampaignReportEditorialContent;
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
  editorialContent,
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
  const topPlatform = liveData.platformBreakdown[0];
  const topClip = liveData.topContent[0];
  const keyLearningItems = editorialContent.keyLearnings.length > 0 ? editorialContent.keyLearnings : learnings;
  const nextCampaignPlan = editorialContent.nextCampaignPlan.length > 0
    ? editorialContent.nextCampaignPlan
    : recommendations;
  const summaryCards = [
    { label: "Goedgekeurde views", value: formatNumber(liveData.performance.approvedViews, "nl"), detail: percentOrDash(liveData.performance.goalCompletion, "van doel") },
    { label: "Doelvoortgang", value: percentOrDash(liveData.performance.goalCompletion), detail: liveData.performance.pacingStatus },
    { label: "Budget gebruikt", value: formatCurrency(liveData.performance.budgetUsed, "EUR", "nl"), detail: percentOrDash(liveData.performance.budgetUsedPercent, "verbruikt") },
    { label: "Effectieve CPV", value: formatCpv(liveData.financial.effectiveCpv), detail: "goedgekeurde prestatie" },
    { label: "Goedgekeurde clips", value: formatNumber(liveData.performance.approvedClips, "nl"), detail: `${formatNumber(liveData.performance.totalSubmissions, "nl")} inzendingen` },
    { label: "Actieve creators", value: formatNumber(liveData.performance.activeCreators, "nl"), detail: "campagnebijdragers" },
    { label: "Topplatform", value: topPlatform?.platform ?? "-", detail: topPlatform ? `${formatNumber(topPlatform.views, "nl")} views` : "onvoldoende data" },
    { label: "Traffickwaliteit", value: liveData.quality.trafficQualityStatus, detail: "geldige views gecontroleerd" },
  ];

  return (
    <div className="report-print-root">
      <div className="report-print-scroll space-y-5 overflow-hidden">
        {enabled("cover") ? (
          <ReportPage widthMode={widthMode} className="flex flex-col justify-between bg-neutral-950 text-white">
            <div>
              <div className="flex items-center justify-between gap-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">Campagnerapport</p>
                <Badge variant={status === "FINAL" ? "verified" : "pending"}>{titleCaseEnum(status)}</Badge>
              </div>
              <h2 className={cn("mt-20 text-5xl font-semibold leading-tight tracking-normal", widthMode === "full" ? "max-w-5xl" : "max-w-2xl")}>{title}</h2>
            </div>
            <div className="grid gap-6 border-t border-white/20 pt-8 md:grid-cols-4">
              <CoverFact label="Merk" value={liveData.campaign.brandName} />
              <CoverFact label="Campagne" value={liveData.campaign.name} />
              <CoverFact label="Periode" value={reportPeriod} />
              <CoverFact label="Type" value={editorialContent.campaignType || liveData.campaign.contentType || "Awareness"} />
            </div>
          </ReportPage>
        ) : null}

        {enabled("executiveSummary") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<FileText className="h-5 w-5" />} kicker={liveData.campaign.brandName} title="Samenvatting" />
            <p className={cn("mt-6 text-lg leading-8 text-neutral-700", widthMode === "full" ? "max-w-5xl" : "max-w-3xl")}>{executiveSummary}</p>
            <div className={cn("mt-8 grid gap-3", widthMode === "full" ? "lg:grid-cols-4" : "md:grid-cols-2")}>
              {summaryCards.map((card) => <MetricCard key={card.label} {...card} />)}
            </div>
            {topClip ? (
              <div className="mt-6 rounded-lg border border-neutral-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Best presterende clip</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {topClip.platform}-clip van {topClip.creator} leverde {formatNumber(topClip.views, "nl")} goedgekeurde views. {editorialContent.topContentNotes[topClip.id] ?? "Gebruik de hook, pacing en productintegratie als referentie voor de volgende ronde."}
                </p>
              </div>
            ) : null}
            <NumberedGrid items={keyTakeaways} widthMode={widthMode} />
          </ReportPage>
        ) : null}

        {enabled("campaignSetup") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<CalendarDays className="h-5 w-5" />} kicker={reportPeriod} title="Campagne-inrichting" />
            <div className={cn("mt-7 grid gap-4", widthMode === "full" ? "md:grid-cols-4" : "md:grid-cols-2")}>
              <SetupRow label="Campagnetype" value={editorialContent.campaignType || liveData.campaign.contentType || "Awareness"} />
              <SetupRow label="Platforms" value={liveData.campaign.platforms.join(", ") || "-"} />
              <SetupRow label="Doelviews" value={liveData.campaign.goalViews ? formatNumber(liveData.campaign.goalViews, "nl") : "-"} />
              <SetupRow label="Budget" value={formatCurrency(liveData.campaign.totalBudget, "EUR", "nl")} />
              <SetupRow label="Doelland" value={liveData.campaign.target.country ?? "-"} />
              <SetupRow label="Creatorcriteria" value={`${formatNumber(liveData.campaign.target.minFollowers, "nl")} min. volgers`} />
              <SetupRow label="Uitbetalingsregels" value={`${formatNumber(liveData.campaign.minimumPaidViews, "nl")} - ${liveData.campaign.maximumPaidViews ? formatNumber(liveData.campaign.maximumPaidViews, "nl") : "zonder limiet"} betaalde views`} />
              <SetupRow label="Goedkeuringsregels" value="Alleen goedgekeurde prestaties" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <TextBlock title="Contentvereisten" text={liveData.campaign.requirements || "-"} />
              <TextBlock title="CTA / richtlijnen" text={liveData.campaign.contentGuidelines || "-"} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {liveData.campaign.requiredHashtags.length > 0
                ? liveData.campaign.requiredHashtags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">{tag}</span>)
                : <span className="text-sm text-neutral-500">Geen verplichte hashtags</span>}
            </div>
            <InsightNote text="Goedgekeurde views voldoen aan de campagnevereisten en komen door de kwaliteitscontrole voordat ze meetellen in rapportage of uitbetaling." />
          </ReportPage>
        ) : null}

        {enabled("performance") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<BarChart3 className="h-5 w-5" />} kicker="Businessresultaat" title="Prestatieoverzicht" />
            <div className={cn("mt-7 grid gap-3", widthMode === "full" ? "md:grid-cols-4" : "md:grid-cols-2")}>
              <MetricCard label="Goedgekeurde views" value={formatNumber(liveData.performance.approvedViews, "nl")} detail={percentOrDash(liveData.performance.goalCompletion, "van doel")} />
              <MetricCard label="Pacingstatus" value={liveData.performance.pacingStatus} detail="doelvoortgang vs verstreken tijd" />
              <MetricCard label="Goedgekeurde clips" value={formatNumber(liveData.performance.approvedClips, "nl")} detail={percentOrDash(liveData.performance.approvalRate, "goedkeuringspercentage")} />
              <MetricCard label="Engagement" value={formatNumber(liveData.platformBreakdown.reduce((sum, row) => sum + row.engagement, 0), "nl")} detail="likes, comments en shares" />
            </div>
            <TimelineChart rows={liveData.timeline} />
            <StatusGrid statusCounts={liveData.performance.statusCounts} />
            <InsightNote text={topPlatform ? `${topPlatform.platform} leverde de grootste schaal. Gebruik het prestatieoverzicht voor het totale resultaat en platformprestaties voor budgetkeuzes.` : "Er is meer goedgekeurde delivery nodig voordat er een sterke kanaalconclusie mogelijk is."} />
          </ReportPage>
        ) : null}

        {enabled("financialOverview") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<DollarSign className="h-5 w-5" />} kicker="Budgetefficientie" title="Financieel overzicht" />
            <div className={cn("mt-7 grid gap-3", widthMode === "full" ? "md:grid-cols-4" : "md:grid-cols-2")}>
              <MetricCard label="Totaalbudget" value={formatCurrency(liveData.financial.totalBudget, "EUR", "nl")} detail="campagneallocatie" />
              <MetricCard label="Budget gebruikt" value={formatCurrency(liveData.financial.budgetUsed, "EUR", "nl")} detail={percentOrDash(liveData.performance.budgetUsedPercent, "gebruikt")} />
              <MetricCard label="Resterend budget" value={formatCurrency(liveData.financial.budgetRemaining, "EUR", "nl")} detail="beschikbaar na goedgekeurde delivery" />
              <MetricCard label="Effectieve CPV" value={formatCpv(liveData.financial.effectiveCpv)} detail="goedgekeurde betaalbare views" />
              <MetricCard label="Kosten per clip" value={formatNullableCurrency(liveData.financial.costPerApprovedClip)} detail="goedgekeurde clips" />
              <MetricCard label="Kosten per actieve creator" value={formatNullableCurrency(liveData.financial.costPerActiveCreator)} detail="actieve creatorbasis" />
              <MetricCard label="Betaalbare views" value={formatNumber(liveData.financial.approvedPayableViews, "nl")} detail="geldige goedgekeurde views" />
              <MetricCard label="Forecast views" value={liveData.financial.forecastApprovedViews == null ? "-" : formatNumber(liveData.financial.forecastApprovedViews, "nl")} detail="lineaire voortzetting" />
            </div>
            <InsightNote text={editorialContent.financialNote || liveData.financial.unusedBudgetExplanation} />
          </ReportPage>
        ) : null}

        {enabled("platformBreakdown") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Target className="h-5 w-5" />} kicker="Kanaaldelivery" title="Platformprestaties" />
            <PlatformPerformance rows={liveData.platformBreakdown} recommendations={editorialContent.platformRecommendations} />
            <InsightNote text={topPlatform ? `${topPlatform.platform} is momenteel het sterkste schaalkanaal. Vergelijk CPV en engagementpercentage voordat je de volgende budgetsplit verschuift.` : "Er is nog niet genoeg goedgekeurde platformdata om een budgetverschuiving aan te bevelen."} />
          </ReportPage>
        ) : null}

        {enabled("topContent") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Beste clips" title="Topcontent" />
            <TopContentTable rows={liveData.topContent.slice(0, 8)} notes={editorialContent.topContentNotes} />
            <InsightNote text={topClip ? "De sterkste clip moet de creatieve referentie worden voor hook, onderwerp, CTA en editingstijl in de volgende campagnebrief." : "Topcontent-learnings worden concreet zodra er goedgekeurde clips beschikbaar zijn."} />
          </ReportPage>
        ) : null}

        {enabled("contentInsights") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Zap className="h-5 w-5" />} kicker="Waarom het werkte" title="Contentinzichten" />
            <BulletList items={editorialContent.contentInsights} />
            <InsightNote text="Deze sectie vertaalt topclips naar herhaalbare creatieve patronen, zodat de volgende campagne start met scherpere hooks, formats en creatorinstructies." />
          </ReportPage>
        ) : null}

        {enabled("creatorPerformance") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.performance.activeCreators} actieve creators`} title="Creatorprestaties" />
            <CreatorTable rows={liveData.creators.slice(0, 10)} />
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-950">Aanbevolen creatorpool</h3>
              <BulletList items={editorialContent.creatorRecommendations} />
            </div>
            <InsightNote text="Gebruik deze verdeling om te bepalen wie je opnieuw activeert, niet alleen wie de grootste losse clip maakte." />
          </ReportPage>
        ) : null}

        {enabled("audience") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker={`${liveData.audience.sampleCount} publieksmetingen`} title="Publiek en bereikskwaliteit" />
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              <Distribution title="Toplanden" rows={liveData.audience.topCountries.map((row) => ({ label: row.code, value: row.share }))} suffix="%" />
              <Distribution title="Leeftijdsgroepen" rows={objectRows(liveData.audience.ageBuckets)} suffix="%" />
              <Distribution title="Genderverdeling" rows={objectRows(liveData.audience.genderSplit)} suffix="%" />
            </div>
            <InsightNote text={`Publieksfit: ${liveData.audience.fitStatus}. Beschikbare data verschilt per platform, dus lees deze sectie als richtinggevende bereikskwaliteit.`} />
          </ReportPage>
        ) : null}

        {enabled("communityActivation") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Users className="h-5 w-5" />} kicker="Communitygroei" title="Communityactivatie" />
            <CommunityActivation data={liveData} />
            <InsightNote text="Communityactivatie is het meest nuttig wanneer creatorwerving of referraldistributie een expliciet campagnedoel is." />
          </ReportPage>
        ) : null}

        {enabled("quality") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<ShieldCheck className="h-5 w-5" />} kicker="Goedgekeurde prestaties" title="Kwaliteit en compliance" />
            <div className={cn("mt-7 grid gap-3", widthMode === "full" ? "md:grid-cols-4" : "md:grid-cols-2")}>
              <MetricCard label="Traffickwaliteit" value={liveData.quality.trafficQualityStatus} detail="gecontroleerd voor rapportage" />
              <MetricCard label="Goedgekeurde clips" value={formatNumber(liveData.performance.approvedClips, "nl")} detail="opgenomen in rapportage" />
              <MetricCard label="Uitgesloten clips" value={formatNumber(liveData.quality.excludedClips, "nl")} detail="tellen niet mee in goedgekeurde views" />
              <MetricCard label="Uitgesloten views" value={formatNumber(liveData.quality.excludedViews, "nl")} detail="niet-kwalificerende activiteit" />
            </div>
            <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
              {editorialContent.qualityNote || liveData.quality.clientSummary}
            </p>
            <InsightNote text="Alleen goedgekeurde prestaties tellen mee in campagneresultaten, uitbetalingsberekeningen en klanttotalen." />
          </ReportPage>
        ) : null}

        {enabled("keyLearnings") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<Sparkles className="h-5 w-5" />} kicker="Campagnestrategie" title="Belangrijkste learnings" />
            <BulletList items={keyLearningItems} />
            <InsightNote text="Neem deze learnings mee in de volgende creatorbrief, zodat optimalisatie voor de eerste inzending plaatsvindt en niet pas na het rapport." />
          </ReportPage>
        ) : null}

        {enabled("nextCampaign") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<RefreshCw className="h-5 w-5" />} kicker="Volgende campagne" title="Aanbevelingen voor volgende campagne" />
            <BulletList items={nextCampaignPlan} />
            <InsightNote text="De volgende campagne moet het sterkste platform, de creatorpool en contentpatronen vertalen naar een strakkere launchbrief." />
          </ReportPage>
        ) : null}

        {enabled("appendix") ? (
          <ReportPage widthMode={widthMode}>
            <ReportHeading icon={<FileText className="h-5 w-5" />} kicker="Onderbouwing" title="Appendix / ruwe data" />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <Distribution title="Inzendstatussen" rows={objectRows(liveData.performance.statusCounts)} />
              <Distribution title="Kwaliteitsbeslissingen" rows={objectRows(liveData.quality.qcDecisionCounts)} />
            </div>
            <InsightNote text={editorialContent.appendixNote || `Gegenereerd op ${formatDate(liveData.generatedAt, "nl")}. Appendixdata onderbouwt de hoofdconclusies en is optioneel voor klantlevering.`} />
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

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function NumberedGrid({ items, widthMode }: { items: string[]; widthMode: "page" | "full" }) {
  if (items.length === 0) return null;
  return (
    <div className={cn("mt-6 grid gap-3", widthMode === "full" ? "lg:grid-cols-3" : "md:grid-cols-2")}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-neutral-200 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{index + 1}</span>
          <p className="text-sm leading-6 text-neutral-700">{item}</p>
        </div>
      ))}
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

function InsightNote({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium leading-6 text-neutral-700">
      {text}
    </p>
  );
}

function TimelineChart({ rows }: { rows: CampaignReportLiveData["timeline"] }) {
  const visible = rows.slice(-14);
  const max = Math.max(1, ...visible.map((row) => row.views));
  return (
    <div className="mt-8 rounded-lg border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-950">Views door de tijd</h3>
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
    <div className="mt-6 grid gap-3 md:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{titleCaseEnum(row.label)}</p>
          <p className="mt-1 text-xl font-semibold text-neutral-950">{formatNumber(row.value, "nl")}</p>
        </div>
      ))}
    </div>
  );
}

function PlatformPerformance({
  rows,
  recommendations,
}: {
  rows: CampaignReportLiveData["platformBreakdown"];
  recommendations: Record<string, string>;
}) {
  if (rows.length === 0) return <EmptyPreviewLine text="Nog geen goedgekeurde platformdata." />;
  return (
    <div className="mt-7 space-y-3">
      {rows.map((row) => (
        <div key={row.platform} className="rounded-lg border border-neutral-200 p-4">
          <div className="grid gap-4 md:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
            <div>
              <h3 className="text-sm font-semibold text-neutral-950">{row.platform}</h3>
              <p className="mt-1 text-xs text-neutral-500">{recommendations[row.platform] || "Aanbeveling kan in de rapportstudio worden bewerkt."}</p>
            </div>
            <MiniStat label="Views" value={formatNumber(row.views, "nl")} />
            <MiniStat label="Clips" value={formatNumber(row.clips, "nl")} />
            <MiniStat label="Gem. views" value={formatNumber(row.averageViewsPerClip, "nl")} />
            <MiniStat label="CPV" value={formatCpv(row.effectiveCpv)} />
            <MiniStat label="Eng. %" value={formatPercent(row.engagementRate)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function TopContentTable({
  rows,
  notes,
}: {
  rows: CampaignReportLiveData["topContent"];
  notes: Record<string, string>;
}) {
  if (rows.length === 0) return <EmptyPreviewLine text="Nog geen ingezonden content." />;
  return (
    <div className="mt-7 overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Clip</th>
            <th className="px-4 py-3 font-semibold">Creator</th>
            <th className="px-4 py-3 text-right font-semibold">Goedgekeurde views</th>
            <th className="px-4 py-3 text-right font-semibold">Engagement</th>
            <th className="px-4 py-3 font-semibold">Belangrijkste learning</th>
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
              <td className="max-w-[22rem] px-4 py-3 text-neutral-600">{notes[row.id] || "Voeg een hook-, format-, CTA- of editingstijl-learning toe."}</td>
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
            <th className="px-4 py-3 text-right font-semibold">Inzendingen</th>
            <th className="px-4 py-3 text-right font-semibold">Goedgekeurde views</th>
            <th className="px-4 py-3 text-right font-semibold">Gem. views</th>
            <th className="px-4 py-3 text-right font-semibold">Goedkeuringspercentage</th>
            <th className="px-4 py-3 font-semibold">Fit volgende campagne</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.creatorId}>
              <td className="px-4 py-3 font-medium text-neutral-950">{row.creator}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{formatNumber(row.submissions, "nl")}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-950">{formatNumber(row.views, "nl")}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{row.averageViewsPerApprovedClip == null ? "-" : formatNumber(row.averageViewsPerApprovedClip, "nl")}</td>
              <td className="px-4 py-3 text-right text-neutral-600">{formatPercent(row.approvalRate)}</td>
              <td className="px-4 py-3 text-neutral-600">{row.reliabilityStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommunityActivation({ data }: { data: CampaignReportLiveData }) {
  return (
    <div className="mt-7 grid gap-3 md:grid-cols-4">
      <MetricCard label="Clicks" value={formatNumber(data.referral.totalClicks, "nl")} detail="campagne-referralbezoeken" />
      <MetricCard label="Invites" value={formatNumber(data.referral.inviteCount, "nl")} detail="getrackte aanmeldingen" />
      <MetricCard label="Actieve clippers" value={formatNumber(data.referral.activeClipperCount, "nl")} detail="dienden campagnecontent in" />
      <MetricCard label="Activatiepercentage" value={formatPercent(data.referral.activationRate)} detail="actief vanuit invites" />
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

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-neutral-500">Geen items.</p>;
  return (
    <ul className="mt-7 grid gap-3 md:grid-cols-2">
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
  if (!start) return `Tot ${formatDate(end, "nl")}`;
  if (!end) return `Vanaf ${formatDate(start, "nl")}`;
  return `${formatDate(start, "nl")} - ${formatDate(end, "nl")}`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function percentOrDash(value: number | null | undefined, label?: string) {
  if (value == null) return "-";
  return label ? `${formatPercent(value)} ${label}` : formatPercent(value);
}

function formatCpv(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNullableCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return formatCurrency(value, "EUR", "nl");
}

function objectRows(record: Record<string, number>) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}
