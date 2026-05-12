import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { requireAuth, getCachedAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_META, platformToSlug } from "@/lib/course/access";
import { getAllPlatformOverviews } from "@/lib/course/queries";
import { CreatorPageHeader, CreatorSectionHeader, SoftStat } from "../_components/creator-journey";

export const metadata = {
  title: "Course",
};
export const dynamic = "force-dynamic";

export default async function CourseHubPage() {
  await requireAuth("creator", "admin");
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
        eyebrow="Training"
        title="Course hub"
        description="Pick a course, finish lessons in order, pass quizzes, and collect badges as proof of completion."
        action={
          <Link
            href={firstHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Continue learning
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <SoftStat label="Lessons completed" value={`${completedLessons}/${totalLessons}`} detail="Across all available courses" />
        <SoftStat label="Badges earned" value={String(badgeCount)} detail="From lesson and section quizzes" />
        <div className="col-span-2 md:col-span-1">
          <SoftStat label="Courses" value={String(overviews.filter((overview) => overview.totalLessons > 0).length)} detail="Ready to work through" />
        </div>
      </div>

      <section>
        <CreatorSectionHeader title="Available courses" description="Each course includes lesson reading, quiz checks, progress tracking, and badges." />
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
                    <h2 className="mt-2 text-lg font-semibold tracking-normal text-neutral-950">{overview.courseTitle ?? `${meta.label} course`}</h2>
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
                  {overview.completedLessons}/{overview.totalLessons} lessons complete
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
