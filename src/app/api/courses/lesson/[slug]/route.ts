import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedAuthUser } from "@/lib/auth";
import { canSeeUnpublishedCourses } from "@/lib/course/access";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const authUser = await getCachedAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, email: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isAdmin = canSeeUnpublishedCourses(dbUser.email);

  const lesson = await prisma.lesson.findFirst({
    where: {
      slug,
      ...(isAdmin
        ? {}
        : {
            isPublished: true,
            section: { isPublished: true, course: { isPublished: true } },
          }),
    },
    include: {
      section: { include: { course: true } },
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, prompt: true, optionsJson: true, order: true },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: dbUser.id, lessonId: lesson.id } },
  });

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      contentMd: lesson.contentMd,
      estMinutes: lesson.estMinutes,
      isPublished: lesson.isPublished,
      questions: lesson.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.optionsJson as string[],
        order: q.order,
      })),
      sectionTitle: lesson.section.title,
      courseTitle: lesson.section.course.title,
      coursePlatform: lesson.section.course.platform,
    },
    progress: progress
      ? {
          completedAt: progress.completedAt.toISOString(),
          earnedBadge: progress.earnedBadge,
          quizSkipped: progress.quizSkipped,
        }
      : null,
  });
}
