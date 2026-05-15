import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { COURSE_SEEDS } from "./seed-data/courses";

const connectionString =
  process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const courseSeed of COURSE_SEEDS) {
    const course = await prisma.course.upsert({
      where: { slug: courseSeed.slug },
      create: {
        slug: courseSeed.slug,
        platform: courseSeed.platform,
        title: courseSeed.title,
        description: courseSeed.description,
        order: COURSE_SEEDS.indexOf(courseSeed),
        isPublished: courseSeed.isPublished,
      },
      update: {
        platform: courseSeed.platform,
        title: courseSeed.title,
        description: courseSeed.description,
        order: COURSE_SEEDS.indexOf(courseSeed),
        isPublished: courseSeed.isPublished,
      },
    });

    for (const [si, sectionSeed] of courseSeed.sections.entries()) {
      const section = await prisma.courseSection.upsert({
        where: {
          courseId_slug: { courseId: course.id, slug: sectionSeed.slug },
        },
        create: {
          courseId: course.id,
          slug: sectionSeed.slug,
          title: sectionSeed.title,
          order: si,
          isPublished: sectionSeed.isPublished,
          badgeSlug: sectionSeed.badgeSlug,
          badgeTitle: sectionSeed.badgeTitle,
        },
        update: {
          title: sectionSeed.title,
          order: si,
          isPublished: sectionSeed.isPublished,
          badgeSlug: sectionSeed.badgeSlug,
          badgeTitle: sectionSeed.badgeTitle,
        },
      });

      for (const [li, lessonSeed] of sectionSeed.lessons.entries()) {
        const lesson = await prisma.lesson.upsert({
          where: {
            sectionId_slug: { sectionId: section.id, slug: lessonSeed.slug },
          },
          create: {
            sectionId: section.id,
            slug: lessonSeed.slug,
            title: lessonSeed.title,
            contentMd: lessonSeed.contentMd,
            order: li,
            estMinutes: lessonSeed.estMinutes,
            isPublished: lessonSeed.isPublished,
          },
          update: {
            title: lessonSeed.title,
            contentMd: lessonSeed.contentMd,
            order: li,
            estMinutes: lessonSeed.estMinutes,
            isPublished: lessonSeed.isPublished,
          },
        });

        // Replace the question set on every run so seed edits propagate.
        await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } });
        if (lessonSeed.questions.length > 0) {
          await prisma.quizQuestion.createMany({
            data: lessonSeed.questions.map((q, qi) => ({
              lessonId: lesson.id,
              prompt: q.prompt,
              optionsJson: q.options,
              correctIndex: q.correctIndex,
              order: qi,
            })),
          });
        }
      }
    }

    console.log(`✓ Seeded course: ${course.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
