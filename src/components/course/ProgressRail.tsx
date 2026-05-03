import { Trophy, Star, BookOpen } from "lucide-react";
import type { PlatformOverview } from "@/lib/course/queries";
import { PLATFORM_META, platformToSlug } from "@/lib/course/access";

interface ProgressRailProps {
  overviews: PlatformOverview[];
  totalBadgeCount: number;
}

export function ProgressRail({ overviews, totalBadgeCount }: ProgressRailProps) {
  const totalCompleted = overviews.reduce((s, o) => s + o.completedLessons, 0);
  const totalLessons = overviews.reduce((s, o) => s + o.totalLessons, 0);

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Your progress
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
                <BookOpen className="h-3 w-3" /> Lessons
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950 tabular-nums">
                {totalCompleted}/{totalLessons}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-700">
                <Star className="h-3 w-3 fill-current" /> Badges
              </p>
              <p className="mt-0.5 text-base font-bold text-amber-950 tabular-nums">
                {totalBadgeCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Per platform
          </p>
          <ul className="mt-3 space-y-2">
            {overviews.map((o) => {
              const slug = platformToSlug(o.platform);
              const meta = PLATFORM_META[slug];
              const pct = o.totalLessons
                ? Math.round((o.completedLessons / o.totalLessons) * 100)
                : 0;
              return (
                <li key={slug} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: meta.accent }}
                    />
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {meta.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {o.completedLessons}/{o.totalLessons} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <Trophy className="h-3 w-3" /> XP & Streaks
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Coming soon — earn XP, keep daily streaks, unlock perks.
          </p>
        </div>
      </div>
    </aside>
  );
}
