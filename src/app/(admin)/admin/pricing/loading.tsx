import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "../../_components/page-skeletons";

export default function Loading() {
  return (
    <div className="p-8 space-y-9">
      <PageHeaderSkeleton />
      <TableSkeleton columns={5} rows={6} />
    </div>
  );
}
