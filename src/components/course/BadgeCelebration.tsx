"use client";

import { Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BadgeCelebrationProps {
  earnedBadge: boolean;
  sectionBadgeTitle?: string | null;
  courseBadgeTitle?: string | null;
  onContinue: () => void;
  accent: string;
}

export function BadgeCelebration({
  earnedBadge,
  sectionBadgeTitle,
  courseBadgeTitle,
  onContinue,
  accent,
}: BadgeCelebrationProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: accent }}
      >
        <Star className="h-12 w-12 fill-current" />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-950">Perfect!</p>
        <p className="mt-1 text-sm text-neutral-500">
          {earnedBadge
            ? "You earned the lesson badge."
            : "Lesson complete."}
        </p>
      </div>

      {sectionBadgeTitle && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <Trophy className="h-6 w-6 text-amber-600" />
          <div className="text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Section badge unlocked
            </p>
            <p className="text-sm font-bold text-amber-950">{sectionBadgeTitle}</p>
          </div>
        </div>
      )}

      {courseBadgeTitle && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-3">
          <Trophy className="h-7 w-7 text-amber-700" />
          <div className="text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Course trophy unlocked
            </p>
            <p className="text-sm font-bold text-amber-950">{courseBadgeTitle}</p>
          </div>
        </div>
      )}

      <Button onClick={onContinue} size="lg">
        Continue
      </Button>
    </div>
  );
}
