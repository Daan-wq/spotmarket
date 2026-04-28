import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-[14px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
      >
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BalanceSkeleton() {
  return (
    <div className="flex justify-between text-xs">
      <div className="space-y-1">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="space-y-1 text-right">
        <Skeleton className="h-3 w-12 ml-auto" />
        <Skeleton className="h-4 w-10 ml-auto" />
      </div>
    </div>
  );
}
