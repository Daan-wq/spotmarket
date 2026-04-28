import {
  PageHeaderSkeleton,
  StatGridSkeleton,
  TableSkeleton,
} from "../../_components/page-skeletons";

export default function Loading() {
  return (
    <div className="p-8">
      <PageHeaderSkeleton />
      <StatGridSkeleton count={3} />
      <TableSkeleton columns={4} rows={8} />
    </div>
  );
}
