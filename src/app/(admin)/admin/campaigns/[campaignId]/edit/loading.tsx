import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "../../../../_components/page-skeletons";

export default function Loading() {
  return (
    <div className="p-8">
      <PageHeaderSkeleton />
      <div
        className="rounded-xl p-6 space-y-5 max-w-3xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}
