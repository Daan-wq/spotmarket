const STATUS_CONFIG: Record<string, { background: string; color: string; label: string }> = {
  approved:  { background: "#f0fdf4", color: "#15803d", label: "Approved"  },
  pending:   { background: "#fffbeb", color: "#92400e", label: "Pending"   },
  rejected:  { background: "#fef2f2", color: "#b91c1c", label: "Rejected"  },
  active:    { background: "#f0fdf4", color: "#15803d", label: "Active"    },
  completed: { background: "#f3f4f6", color: "#6b7280", label: "Completed" },
  disputed:  { background: "#fff7ed", color: "#c2410c", label: "Disputed"  },
  draft:     { background: "#f3f4f6", color: "#6b7280", label: "Draft"     },
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
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
      {/* Brand avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background: "#111827" }}
      >
        {brandInitial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{brandName}</p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: s.background, color: s.color }}
          >
            {s.label}
          </span>
        </div>
        <p className="text-xs truncate mb-1" style={{ color: "#6b7280" }}>{campaignName}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "#111827" }}>{budget}</span>
          <span className="text-xs" style={{ color: "#9ca3af" }}>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
