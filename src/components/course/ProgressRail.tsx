import { Star, BookOpen } from "lucide-react";
import type { PlatformOverview } from "@/lib/course/queries";
import { PLATFORM_META, platformToSlug } from "@/lib/course/access";

interface ProgressRailProps {
  overviews: PlatformOverview[];
  totalBadgeCount: number;
}

export function ProgressRail({ overviews, totalBadgeCount }: ProgressRailProps) {
  const totalCompleted = overviews.reduce((sum, overview) => sum + overview.completedLessons, 0);
  const totalLessons = overviews.reduce((sum, overview) => sum + overview.totalLessons, 0);

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Your progress</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
                <BookOpen className="h-3 w-3" /> Lessons
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950 tabular-nums">
                {totalCompleted}/{totalLessons}
              </p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
                <Star className="h-3 w-3 fill-current" /> Badges
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950 tabular-nums">{totalBadgeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Per platform</p>
          <ul className="mt-3 space-y-2">
            {overviews.map((overview) => {
              const slug = platformToSlug(overview.platform);
              const meta = PLATFORM_META[slug];
              const pct = overview.totalLessons ? Math.round((overview.completedLessons / overview.totalLessons) * 100) : 0;
              return (
                <li key={slug} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-950" />
                    <span className="truncate text-sm font-medium text-neutral-900">{meta.label}</span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {overview.completedLessons}/{overview.totalLessons} - {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
