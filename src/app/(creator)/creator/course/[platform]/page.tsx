import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCachedAuthUser } from "@/lib/auth";
import {
  PLATFORM_META,
  canSeeUnpublishedCourses,
  isPlatformSlug,
  platformFromSlug,
} from "@/lib/course/access";
import {
  getCourseTree,
  getAllPlatformOverviews,
} from "@/lib/course/queries";
import { PlatformTabs } from "@/components/course/PlatformTabs";
import { RoutemapPath } from "@/components/course/RoutemapPath";
import { ProgressRail } from "@/components/course/ProgressRail";

export const dynamic = "force-dynamic";

interface CoursePlatformPageProps {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ lesson?: string | string[] }>;
}

export async function generateMetadata({ params }: CoursePlatformPageProps) {
  const { platform } = await params;
  const t = await getTranslations("creator.course.metadata");
  if (!isPlatformSlug(platform)) return { title: t("title") };
  return { title: `${PLATFORM_META[platform].label} · ${t("title")}` };
}

export default async function CoursePlatformPage({
  params,
  searchParams,
}: CoursePlatformPageProps) {
  await requireAuth("creator", "admin");
  const { platform } = await params;
  if (!isPlatformSlug(platform)) notFound();

  const platformEnum = platformFromSlug(platform);
  if (!platformEnum) notFound();

  const authUser = await getCachedAuthUser();
  if (!authUser) notFound();

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, email: true },
  });
  if (!dbUser) notFound();

  const isAdmin = canSeeUnpublishedCourses(dbUser.email);
  const viewer = { userId: dbUser.id, email: dbUser.email };

  const [course, overviews, badgeCount] = await Promise.all([
    getCourseTree(platformEnum, viewer),
    getAllPlatformOverviews(viewer),
    prisma.userBadge.count({ where: { userId: dbUser.id } }),
  ]);

  const meta = PLATFORM_META[platform];
  const sp = await searchParams;
  const lessonSlug = Array.isArray(sp.lesson) ? sp.lesson[0] : sp.lesson ?? null;

  return (
    <div className="w-full md:p-6">
      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          <PlatformTabs active={platform} overviews={overviews} />
          <RoutemapPath
            course={course}
            accent={meta.accent}
            isAdmin={isAdmin}
            initialLessonSlug={lessonSlug}
          />
        </div>
        <div className="hidden shrink-0 lg:block">
          <ProgressRail overviews={overviews} totalBadgeCount={badgeCount} />
        </div>
      </div>
    </div>
  );
}
