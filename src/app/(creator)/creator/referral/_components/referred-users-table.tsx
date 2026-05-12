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
      <div className="hidden overflow-x-auto md:block">
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
                    <ProgressBar amount={row.commissionEarned} />
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

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => {
          const maxedOut = row.commissionEarned >= PER_USER_CAP;
          return (
            <article
              key={row.userId}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.displayName}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    Joined {new Date(row.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                {maxedOut ? <Badge variant="paid">Maxed</Badge> : null}
              </div>
              <div className="mt-4">
                <ProgressBar amount={row.commissionEarned} />
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--success-text)" }}>
                ${row.commissionEarned.toFixed(2)} commission
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ amount }: { amount: number }) {
  const pct = Math.min(100, (amount / PER_USER_CAP) * 100);
  const maxedOut = amount >= PER_USER_CAP;

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ background: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: maxedOut ? "var(--success-text)" : "var(--accent)",
          }}
        />
      </div>
      <span className="whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
        ${amount.toFixed(0)} / ${PER_USER_CAP}
      </span>
    </div>
  );
}
