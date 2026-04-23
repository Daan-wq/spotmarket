import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-56 mb-2" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl px-4 py-[14px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  title?: string;
}

export function TableSkeleton({ columns, rows = 8, title }: TableSkeletonProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {title && (
        <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-40" />
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ borderBottom: "1px solid var(--border)" }}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-6 py-3">
                  <Skeleton className="h-4 w-full max-w-[140px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
