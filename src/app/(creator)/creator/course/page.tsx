import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth, getCachedAuthUser } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/i18n-format";
import { prisma } from "@/lib/prisma";
import { PLATFORM_META, platformToSlug } from "@/lib/course/access";
import { getAllPlatformOverviews } from "@/lib/course/queries";
import { CreatorPageHeader, CreatorSectionHeader, SoftStat } from "../_components/creator-journey";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("creator.course.metadata");
  return { title: t("title") };
}

export default async function CourseHubPage() {
  await requireAuth("creator", "admin");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.course.page");
  const authUser = await getCachedAuthUser();
  if (!authUser) throw new Error("User not found");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, email: true },
  });
  if (!dbUser) throw new Error("User not found");

  const [overviews, badgeCount] = await Promise.all([
    getAllPlatformOverviews({ userId: dbUser.id, email: dbUser.email }),
    prisma.userBadge.count({ where: { userId: dbUser.id } }),
  ]);
  const totalLessons = overviews.reduce((sum, overview) => sum + overview.totalLessons, 0);
  const completedLessons = overviews.reduce((sum, overview) => sum + overview.completedLessons, 0);
  const firstAvailable = overviews.find((overview) => overview.totalLessons > 0);
  const firstHref = firstAvailable ? `/creator/course/${platformToSlug(firstAvailable.platform)}` : "/creator/course/foundations";

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href={firstHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {t("continueLearning")}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <SoftStat label={t("lessonsCompleted")} value={`${formatNumber(completedLessons, locale)}/${formatNumber(totalLessons, locale)}`} detail={t("acrossCourses")} />
        <SoftStat label={t("badgesEarned")} value={formatNumber(badgeCount, locale)} detail={t("fromQuizzes")} />
        <div className="col-span-2 md:col-span-1">
          <SoftStat
            label={t("courses")}
            value={formatNumber(overviews.filter((overview) => overview.totalLessons > 0).length, locale)}
            detail={t("readyCourses")}
          />
        </div>
      </div>

      <section>
        <CreatorSectionHeader title={t("availableCourses")} description={t("availableDescription")} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {overviews.map((overview) => {
            const slug = platformToSlug(overview.platform);
            const meta = PLATFORM_META[slug];
            const progress = overview.totalLessons > 0 ? Math.round((overview.completedLessons / overview.totalLessons) * 100) : 0;
            return (
              <Link key={slug} href={`/creator/course/${slug}`} className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:bg-neutral-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{meta.label}</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-normal text-neutral-950">
                      {overview.courseTitle ?? t("courseFallback", { platform: meta.label })}
                    </h2>
                  </div>
                  {overview.completedLessons === overview.totalLessons && overview.totalLessons > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-neutral-950" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-neutral-500 transition group-hover:text-neutral-950" />
                  )}
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-neutral-950" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-sm text-neutral-500">
                  {t("lessonsComplete", {
                    completed: formatNumber(overview.completedLessons, locale),
                    total: formatNumber(overview.totalLessons, locale),
                  })}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
