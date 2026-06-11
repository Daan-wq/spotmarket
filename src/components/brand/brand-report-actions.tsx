import { Download } from "lucide-react";

export function BrandReportActions({ reportId }: { reportId: string }) {
  return (
    <a
      href={`/api/brand/reports/${reportId}/pdf`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-50"
    >
      <Download className="h-4 w-4" />
      PDF downloaden
    </a>
  );
}
