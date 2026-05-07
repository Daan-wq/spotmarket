interface CorrelationRow {
  id: string;
  submissionId: string;
  deltaMinutes: number;
  story: {
    id: string;
    mediaId: string;
    postedAt: Date;
    permalink: string | null;
    views: number | null;
    reach: number | null;
  };
}

/**
 * Banner above the Timeline feed surfacing the closest-in-time IG Story → Reel correlations.
 * Renders nothing when there are no rows (caller decides whether to query).
 *
 * Selection rule: smallest |deltaMinutes| first (closest in time = strongest causal hint).
 */
export function TimelineCorrelationCallout({
  rows,
  max = 3,
}: {
  rows: CorrelationRow[];
  max?: number;
}) {
  if (rows.length === 0) return null;

  const top = [...rows]
    .sort((a, b) => Math.abs(a.deltaMinutes) - Math.abs(b.deltaMinutes))
    .slice(0, max);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
      }}
    >
      <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--accent)" }}>
        Story → Reel correlations
      </p>
      <ul className="space-y-1.5">
        {top.map((r) => (
          <li key={r.id} className="text-sm" style={{ color: "var(--text-primary)" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Story posted {r.deltaMinutes < 0 ? `${Math.abs(r.deltaMinutes)} min before` : `${r.deltaMinutes} min after`}
            </span>{" "}
            a Reel
            {r.story.views != null ? (
              <>
                {" "}— story reached <strong>{r.story.views.toLocaleString()}</strong> views
              </>
            ) : null}
            {r.story.permalink ? (
              <>
                {" · "}
                <a
                  href={r.story.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ color: "var(--accent)" }}
                >
                  view story
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
