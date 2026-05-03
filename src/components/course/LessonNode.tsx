"use client";

import { Lock, Check, Star, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LessonNode as LessonNodeData } from "@/lib/course/queries";

interface LessonNodeProps {
  lesson: LessonNodeData;
  accent: string;
  offset: "left" | "center" | "right";
  onSelect: (lesson: LessonNodeData) => void;
}

const offsetClass: Record<LessonNodeProps["offset"], string> = {
  left: "ml-0 mr-auto",
  center: "mx-auto",
  right: "ml-auto mr-0",
};

export function LessonNode({ lesson, accent, offset, onSelect }: LessonNodeProps) {
  const interactive =
    lesson.state === "available" ||
    lesson.state === "current" ||
    lesson.state === "completed-badge" ||
    lesson.state === "completed-no-badge" ||
    lesson.state === "preview";

  const showStartLabel = lesson.state === "current";

  return (
    <div className={cn("relative flex w-fit flex-col items-center", offsetClass[offset])}>
      {showStartLabel && (
        <div
          className="mb-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
          style={{ background: accent }}
        >
          <Sparkles className="h-3 w-3" />
          Start here
        </div>
      )}

      <button
        type="button"
        disabled={!interactive}
        onClick={interactive ? () => onSelect(lesson) : undefined}
        className={cn(
          "group relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
          {
            "cursor-pointer hover:scale-[1.04]": interactive,
            "cursor-not-allowed": !interactive,
          },
        )}
        style={getNodeStyles(lesson.state, accent)}
        aria-label={lesson.title}
      >
        {lesson.state === "current" && (
          <span
            className="pointer-events-none absolute inset-[-6px] rounded-full opacity-60 animate-ping"
            style={{ background: accent }}
          />
        )}
        <NodeIcon state={lesson.state} accent={accent} />
        {lesson.earnedBadge && (
          <span
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-amber-950 shadow"
            aria-hidden
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </span>
        )}
      </button>

      <div className="mt-2 max-w-[140px] text-center">
        <p className="line-clamp-2 text-xs font-semibold text-neutral-900">{lesson.title}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-neutral-500">
          <Clock className="h-3 w-3" /> {lesson.estMinutes} min
          {lesson.state === "coming-soon" && (
            <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
              Coming soon
            </span>
          )}
          {lesson.state === "preview" && (
            <span className="ml-1 rounded-full border border-dashed border-indigo-400 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-600">
              Preview
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function getNodeStyles(
  state: LessonNodeData["state"],
  accent: string,
): React.CSSProperties {
  switch (state) {
    case "locked":
      return {
        background: "#f4f4f5",
        borderColor: "#d4d4d8",
        color: "#a1a1aa",
      };
    case "current":
    case "available":
      return { background: accent, borderColor: accent, color: "#ffffff" };
    case "completed-badge":
      return {
        background: accent,
        borderColor: "#f59e0b",
        color: "#ffffff",
      };
    case "completed-no-badge":
      return {
        background: "#ffffff",
        borderColor: "#a1a1aa",
        color: "#525252",
      };
    case "coming-soon":
      return {
        background: "#fafafa",
        borderColor: "#e4e4e7",
        color: "#a1a1aa",
      };
    case "preview":
      return {
        background: "#eef2ff",
        borderColor: "#6366f1",
        color: "#4338ca",
        borderStyle: "dashed",
      };
    default:
      return {};
  }
}

function NodeIcon({
  state,
  accent: _accent,
}: {
  state: LessonNodeData["state"];
  accent: string;
}) {
  if (state === "locked" || state === "coming-soon") {
    return <Lock className="h-7 w-7" />;
  }
  if (state === "completed-badge" || state === "completed-no-badge") {
    return <Check className="h-8 w-8" strokeWidth={3} />;
  }
  return <PlayIcon />;
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
