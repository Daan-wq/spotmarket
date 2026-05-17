import { getLocale, getTranslations } from "next-intl/server";
import { DimensionalBreakdown } from "@/components/stats/DimensionalBreakdown";
import { FbReactionsChart } from "@/components/stats/FbReactionsChart";
import { RetentionCurveChart } from "@/components/stats/RetentionCurveChart";
import { StoryReelCorrelationTable } from "@/components/stats/StoryReelCorrelationTable";
import { StoriesActivityFeed } from "@/components/stats/StoriesActivityFeed";
import type { ContentRow } from "@/lib/stats/content";
import type { Locale } from "@/i18n/routing";
import { formatShortDate } from "@/lib/i18n-format";
import type { PlatformSlug } from "@/lib/stats/types";
import type { YtBreakdownPoint, FbReactionPoint, RetentionPoint } from "@/lib/stats/trends";

interface YtPayload {
  trafficSourceBreakdown: YtBreakdownPoint[];
  playbackLocationBreakdown: YtBreakdownPoint[];
  deviceTypeBreakdown: YtBreakdownPoint[];
  contentTypeBreakdown: YtBreakdownPoint[];
  subscribedStatusBreakdown: YtBreakdownPoint[];
}

interface FbPayload {
  reactions: FbReactionPoint[];
  retention: RetentionPoint[];
}

interface IgPayload {
  stories: Parameters<typeof StoriesActivityFeed>[0]["rows"];
  correlations: Parameters<typeof StoryReelCorrelationTable>[0]["rows"];
}

interface TtPayload {
  contentRows: ContentRow[];
}

type Payload =
  | { kind: "yt"; data: YtPayload }
  | { kind: "fb"; data: FbPayload }
  | { kind: "ig"; data: IgPayload }
  | { kind: "tt"; data: TtPayload };

interface Props {
  platform: PlatformSlug;
  payload: Payload;
}

export async function InsightsSubTab({ payload }: Props) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.connections.insights");
  const sharedT = await getTranslations("creator.shared");

  if (payload.kind === "yt") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DimensionalBreakdown title={t("trafficSource")} data={payload.data.trafficSourceBreakdown} />
        <DimensionalBreakdown title={t("playbackLocation")} data={payload.data.playbackLocationBreakdown} />
        <DimensionalBreakdown title={t("deviceType")} data={payload.data.deviceTypeBreakdown} />
        <DimensionalBreakdown title={t("contentType")} data={payload.data.contentTypeBreakdown} />
        <DimensionalBreakdown title={t("subscribedStatus")} data={payload.data.subscribedStatusBreakdown} />
      </div>
    );
  }
  if (payload.kind === "fb") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FbReactionsChart data={payload.data.reactions} />
        <RetentionCurveChart data={payload.data.retention} />
      </div>
    );
  }
  if (payload.kind === "ig") {
    return (
      <div className="space-y-4">
        <StoriesActivityFeed rows={payload.data.stories} />
        <StoryReelCorrelationTable rows={payload.data.correlations} />
      </div>
    );
  }
  // TikTok — posting cadence histogram (lifted from old per-platform page)
  const cadenceMap = new Map<string, number>();
  for (const r of payload.data.contentRows) {
    const key = r.capturedAt.toISOString().slice(0, 10);
    cadenceMap.set(key, (cadenceMap.get(key) ?? 0) + 1);
  }
  const cadence = Array.from(cadenceMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        {t("postingCadence")}
      </p>
      {cadence.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("noPosts")}</p>
      ) : (
        <ul className="space-y-1.5">
          {cadence.map(({ date, count }) => (
            <li key={date} className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-secondary)", width: 100 }}>{formatShortDate(date, locale)}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div style={{ width: `${Math.min(100, count * 12)}%`, height: "100%", background: "#010101" }} />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)", width: 50 }}>
                {sharedT("labels.postCount", { count })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
