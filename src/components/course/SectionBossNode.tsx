"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SectionNode } from "@/lib/course/queries";

interface SectionBossNodeProps {
  section: SectionNode;
  accent: string;
}

export function SectionBossNode({ section, accent }: SectionBossNodeProps) {
  const completedCount = section.lessons.filter(
    (l) => l.state === "completed-badge" || l.state === "completed-no-badge",
  ).length;
  const total = section.lessons.length;
  const allDone = total > 0 && completedCount === total;
  const goldenBadge = section.hasSectionBadge;

  let style: React.CSSProperties = {};
  if (goldenBadge) {
    style = {
      background:
        "linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)",
      borderColor: "#f59e0b",
      color: "#7c2d12",
    };
  } else if (allDone) {
    style = { background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" };
  } else if (completedCount > 0) {
    style = { background: "#f4f4f5", borderColor: accent, color: accent };
  } else {
    style = { background: "#f4f4f5", borderColor: "#d4d4d8", color: "#a1a1aa" };
  }

  return (
    <div className="mx-auto flex flex-col items-center">
      <div
        className={cn(
          "relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 rotate-45 shadow-sm",
        )}
        style={style}
      >
        <div className="-rotate-45">
          <Trophy className="h-9 w-9" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-neutral-900">{section.badgeTitle}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-500">
          {goldenBadge ? "Section badge earned" : `${completedCount}/${total} complete`}
        </p>
      </div>
    </div>
  );
}
