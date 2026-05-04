import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "../../_components/page-skeletons";

export default function Loading() {
  return (
    <div className="p-8">
      <PageHeaderSkeleton />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
