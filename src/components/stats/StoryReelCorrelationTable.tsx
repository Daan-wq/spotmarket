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

export function StoryReelCorrelationTable({ rows }: { rows: CorrelationRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
          Story → Reel correlations
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No correlations recorded yet. Stories posted within ±2 hours of a Reel submission will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        Story → Reel correlations
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <Th>Story posted</Th>
              <Th>Story views</Th>
              <Th>Reel</Th>
              <Th>Δ minutes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                <Td>{new Date(r.story.postedAt).toLocaleString()}</Td>
                <Td>{r.story.views?.toLocaleString() ?? "—"}</Td>
                <Td>
                  {r.story.permalink ? (
                    <a href={r.story.permalink} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent)" }}>
                      {r.story.mediaId.slice(0, 12)}…
                    </a>
                  ) : (
                    r.story.mediaId.slice(0, 12) + "…"
                  )}
                </Td>
                <Td>
                  {r.deltaMinutes > 0 ? "+" : ""}{r.deltaMinutes}m
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-semibold uppercase tracking-wide py-2" style={{ color: "var(--text-muted)" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-2 pr-3 text-sm" style={{ color: "var(--text-primary)" }}>
      {children}
    </td>
  );
}
