import { ContentTable } from "@/components/stats/ContentTable";
import type { ContentRow } from "@/lib/stats/content";
import type { PlatformSlug } from "@/lib/stats/types";

interface Props {
  /** When showPlatform is true, this is just a fallback (used by ContentTable for platform-specific
   *  columns); the rows themselves carry per-row `platform`. */
  platform: PlatformSlug;
  rows: ContentRow[];
  showPlatform: boolean;
}

export function ContentSubTab({ platform, rows, showPlatform }: Props) {
  return <ContentTable platform={platform} rows={rows} showPlatform={showPlatform} />;
}
