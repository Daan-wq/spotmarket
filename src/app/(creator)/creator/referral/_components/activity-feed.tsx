import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatShortDate } from "@/lib/i18n-format";
import { getLocale, getTranslations } from "next-intl/server";

interface Activity {
  type: "signup" | "earning";
  timestamp: string;
  referredUserName: string;
  amount?: number;
  status?: string;
}

export async function ActivityFeed({ activities }: { activities: Activity[] }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.referral.activity");

  if (activities.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {t("emptyStart")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, i) => {
        const isPendingReview =
          activity.type === "earning" && activity.status === "pending_review";
        const earningColor = isPendingReview ? "#f59e0b" : "#22c55e";
        return (
          <div
            key={`${activity.type}-${activity.timestamp}-${i}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: i % 2 === 0 ? "var(--bg-primary)" : "transparent" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: activity.type === "signup" ? "#6366f120" : `${earningColor}20`,
              }}
            >
              {activity.type === "signup" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={earningColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {activity.type === "signup"
                  ? t("signupWithLink", { name: activity.referredUserName })
                  : isPendingReview
                    ? t("pendingReviewFrom", {
                        amount: formatCurrency(activity.amount ?? 0, locale),
                        name: activity.referredUserName,
                      })
                    : t("earnedFrom", {
                        amount: formatCurrency(activity.amount ?? 0, locale),
                        name: activity.referredUserName,
                      })}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {formatShortDate(activity.timestamp, locale)}
              </p>
            </div>

            {activity.type === "earning" && activity.status ? (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  color: earningColor,
                  background: `${earningColor}20`,
                }}
              >
                {isPendingReview ? t("pendingReviewStatus") : t("earnedStatus")}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
