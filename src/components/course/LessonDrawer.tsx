"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Clock } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Markdown } from "./Markdown";
import { SkipQuizDialog } from "./SkipQuizDialog";
import { QuizRunner } from "./QuizRunner";
import { BadgeCelebration } from "./BadgeCelebration";
import { skipLesson, submitQuiz } from "@/lib/course/actions";

interface LessonDrawerProps {
  lessonSlug: string | null;
  accent: string;
  onClose: () => void;
}

interface LessonResponse {
  lesson: {
    id: string;
    slug: string;
    title: string;
    contentMd: string;
    estMinutes: number;
    isPublished: boolean;
    questions: Array<{
      id: string;
      prompt: string;
      options: string[];
      order: number;
    }>;
    sectionTitle: string;
    courseTitle: string;
  };
  progress: {
    completedAt: string;
    earnedBadge: boolean;
    quizSkipped: boolean;
  } | null;
}

type View = "reading" | "quiz" | "celebration";

export function LessonDrawer({ lessonSlug, accent, onClose }: LessonDrawerProps) {
  const [data, setData] = useState<LessonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("reading");
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [celebrationData, setCelebrationData] = useState<{
    earnedBadge: boolean;
    sectionBadgeTitle: string | null;
    courseBadgeTitle: string | null;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = !!lessonSlug;

  useEffect(() => {
    if (!lessonSlug) {
      setData(null);
      setView("reading");
      setScrolledToEnd(false);
      setCelebrationData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/courses/lesson/${encodeURIComponent(lessonSlug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json() as Promise<LessonResponse>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setView("reading");
        setScrolledToEnd(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Could not load lesson.");
        setLoading(false);
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [lessonSlug, onClose]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToEnd(true);
    }
  }

  function handleConfirmSkip() {
    if (!data) return;
    startTransition(async () => {
      try {
        await skipLesson({ lessonId: data.lesson.id });
        toast.success("Lesson complete. Badge available when you take the quiz.");
        setSkipOpen(false);
        onClose();
      } catch {
        toast.error("Could not save your progress.");
      }
    });
  }

  async function handleSubmitQuiz(answers: number[]) {
    if (!data) return { ok: false };
    const result = await submitQuiz({
      lessonId: data.lesson.id,
      answers,
    });
    if (result.ok) {
      setCelebrationData({
        earnedBadge: !!result.earnedBadge,
        sectionBadgeTitle: result.sectionBadge?.title ?? null,
        courseBadgeTitle: result.courseBadge?.title ?? null,
      });
      setView("celebration");
    }
    return {
      ok: result.ok,
      message: result.message,
    };
  }

  const isCompleted = !!data?.progress;
  const isSkippedNoBadge = data?.progress?.quizSkipped && !data?.progress.earnedBadge;
  const hasQuiz = (data?.lesson.questions.length ?? 0) > 0;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width="lg"
        title={data?.lesson.title ?? (loading ? "Loading…" : "Lesson")}
        description={
          data ? (
            <span className="inline-flex items-center gap-2 text-xs">
              <span className="font-medium" style={{ color: accent }}>
                {data.lesson.courseTitle}
              </span>
              <span className="text-neutral-300">·</span>
              <span>{data.lesson.sectionTitle}</span>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {data.lesson.estMinutes} min
              </span>
              {!data.lesson.isPublished && (
                <span className="rounded-full border border-dashed border-indigo-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                  Preview
                </span>
              )}
              {isCompleted && data.progress?.earnedBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  <Check className="h-3 w-3" /> Badge earned
                </span>
              )}
              {isSkippedNoBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  Completed (no badge)
                </span>
              )}
            </span>
          ) : null
        }
        className="md:max-w-2xl"
      >
        {loading && (
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
          </div>
        )}

        {!loading && data && view === "reading" && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="-mx-5 -my-4 h-full overflow-y-auto px-5 py-4"
          >
            <Markdown source={data.lesson.contentMd} />

            <div className="my-6 border-t border-dashed pt-4">
              {!hasQuiz && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This lesson doesn't have a quiz yet.
                </div>
              )}

              {hasQuiz && !isCompleted && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500">
                    {scrolledToEnd
                      ? "You've reached the end. Take the quiz to earn the badge."
                      : "Scroll to the bottom of the lesson to enable the quiz."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSkipOpen(true)}
                      disabled={!scrolledToEnd || isPending}
                    >
                      Skip Quiz
                    </Button>
                    <Button
                      onClick={() => setView("quiz")}
                      disabled={!scrolledToEnd}
                    >
                      Take Quiz ({data.lesson.questions.length} questions)
                    </Button>
                  </div>
                </div>
              )}

              {hasQuiz && isCompleted && !data.progress?.earnedBadge && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <p className="text-sm text-neutral-700">
                    You skipped the quiz on this lesson.
                  </p>
                  <Button onClick={() => setView("quiz")}>
                    Take Quiz to Earn Badge
                  </Button>
                </div>
              )}

              {hasQuiz && data.progress?.earnedBadge && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-900">
                    Lesson badge earned. You can replay the quiz anytime.
                  </p>
                  <Button variant="outline" onClick={() => setView("quiz")}>
                    Replay Quiz
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && data && view === "quiz" && (
          <QuizRunner
            questions={data.lesson.questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              options: q.options,
            }))}
            accent={accent}
            onSubmit={handleSubmitQuiz}
            onCancel={() => setView("reading")}
          />
        )}

        {!loading && data && view === "celebration" && celebrationData && (
          <BadgeCelebration
            accent={accent}
            earnedBadge={celebrationData.earnedBadge}
            sectionBadgeTitle={celebrationData.sectionBadgeTitle}
            courseBadgeTitle={celebrationData.courseBadgeTitle}
            onContinue={onClose}
          />
        )}
      </Drawer>

      <SkipQuizDialog
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        onTakeQuiz={() => {
          setSkipOpen(false);
          setView("quiz");
        }}
        onConfirmSkip={handleConfirmSkip}
        isPending={isPending}
      />
    </>
  );
}
