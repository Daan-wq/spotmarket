interface StoryRow {
  id: string;
  mediaId: string;
  postedAt: Date;
  mediaType: string;
  mediaProductType: string;
  permalink: string | null;
  reach: number | null;
  views: number | null;
  replies: number | null;
  follows: number | null;
  profileVisits: number | null;
  totalInteractions: number | null;
  tapsExit: number | null;
}

export function StoriesActivityFeed({ rows }: { rows: StoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
          Stories
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No Instagram Stories captured for this range yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        Stories ({rows.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <Th>Posted</Th>
              <Th>Type</Th>
              <Th>Views</Th>
              <Th>Reach</Th>
              <Th>Replies</Th>
              <Th>Follows</Th>
              <Th>Profile visits</Th>
              <Th>Exits</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                <Td>
                  {r.permalink ? (
                    <a href={r.permalink} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent)" }}>
                      {new Date(r.postedAt).toLocaleString()}
                    </a>
                  ) : (
                    new Date(r.postedAt).toLocaleString()
                  )}
                </Td>
                <Td>{r.mediaProductType}</Td>
                <Td>{r.views?.toLocaleString() ?? "—"}</Td>
                <Td>{r.reach?.toLocaleString() ?? "—"}</Td>
                <Td>{r.replies?.toLocaleString() ?? "—"}</Td>
                <Td>{r.follows?.toLocaleString() ?? "—"}</Td>
                <Td>{r.profileVisits?.toLocaleString() ?? "—"}</Td>
                <Td>{r.tapsExit?.toLocaleString() ?? "—"}</Td>
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
    <th className="text-left text-xs font-semibold uppercase tracking-wide py-2 pr-3" style={{ color: "var(--text-muted)" }}>
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
