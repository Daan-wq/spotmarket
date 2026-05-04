import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "../../_components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeaderSkeleton />
        <Skeleton className="h-10 w-40" />
      </div>
      <TableSkeleton columns={6} rows={8} />
    </div>
  );
}
