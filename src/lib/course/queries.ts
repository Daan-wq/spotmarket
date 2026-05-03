import { prisma } from "@/lib/prisma";
import type { CoursePlatform } from "@prisma/client";
import { canSeeUnpublishedCourses } from "./access";

export interface LessonNode {
  id: string;
  slug: string;
  title: string;
  order: number;
  estMinutes: number;
  isPublished: boolean;
  state: LessonState;
  earnedBadge: boolean;
  quizSkipped: boolean;
  questionCount: number;
}

export type LessonState =
  | "locked"
  | "available"
  | "current"
  | "completed-badge"
  | "completed-no-badge"
  | "coming-soon"
  | "preview";

export interface SectionNode {
  id: string;
  slug: string;
  title: string;
  order: number;
  isPublished: boolean;
  badgeSlug: string;
  badgeTitle: string;
  hasSectionBadge: boolean;
  lessons: LessonNode[];
}

export interface CourseTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  platform: CoursePlatform;
  isPublished: boolean;
  hasCourseBadge: boolean;
  sections: SectionNode[];
  totalLessons: number;
  completedLessons: number;
  earnedBadges: number;
}

interface ViewerContext {
  userId: string;
  email: string | null;
}

export async function getCourseTree(
  platform: CoursePlatform,
  viewer: ViewerContext,
): Promise<CourseTree | null> {
  const isAdmin = canSeeUnpublishedCourses(viewer.email);

  const course = await prisma.course.findFirst({
    where: { platform, ...(isAdmin ? {} : { isPublished: true }) },
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { questions: true } } },
          },
        },
      },
    },
  });

  if (!course) return null;

  const allLessonIds = course.sections.flatMap((s) =>
    s.lessons.map((l) => l.id),
  );

  const [progressRows, badgeRows] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: viewer.userId, lessonId: { in: allLessonIds } },
    }),
    prisma.userBadge.findMany({
      where: {
        userId: viewer.userId,
        OR: [
          { kind: "SECTION", refId: { in: course.sections.map((s) => s.id) } },
          { kind: "COURSE", refId: course.id },
        ],
      },
    }),
  ]);

  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
  const sectionBadges = new Set(
    badgeRows.filter((b) => b.kind === "SECTION").map((b) => b.refId),
  );
  const hasCourseBadge = badgeRows.some(
    (b) => b.kind === "COURSE" && b.refId === course.id,
  );

  let foundCurrent = false;
  let totalLessons = 0;
  let completedLessons = 0;
  let earnedBadges = 0;
  let prevSectionFullyComplete = true;

  const sections: SectionNode[] = course.sections.map((section) => {
    const sectionVisible = isAdmin || section.isPublished;
    let sectionLessons: LessonNode[] = [];
    let allDone = true;
    let allBadged = true;
    let prevDone = prevSectionFullyComplete;

    section.lessons.forEach((lesson) => {
      totalLessons++;
      const progress = progressByLesson.get(lesson.id);
      const completed = !!progress;
      const earnedBadge = progress?.earnedBadge ?? false;
      const quizSkipped = progress?.quizSkipped ?? false;

      if (completed) completedLessons++;
      if (earnedBadge) earnedBadges++;
      if (!completed) allDone = false;
      if (!earnedBadge) allBadged = false;

      let state: LessonState;
      if (!lesson.isPublished) {
        state = isAdmin ? "preview" : "coming-soon";
      } else if (completed && earnedBadge) {
        state = "completed-badge";
      } else if (completed) {
        state = "completed-no-badge";
      } else if (!prevDone && !isAdmin) {
        state = "locked";
      } else if (!foundCurrent) {
        state = "current";
        foundCurrent = true;
      } else {
        state = "available";
      }

      sectionLessons.push({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        order: lesson.order,
        estMinutes: lesson.estMinutes,
        isPublished: lesson.isPublished,
        state,
        earnedBadge,
        quizSkipped,
        questionCount: lesson._count.questions,
      });

      prevDone = completed;
    });

    if (!sectionVisible) {
      sectionLessons = sectionLessons.map((l) => ({
        ...l,
        state: isAdmin ? "preview" : "coming-soon",
      }));
    }

    prevSectionFullyComplete = allDone;

    return {
      id: section.id,
      slug: section.slug,
      title: section.title,
      order: section.order,
      isPublished: section.isPublished,
      badgeSlug: section.badgeSlug,
      badgeTitle: section.badgeTitle,
      hasSectionBadge: allBadged && section.lessons.length > 0 && sectionBadges.has(section.id),
      lessons: sectionLessons,
    };
  });

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    platform: course.platform,
    isPublished: course.isPublished,
    hasCourseBadge,
    sections,
    totalLessons,
    completedLessons,
    earnedBadges,
  };
}

export async function getLessonWithProgress(
  lessonSlug: string,
  viewer: ViewerContext,
) {
  const isAdmin = canSeeUnpublishedCourses(viewer.email);
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
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

  if (!lesson) return null;

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: viewer.userId, lessonId: lesson.id } },
  });

  return { lesson, progress };
}

export interface PlatformOverview {
  platform: CoursePlatform;
  courseTitle: string | null;
  totalLessons: number;
  completedLessons: number;
  earnedBadges: number;
}

export async function getAllPlatformOverviews(
  viewer: ViewerContext,
): Promise<PlatformOverview[]> {
  const isAdmin = canSeeUnpublishedCourses(viewer.email);
  const courses = await prisma.course.findMany({
    where: isAdmin ? {} : { isPublished: true },
    include: {
      sections: {
        where: isAdmin ? {} : { isPublished: true },
        include: {
          lessons: {
            where: isAdmin ? {} : { isPublished: true },
            select: { id: true },
          },
        },
      },
    },
  });

  const allLessonIds = courses.flatMap((c) =>
    c.sections.flatMap((s) => s.lessons.map((l) => l.id)),
  );

  const progressRows = allLessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId: viewer.userId, lessonId: { in: allLessonIds } },
        select: { lessonId: true, earnedBadge: true },
      })
    : [];

  const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

  const platforms: CoursePlatform[] = [
    "FOUNDATIONS",
    "TIKTOK",
    "INSTAGRAM",
    "YOUTUBE",
    "X",
  ];

  return platforms.map((platform) => {
    const course = courses.find((c) => c.platform === platform);
    if (!course) {
      return {
        platform,
        courseTitle: null,
        totalLessons: 0,
        completedLessons: 0,
        earnedBadges: 0,
      };
    }
    const lessonIds = course.sections.flatMap((s) =>
      s.lessons.map((l) => l.id),
    );
    let completed = 0;
    let badged = 0;
    for (const id of lessonIds) {
      const p = progressMap.get(id);
      if (p) {
        completed++;
        if (p.earnedBadge) badged++;
      }
    }
    return {
      platform,
      courseTitle: course.title,
      totalLessons: lessonIds.length,
      completedLessons: completed,
      earnedBadges: badged,
    };
  });
}
