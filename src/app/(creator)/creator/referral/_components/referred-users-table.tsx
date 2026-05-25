import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatShortDate } from "@/lib/i18n-format";
import { getLocale, getTranslations } from "next-intl/server";

const PER_USER_CAP = 100;

export interface ReferredUserRow {
  userId: string;
  displayName: string;
  joinedAt: string;
  commissionEarned: number;
  pendingCommission: number;
}

interface ReferredUsersTableProps {
  rows: ReferredUserRow[];
}

export async function ReferredUsersTable({ rows }: ReferredUsersTableProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.referral.table");

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
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
              <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">{t("user")}</th>
              <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">{t("joined")}</th>
              <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">
                {t("capProgress")}
              </th>
              <th className="text-right text-[11px] uppercase tracking-wide px-5 py-2 font-medium">
                {t("yourCommission")}
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
                        {t("maxed")}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                    {formatShortDate(row.joinedAt, locale)}
                  </td>
                  <td className="px-5 py-3 min-w-[180px]">
                    <ProgressBar amount={row.commissionEarned} locale={locale} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="font-semibold" style={{ color: "var(--success-text)" }}>
                      {formatCurrency(row.commissionEarned, locale)}
                    </p>
                    {row.pendingCommission > 0 ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {t("pendingReviewAmount", {
                          amount: formatCurrency(row.pendingCommission, locale),
                        })}
                      </p>
                    ) : null}
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
                    {t("joinedDate", { date: formatShortDate(row.joinedAt, locale) })}
                  </p>
                </div>
                {maxedOut ? <Badge variant="paid">{t("maxed")}</Badge> : null}
              </div>
              <div className="mt-4">
                <ProgressBar amount={row.commissionEarned} locale={locale} />
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--success-text)" }}>
                {t("commissionAmount", { amount: formatCurrency(row.commissionEarned, locale) })}
              </p>
              {row.pendingCommission > 0 ? (
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("pendingReviewAmount", {
                    amount: formatCurrency(row.pendingCommission, locale),
                  })}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ amount, locale }: { amount: number; locale: Locale }) {
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
        {formatCurrency(amount, locale, { maximumFractionDigits: 0 })} / {formatCurrency(PER_USER_CAP, locale, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
