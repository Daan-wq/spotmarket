import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Course",
};

interface Lesson {
  title: string;
  duration: string;
  description: string;
  category: "Hooks" | "Editing" | "Strategy" | "Platforms";
}

const LESSONS: Lesson[] = [
  {
    title: "Writing hooks that stop the scroll",
    duration: "12 min",
    description: "The first 2 seconds decide everything. Patterns that consistently drive replays and watch-time.",
    category: "Hooks",
  },
  {
    title: "Picking the right campaign",
    duration: "8 min",
    description: "How to read a campaign brief and predict which ones are worth your time.",
    category: "Strategy",
  },
  {
    title: "Editing for retention",
    duration: "15 min",
    description: "Cut points, captions, sound design — what changes the audience-retention curve.",
    category: "Editing",
  },
  {
    title: "TikTok algorithm fundamentals",
    duration: "10 min",
    description: "How distribution actually works in 2026 and what signals matter most.",
    category: "Platforms",
  },
  {
    title: "Reels vs Shorts vs TikTok",
    duration: "9 min",
    description: "Same edit, different platforms — what to repurpose and what to remake.",
    category: "Platforms",
  },
  {
    title: "Reading the analytics",
    duration: "11 min",
    description: "Velocity, like ratio, watch-time. Which metrics tell you to scale and which to kill.",
    category: "Strategy",
  },
];

export default async function CoursePage() {
  await requireAuth("creator");

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Course
        </h1>
        <p
          className="mt-1 text-sm max-w-2xl"
          style={{ color: "var(--text-secondary)" }}
        >
          Coming soon — these lessons will help you write better hooks, edit
          tighter clips, and pick the campaigns that actually pay.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LESSONS.map((lesson) => (
          <article
            key={lesson.title}
            className="flex flex-col gap-3 rounded-xl border p-5"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="aspect-video rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-bg) 0%, var(--bg-secondary) 100%)",
                color: "var(--accent-foreground)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="recommended">{lesson.category}</Badge>
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {lesson.duration}
              </span>
            </div>
            <h2
              className="text-base font-semibold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {lesson.title}
            </h2>
            <p
              className="text-sm flex-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {lesson.description}
            </p>
            <div>
              <Badge variant="pending">Coming soon</Badge>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
