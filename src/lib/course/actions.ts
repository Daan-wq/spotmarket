"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCachedAuthUser } from "@/lib/auth";
import { canSeeUnpublishedCourses } from "./access";

interface ViewerRecord {
  id: string;
  email: string;
}

async function getViewer(): Promise<ViewerRecord> {
  const authUser = await getCachedAuthUser();
  if (!authUser) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("User not found");
  return user;
}

interface SkipLessonInput {
  lessonId: string;
}

interface SubmitQuizInput {
  lessonId: string;
  answers: number[];
}

export interface ActionResult {
  ok: boolean;
  earnedBadge?: boolean;
  sectionBadge?: { slug: string; title: string } | null;
  courseBadge?: { slug: string; title: string } | null;
  message?: string;
  correctCount?: number;
  totalQuestions?: number;
}

async function loadLesson(lessonId: string, email: string) {
  const isAdmin = canSeeUnpublishedCourses(email);
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      ...(isAdmin
        ? {}
        : {
            isPublished: true,
            section: { isPublished: true, course: { isPublished: true } },
          }),
    },
    include: {
      section: { include: { course: true } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) throw new Error("Lesson not found or not accessible");
  return lesson;
}

async function awardSectionAndCourseBadges(
  userId: string,
  sectionId: string,
  courseId: string,
): Promise<{ section: { slug: string; title: string } | null; course: { slug: string; title: string } | null }> {
  const section = await prisma.courseSection.findUnique({
    where: { id: sectionId },
    include: { lessons: { select: { id: true } } },
  });
  if (!section) return { section: null, course: null };

  const sectionLessonIds = section.lessons.map((l) => l.id);
  const sectionProgress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: sectionLessonIds } },
    select: { lessonId: true, earnedBadge: true },
  });
  const allBadged =
    sectionLessonIds.length > 0 &&
    sectionLessonIds.every((id) => {
      const p = sectionProgress.find((row) => row.lessonId === id);
      return p?.earnedBadge === true;
    });

  let sectionBadge: { slug: string; title: string } | null = null;
  if (allBadged) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_kind_refId: { userId, kind: "SECTION", refId: sectionId },
      },
    });
    if (!existing) {
      await prisma.userBadge.create({
        data: { userId, kind: "SECTION", refId: sectionId },
      });
      sectionBadge = { slug: section.badgeSlug, title: section.badgeTitle };
    }
  }

  let courseBadge: { slug: string; title: string } | null = null;
  if (allBadged) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { include: { lessons: { select: { id: true } } } },
      },
    });
    if (course) {
      const allLessonIds = course.sections.flatMap((s) =>
        s.lessons.map((l) => l.id),
      );
      const allProgress = await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: allLessonIds } },
        select: { lessonId: true, earnedBadge: true },
      });
      const courseFullyBadged =
        allLessonIds.length > 0 &&
        allLessonIds.every((id) => {
          const p = allProgress.find((row) => row.lessonId === id);
          return p?.earnedBadge === true;
        });
      if (courseFullyBadged) {
        const existing = await prisma.userBadge.findUnique({
          where: {
            userId_kind_refId: { userId, kind: "COURSE", refId: courseId },
          },
        });
        if (!existing) {
          await prisma.userBadge.create({
            data: { userId, kind: "COURSE", refId: courseId },
          });
          courseBadge = { slug: course.slug, title: course.title };
        }
      }
    }
  }

  return { section: sectionBadge, course: courseBadge };
}

export async function skipLesson(
  input: SkipLessonInput,
): Promise<ActionResult> {
  const viewer = await getViewer();
  const lesson = await loadLesson(input.lessonId, viewer.email);

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId: viewer.id, lessonId: lesson.id },
    },
    create: {
      userId: viewer.id,
      lessonId: lesson.id,
      completedAt: new Date(),
      earnedBadge: false,
      quizSkipped: true,
    },
    update: {
      completedAt: new Date(),
      quizSkipped: true,
    },
  });

  revalidatePath("/creator/course", "layout");
  return { ok: true, earnedBadge: false };
}

export async function submitQuiz(
  input: SubmitQuizInput,
): Promise<ActionResult> {
  const viewer = await getViewer();
  const lesson = await loadLesson(input.lessonId, viewer.email);
  const total = lesson.questions.length;
  if (total === 0) {
    return {
      ok: false,
      message: "This lesson has no quiz questions yet.",
    };
  }

  let correct = 0;
  lesson.questions.forEach((q, i) => {
    if (input.answers[i] === q.correctIndex) correct++;
  });

  await prisma.quizAttempt.create({
    data: {
      userId: viewer.id,
      lessonId: lesson.id,
      score: correct,
      total,
    },
  });

  if (correct < total) {
    return {
      ok: false,
      correctCount: correct,
      totalQuestions: total,
      message: "Some answers were incorrect. Try again to earn the badge.",
    };
  }

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: viewer.id, lessonId: lesson.id } },
  });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: viewer.id, lessonId: lesson.id } },
    create: {
      userId: viewer.id,
      lessonId: lesson.id,
      completedAt: new Date(),
      earnedBadge: true,
      quizSkipped: false,
    },
    update: {
      completedAt: existing?.completedAt ?? new Date(),
      earnedBadge: true,
      quizSkipped: false,
    },
  });

  // Lesson badge (kind = LESSON) — denormalized for badge wall.
  await prisma.userBadge.upsert({
    where: {
      userId_kind_refId: {
        userId: viewer.id,
        kind: "LESSON",
        refId: lesson.id,
      },
    },
    create: { userId: viewer.id, kind: "LESSON", refId: lesson.id },
    update: {},
  });

  const { section, course } = await awardSectionAndCourseBadges(
    viewer.id,
    lesson.sectionId,
    lesson.section.courseId,
  );

  revalidatePath("/creator/course", "layout");
  return {
    ok: true,
    earnedBadge: true,
    correctCount: correct,
    totalQuestions: total,
    sectionBadge: section,
    courseBadge: course,
  };
}
