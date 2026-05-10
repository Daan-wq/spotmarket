import { ContentTable } from "@/components/stats/ContentTable";
import type { ContentRow } from "@/lib/stats/content";
import type { PlatformSlug } from "@/lib/stats/types";
import type { ApplicationOption } from "@/components/submissions/PickApplicationModal";

interface Props {
  /** When showPlatform is true, this is just a fallback (used by ContentTable for platform-specific
   *  columns); the rows themselves carry per-row `platform`. */
  platform: PlatformSlug;
  rows: ContentRow[];
  showPlatform: boolean;
  applications: ApplicationOption[];
  readOnly?: boolean;
}

export function ContentSubTab({ platform, rows, showPlatform, applications, readOnly }: Props) {
  return (
    <ContentTable
      platform={platform}
      rows={rows}
      showPlatform={showPlatform}
      applications={applications}
      readOnly={readOnly}
    />
  );
}
