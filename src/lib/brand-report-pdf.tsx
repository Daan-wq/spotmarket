import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { BrandReportDocumentModel } from "@/lib/brand-report-document-model";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 46,
    backgroundColor: "#ffffff",
    color: "#111111",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.45,
  },
  cover: {
    justifyContent: "center",
  },
  kicker: {
    color: "#9a9a9a",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  coverTitle: {
    marginTop: 28,
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.02,
  },
  coverMeta: {
    marginTop: 38,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#dedede",
    flexDirection: "row",
    gap: 22,
    color: "#666666",
  },
  block: {
    marginBottom: 24,
  },
  blockDivider: {
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
  },
  heading: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 19,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  body: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.6,
  },
  takeawayGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  takeaway: {
    width: "48%",
    padding: 9,
    backgroundColor: "#f4f4f4",
    borderRadius: 4,
    color: "#333333",
  },
  hero: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 6,
    backgroundColor: "#111111",
    color: "#ffffff",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  mutedLight: {
    color: "#b8b8b8",
    fontSize: 8,
  },
  heroValue: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: 700,
  },
  heroTarget: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
  },
  progressTrack: {
    marginTop: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#555555",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    width: "23.5%",
    minHeight: 54,
    padding: 9,
    borderWidth: 1,
    borderColor: "#dedede",
    borderRadius: 4,
  },
  metricThird: {
    width: "31.8%",
  },
  metricLabel: {
    color: "#777777",
    fontSize: 8,
  },
  metricValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 700,
  },
  cpm: {
    marginTop: 12,
    padding: 14,
    borderRadius: 6,
    backgroundColor: "#111111",
    color: "#ffffff",
  },
  cpmValues: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cpmColumn: {
    width: "48%",
  },
  cpmRight: {
    width: "48%",
    textAlign: "right",
  },
  cpmValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: 700,
  },
  cpmNote: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#444444",
    color: "#cccccc",
    fontSize: 8,
    lineHeight: 1.5,
  },
  insight: {
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#111111",
    backgroundColor: "#f7f7f7",
    color: "#444444",
  },
  row: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: {
    fontSize: 11,
    fontWeight: 700,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "right",
  },
  rowMeta: {
    marginTop: 2,
    color: "#777777",
    fontSize: 8,
  },
  rowMetrics: {
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rowMetric: {
    width: "24%",
  },
  contentRow: {
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  rank: {
    width: 18,
    color: "#999999",
    fontWeight: 700,
  },
  thumbnail: {
    width: 42,
    height: 28,
    borderRadius: 3,
    objectFit: "cover",
    backgroundColor: "#eeeeee",
  },
  thumbnailFallback: {
    width: 42,
    height: 28,
    borderRadius: 3,
    backgroundColor: "#eeeeee",
  },
  contentMain: {
    flexGrow: 1,
    minWidth: 0,
  },
  contentValue: {
    width: 86,
    textAlign: "right",
    fontWeight: 700,
  },
  link: {
    color: "#111111",
    textDecoration: "none",
  },
  recommendationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recommendation: {
    width: "48%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#dedede",
    borderRadius: 4,
    color: "#333333",
  },
});

export async function renderBrandReportPdf(model: BrandReportDocumentModel): Promise<Buffer> {
  return renderToBuffer(<BrandReportPdfDocument model={model} />);
}

export function sanitizePdfThumbnailUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return allowedImageHosts().has(url.hostname.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
}

function BrandReportPdfDocument({ model }: { model: BrandReportDocumentModel }) {
  const hasOverview = Boolean(model.summary || model.result);
  const hasChannels = Boolean(model.platforms || model.content);
  const hasPeople = Boolean(model.creators || model.audience);
  const hasClosing = Boolean(model.budget || model.quality || model.recommendations);

  return (
    <Document title={model.title} author={model.brandName} subject={model.campaignName}>
      {model.cover ? (
        <Page size="A4" style={[styles.page, styles.cover]} wrap={false}>
          <Text style={styles.kicker}>{model.cover.kicker}</Text>
          <Text style={styles.coverTitle}>{model.cover.title}</Text>
          <View style={styles.coverMeta}>
            <Text>{model.brandName}</Text>
            <Text>{model.campaignName}</Text>
          </View>
        </Page>
      ) : null}

      {hasOverview ? (
        <Page size="A4" style={styles.page} wrap>
          {model.summary ? <Summary model={model} /> : null}
          {model.result ? <Result model={model} /> : null}
        </Page>
      ) : null}

      {model.performance ? (
        <Page size="A4" style={styles.page} wrap>
          <Heading kicker={model.performance.kicker} title={model.performance.title} />
          <View style={styles.metricGrid}>
            {model.performance.timeline.slice(-8).map((row) => (
              <Metric key={row.date} label={row.date} value={formatNumber(row.cumulativeViews)} />
            ))}
          </View>
          <Text style={styles.insight}>{model.performance.insight}</Text>
        </Page>
      ) : null}

      {hasChannels ? (
        <Page size="A4" style={styles.page} wrap>
          {model.platforms ? <Platforms model={model} /> : null}
          {model.content ? <Content model={model} /> : null}
        </Page>
      ) : null}

      {hasPeople ? (
        <Page size="A4" style={styles.page} wrap>
          {model.creators ? <Creators model={model} /> : null}
          {model.audience ? <Audience model={model} /> : null}
        </Page>
      ) : null}

      {hasClosing ? (
        <Page size="A4" style={styles.page} wrap>
          {model.budget ? <Budget model={model} /> : null}
          {model.quality ? <Quality model={model} /> : null}
          {model.recommendations ? <Recommendations model={model} /> : null}
        </Page>
      ) : null}

      {model.appendix ? (
        <Page size="A4" style={styles.page} wrap>
          <Heading kicker="Appendix" title="Definities en toelichting" />
          <Text style={styles.body}>{model.appendix.note || "Aanvullende operationele onderbouwing."}</Text>
        </Page>
      ) : null}
    </Document>
  );
}

