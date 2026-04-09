interface Activity {
  type: "signup" | "earning";
  timestamp: string;
  referredUserName: string;
  amount?: number;
  status?: string;
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No activity yet. Share your referral link to get started!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, i) => (
        <div
          key={`${activity.type}-${activity.timestamp}-${i}`}
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: i % 2 === 0 ? "var(--bg-primary)" : "transparent" }}
        >
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: activity.type === "signup" ? "#6366f120" : "#22c55e20",
            }}
          >
            {activity.type === "signup" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              {activity.type === "signup" ? (
                <>
                  <span className="font-medium">{activity.referredUserName}</span>{" "}
                  signed up with your link
                </>
              ) : (
                <>
                  Earned{" "}
                  <span className="font-semibold" style={{ color: "var(--accent)" }}>
                    ${activity.amount?.toFixed(2)}
                  </span>{" "}
                  from <span className="font-medium">{activity.referredUserName}</span>
                </>
              )}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {new Date(activity.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Status badge for earnings */}
          {activity.type === "earning" && activity.status && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                color: activity.status === "pending" ? "#f59e0b" : "#22c55e",
                background: activity.status === "pending" ? "#f59e0b20" : "#22c55e20",
              }}
            >
              {activity.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
