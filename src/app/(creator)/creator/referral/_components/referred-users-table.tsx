import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const PER_USER_CAP = 100;

export interface ReferredUserRow {
  userId: string;
  displayName: string;
  joinedAt: string;
  commissionEarned: number;
}

interface ReferredUsersTableProps {
  rows: ReferredUserRow[];
}

export function ReferredUsersTable({ rows }: ReferredUsersTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No referrals yet"
        description="Share your link — when someone signs up and starts earning, they'll appear here."
      />
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">User</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Joined</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">
              Cap progress
            </th>
            <th className="text-right text-[11px] uppercase tracking-wide px-5 py-2 font-medium">
              Your commission
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pct = Math.min(100, (row.commissionEarned / PER_USER_CAP) * 100);
            const maxedOut = row.commissionEarned >= PER_USER_CAP;
            return (
              <tr key={row.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                  <span className="font-medium">{row.displayName}</span>
                  {maxedOut && (
                    <Badge variant="paid" className="ml-2">
                      Maxed
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                  {new Date(row.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full"
                      style={{ background: "var(--muted)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: maxedOut
                            ? "var(--success-text)"
                            : "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      ${row.commissionEarned.toFixed(0)} / ${PER_USER_CAP}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--success-text)" }}>
                  ${row.commissionEarned.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
