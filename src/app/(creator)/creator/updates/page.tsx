import { requireAuth } from "@/lib/auth";
import { UPDATES, type UpdateCategory } from "@/lib/updates";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/i18n-format";

export async function generateMetadata() {
  const t = await getTranslations("creator.updates.metadata");
  return {
    title: t("title"),
  };
}

export default async function UpdatesPage() {
  await requireAuth("creator");
  const locale = await getLocale();
  const t = await getTranslations("creator.updates");

  return (
    <div className="w-full max-w-3xl space-y-6 md:p-6">
      <header>
        <h1
          className="text-2xl font-bold md:text-3xl"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("description")}
        </p>
      </header>

      <ol className="space-y-4">
        {UPDATES.map((u) => (
          <li
            key={`${u.date}-${u.id}`}
            className="rounded-xl border p-5"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <Badge variant={categoryToVariant(u.category)}>
                {t(`categories.${u.category}`)}
              </Badge>
              <time
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
                dateTime={u.date}
              >
                {formatDate(u.date, locale)}
              </time>
            </div>
            <h2
              className="mt-2 text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t(`items.${u.id}.title`)}
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t(`items.${u.id}.description`)}
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