function Summary({ model }: { model: BrandReportDocumentModel }) {
  if (!model.summary) return null;
  return (
    <View style={styles.blockDivider}>
      <Heading kicker={model.summary.kicker} title={model.summary.title} />
      <Text style={styles.body}>{model.summary.body}</Text>
      {model.summary.takeaways.length > 0 ? (
        <View style={styles.takeawayGrid}>
          {model.summary.takeaways.map((item) => <Text key={item} style={styles.takeaway}>{item}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

function Result({ model }: { model: BrandReportDocumentModel }) {
  if (!model.result) return null;
  const progress = model.result.targetViews
    ? Math.min(100, (model.result.currentViews / model.result.targetViews) * 100)
    : 0;
  return (
    <View style={styles.block}>
      <Heading kicker={model.result.kicker} title={model.result.title} />
      <View style={styles.hero} wrap={false}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.mutedLight}>Voortgang naar doel</Text>
            <Text style={styles.heroValue}>{formatNumber(model.result.currentViews)}</Text>
          </View>
          <View>
            <Text style={styles.mutedLight}>Doelviews</Text>
            <Text style={styles.heroTarget}>{formatNullableNumber(model.result.targetViews)}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${Math.max(2, progress)}%` }]} />
        </View>
      </View>
      <View style={styles.metricGrid}>
        <Metric label="Betaalde views" value={formatNumber(model.result.paidViews)} />
        <Metric label="Extra bereik" value={formatNumber(model.result.extraReach)} />
        <Metric label="Goedgekeurde clips" value={formatNumber(model.result.approvedClips)} />
        <Metric label="Budget gebruikt" value={formatCurrency(model.result.budgetUsed)} />
      </View>
      <Cpm model={model} />
    </View>
  );
}

function Platforms({ model }: { model: BrandReportDocumentModel }) {
  if (!model.platforms) return null;
  return (
    <View style={styles.blockDivider}>
      <Heading kicker={model.platforms.kicker} title={model.platforms.title} />
      {model.platforms.rows.map((row) => (
        <View key={row.platform} style={styles.row} wrap={false}>
          <View style={styles.rowTop}>
            <View>
              <Text style={styles.rowTitle}>{row.platform}</Text>
              <Text style={styles.rowMeta}>{row.clips} goedgekeurde clips</Text>
            </View>
            <View>
              <Text style={styles.rowValue}>{formatNumber(row.views)}</Text>
              <Text style={styles.rowMeta}>views</Text>
            </View>
          </View>
          <View style={styles.rowMetrics}>
            <SmallMetric label="Gem. views per clip" value={formatNumber(row.views / Math.max(1, row.clips))} />
            <SmallMetric label="Engagement" value={formatNumber(row.engagement)} />
            <SmallMetric label="Afgesproken CPM" value={formatCurrency(row.agreedCpm)} />
            <SmallMetric label="Effectieve CPM" value={formatNullableCurrency(row.effectiveCpm)} />
          </View>
        </View>
      ))}
      <Text style={styles.insight}>{model.cpm.explanation}</Text>
    </View>
  );
}

function Content({ model }: { model: BrandReportDocumentModel }) {
  if (!model.content) return null;
  return (
    <View style={styles.block}>
      <Heading kicker={model.content.kicker} title={model.content.title} />
      {model.content.rows.map((row, index) => {
        const thumbnailUrl = sanitizePdfThumbnailUrl(row.thumbnailUrl);
        return (
          <View key={row.id} style={styles.contentRow} wrap={false}>
            <Text style={styles.rank}>{index + 1}</Text>
            {/* react-pdf Image does not expose the HTML alt attribute. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {thumbnailUrl ? <Image src={thumbnailUrl} style={styles.thumbnail} /> : <View style={styles.thumbnailFallback} />}
            <View style={styles.contentMain}>
              <Text style={styles.rowTitle}>{row.creator}</Text>
              <Link src={row.postUrl} style={styles.link}>{row.platform} · {formatNumber(row.engagement)} engagement</Link>
            </View>
            <Text style={styles.contentValue}>{formatNumber(row.views)} views</Text>
          </View>
        );
      })}
    </View>
  );
}

function Creators({ model }: { model: BrandReportDocumentModel }) {
  if (!model.creators) return null;
  return (
    <View style={styles.blockDivider}>
      <Heading kicker={model.creators.kicker} title={model.creators.title} />
      {model.creators.rows.map((row) => (
        <View key={row.creator} style={styles.row} wrap={false}>
          <View style={styles.rowTop}>
            <View>
              <Text style={styles.rowTitle}>{row.creator}</Text>
              <Text style={styles.rowMeta}>{row.approvedSubmissions}/{row.submissions} clips goedgekeurd</Text>
            </View>
            <Text style={styles.rowValue}>{formatNumber(row.views)} views</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Audience({ model }: { model: BrandReportDocumentModel }) {
  if (!model.audience) return null;
  return (
    <View style={styles.block}>
      <Heading kicker="Publiek en bereik" title="Bereikt publiek" />
      <View style={styles.metricGrid}>
        <Metric
          third
          label="Top landen"
          value={model.audience.topCountries.slice(0, 4).map((row) => `${row.code} ${formatPercent(row.share)}`).join(" · ") || "-"}
        />
        <Metric
          third
          label="Leeftijd"
          value={Object.entries(model.audience.ageBuckets).slice(0, 4).map(([key, value]) => `${key} ${formatPercent(value)}`).join(" · ") || "-"}
        />
        <Metric
          third
          label="Gender"
          value={Object.entries(model.audience.genderSplit).slice(0, 4).map(([key, value]) => `${key} ${formatPercent(value)}`).join(" · ") || "-"}
        />
      </View>
      <Text style={styles.insight}>{model.audience.insight}</Text>
    </View>
  );
}

function Budget({ model }: { model: BrandReportDocumentModel }) {
  if (!model.budget) return null;
  return (
    <View style={styles.blockDivider}>
      <Heading kicker="Budget en waarde" title="Betaald bereik versus extra bereik" />
      <View style={styles.metricGrid}>
        <Metric third label="Campagnebudget" value={formatCurrency(model.budget.totalBudget)} />
        <Metric third label="Budget gebruikt" value={formatCurrency(model.budget.budgetUsed)} />
        <Metric third label="Extra bereik" value={formatNumber(model.budget.extraReach)} />
      </View>
      <Cpm model={model} />
      {model.budget.note ? <Text style={styles.insight}>{model.budget.note}</Text> : null}
    </View>
  );
}

function Quality({ model }: { model: BrandReportDocumentModel }) {
  if (!model.quality) return null;
  return (
    <View style={styles.blockDivider}>
      <Heading kicker="Kwaliteitscontrole" title="Validatie van prestaties" />
      <View style={styles.metricGrid}>
        <Metric third label="Gecontroleerde clips" value={formatNumber(model.quality.reviewedClips)} />
        <Metric third label="Uitgesloten clips" value={formatNumber(model.quality.excludedClips)} />
        <Metric third label="Uitgesloten views" value={formatNumber(model.quality.excludedViews)} />
      </View>
    </View>
  );
}

function Recommendations({ model }: { model: BrandReportDocumentModel }) {
  if (!model.recommendations || model.recommendations.items.length === 0) return null;
  return (
    <View style={styles.block}>
      <Heading kicker={model.recommendations.kicker} title={model.recommendations.title} />
      <View style={styles.recommendationGrid}>
        {model.recommendations.items.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.recommendation}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

function Cpm({ model }: { model: BrandReportDocumentModel }) {
  return (
    <View style={styles.cpm} wrap={false}>
      <View style={styles.cpmValues}>
        <View style={styles.cpmColumn}>
          <Text style={styles.mutedLight}>Afgesproken CPM</Text>
          <Text style={styles.cpmValue}>{formatCurrency(model.cpm.agreed)}</Text>
        </View>
        <View style={styles.cpmRight}>
          <Text style={styles.mutedLight}>Effectieve CPM</Text>
          <Text style={styles.cpmValue}>{formatNullableCurrency(model.cpm.effective)}</Text>
        </View>
      </View>
      <Text style={styles.cpmNote}>{model.cpm.explanation}</Text>
    </View>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.heading}>{title}</Text>
    </View>
  );
}

function Metric({ label, value, third = false }: { label: string; value: string; third?: boolean }) {
  return (
    <View style={[styles.metric, third ? styles.metricThird : {}]} wrap={false}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowMetric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={{ marginTop: 2, fontWeight: 700 }}>{value}</Text>
    </View>
  );
}

function allowedImageHosts() {
  const hosts = new Set<string>();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname.toLowerCase());
    } catch {
      // Ignore invalid environment configuration and use the neutral fallback.
    }
  }
  for (const host of (process.env.REPORT_PDF_ALLOWED_IMAGE_HOSTS ?? "").split(",")) {
    const normalized = host.trim().toLowerCase();
    if (normalized) hosts.add(normalized);
  }
  return hosts;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(value);
}

function formatNullableNumber(value: number | null) {
  return value == null ? "-" : formatNumber(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNullableCurrency(value: number | null) {
  return value == null ? "-" : formatCurrency(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}
