"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import type { CourseTree, LessonNode as LessonNodeData } from "@/lib/course/queries";
import { LessonNode } from "./LessonNode";
import { SectionBossNode } from "./SectionBossNode";
import { LessonDrawer } from "./LessonDrawer";

interface RoutemapPathProps {
  course: CourseTree | null;
  accent: string;
  isAdmin: boolean;
  initialLessonSlug?: string | null;
}

const OFFSETS: Array<"left" | "center" | "right"> = [
  "center",
  "right",
  "center",
  "left",
];

export function RoutemapPath({
  course,
  accent,
  isAdmin,
  initialLessonSlug,
}: RoutemapPathProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeLessonSlug, setActiveLessonSlug] = useState<string | null>(
    initialLessonSlug ?? null,
  );

  function handleSelect(lesson: LessonNodeData) {
    if (lesson.state === "coming-soon") {
      toast.info("This lesson is coming soon.");
      return;
    }
    if (lesson.state === "locked") return;
    setActiveLessonSlug(lesson.slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("lesson", lesson.slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleClose() {
    setActiveLessonSlug(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lesson");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    router.refresh();
  }

  if (!course) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <p className="text-base font-semibold text-neutral-900">Coming soon</p>
        <p className="mt-1 text-sm text-neutral-500">
          This platform's course is still being prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-neutral-950">{course.title}</h1>
        {course.description && (
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            {course.description}
          </p>
        )}
      </header>

      {course.sections.map((section, sIdx) => (
        <section key={section.id} className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Section {sIdx + 1}
            </span>
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
              {section.title}
            </span>
            {!section.isPublished && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {isAdmin ? "Preview" : "Coming soon"}
              </span>
            )}
          </div>

          <div className="relative mx-auto max-w-md space-y-10">
            {section.lessons.map((lesson, lIdx) => (
              <LessonNode
                key={lesson.id}
                lesson={lesson}
                accent={accent}
                offset={OFFSETS[lIdx % OFFSETS.length]}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <SectionBossNode section={section} accent={accent} />
        </section>
      ))}

      {course.hasCourseBadge && (
        <div className="mx-auto max-w-md rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Course trophy
          </p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            {course.title} mastered
          </p>
        </div>
      )}

      <LessonDrawer
        lessonSlug={activeLessonSlug}
        accent={accent}
        onClose={handleClose}
      />
    </div>
  );
}
