"use client";

import Link from "next/link";
import {
  PLATFORM_META,
  PLATFORM_SLUGS,
  type PlatformSlug,
  platformToSlug,
} from "@/lib/course/access";
import type { PlatformOverview } from "@/lib/course/queries";
import { cn } from "@/lib/cn";

interface PlatformTabsProps {
  active: PlatformSlug;
  overviews: PlatformOverview[];
}

export function PlatformTabs({ active, overviews }: PlatformTabsProps) {
  const overviewMap = new Map(
    overviews.map((o) => [platformToSlug(o.platform), o]),
  );

  return (
    <div className="sticky top-0 z-20 -mx-6 mb-6 border-b bg-white/85 px-6 backdrop-blur">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        {PLATFORM_SLUGS.map((slug) => {
          const meta = PLATFORM_META[slug];
          const o = overviewMap.get(slug);
          const isActive = slug === active;
          return (
            <Link
              key={slug}
              href={`/creator/course/${slug}`}
              className={cn(
                "group flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "border-current text-neutral-950"
                  : "border-transparent text-neutral-500 hover:text-neutral-900",
              )}
              style={isActive ? { color: meta.accent, borderColor: meta.accent } : {}}
            >
              <span>{meta.label}</span>
              {o && o.totalLessons > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {o.completedLessons}/{o.totalLessons}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
