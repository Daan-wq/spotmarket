const STATUS_CONFIG: Record<string, { background: string; color: string; label: string }> = {
  approved:  { background: "var(--success-bg)", color: "var(--success-text)", label: "Approved"  },
  pending:   { background: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending"   },
  rejected:  { background: "var(--error-bg)", color: "var(--error-text)", label: "Rejected"  },
  active:    { background: "var(--success-bg)", color: "var(--success-text)", label: "Active"    },
  completed: { background: "var(--muted)", color: "var(--text-secondary)", label: "Completed" },
  disputed:  { background: "var(--warning-bg)", color: "var(--warning-text)", label: "Disputed"  },
  draft:     { background: "var(--muted)", color: "var(--text-secondary)", label: "Draft"     },
};

type ApplicationRowProps = {
  brandInitial: string;
  brandName: string;
  campaignName: string;
  status: string;
  budget: string;
  timeAgo: string;
};

export function ApplicationRow({
  brandInitial,
  brandName,
  campaignName,
  status,
  budget,
  timeAgo,
}: ApplicationRowProps) {
  const s = STATUS_CONFIG[status] ?? { background: "#f3f4f6", color: "#6b7280", label: status };

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid var(--muted)" }}>
      {/* Brand avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background: "var(--text-primary)" }}
      >
        {brandInitial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{brandName}</p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: s.background, color: s.color }}
          >
            {s.label}
          </span>
        </div>
        <p className="text-xs truncate mb-1" style={{ color: "var(--text-secondary)" }}>{campaignName}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{budget}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
