import { requireAuth } from "@/lib/auth";
import { UPDATES, type UpdateCategory } from "@/lib/updates";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

export const metadata = {
  title: "Updates",
};

export default async function UpdatesPage() {
  await requireAuth("creator");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Updates
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          What&apos;s changed in ClipProfit lately. Newest first.
        </p>
      </header>

      <ol className="space-y-4">
        {UPDATES.map((u) => (
          <li
            key={`${u.date}-${u.title}`}
            className="rounded-xl border p-5"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <Badge variant={categoryToVariant(u.category)}>{u.category}</Badge>
              <time
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
                dateTime={u.date}
              >
                {formatDate(u.date)}
              </time>
            </div>
            <h2
              className="mt-2 text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {u.title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {u.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function categoryToVariant(category: UpdateCategory): BadgeVariant {
  if (category === "New") return "new";
  if (category === "Improved") return "recommended";
  return "verified";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
