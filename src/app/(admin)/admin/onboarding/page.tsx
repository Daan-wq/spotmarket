import { Circle, ListChecks } from "lucide-react";
import { CircleCheckBig as CheckCircle2 } from "@/components/animate-ui/icons/circle-check-big";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const CHECKLIST = [
  { key: "packageName", label: "Package selected" },
  { key: "monthlyPrice", label: "Monthly price set" },
  { key: "contractSigned", label: "Contract signed" },
  { key: "paymentReceived", label: "Payment received" },
  { key: "kickoffCallDone", label: "Kickoff call done" },
  { key: "brandBriefReceived", label: "Brief received" },
  { key: "contentExamplesReceived", label: "Examples received" },
  { key: "driveFolderCreated", label: "Drive folder created" },
  { key: "targetAudience", label: "Target audience" },
  { key: "mainProductOrService", label: "Product/service" },
  { key: "hooksAngles", label: "Hooks/angles" },
  { key: "dosAndDonts", label: "Do/don'ts" },
  { key: "assignedClipperIds", label: "Assigned clippers" },
  { key: "startDate", label: "Start date" },
  { key: "accountManager", label: "Account manager" },
] as const;

type ChecklistKey = (typeof CHECKLIST)[number]["key"];

export default async function OnboardingPage() {
  const records = await prisma.brandOnboarding.findMany({
    orderBy: [{ startDate: "asc" }, { updatedAt: "desc" }],
    include: { brand: { select: { id: true, name: true, status: true, currency: true } } },
    take: 80,
  });

  const assignedIds = Array.from(new Set(records.flatMap((record) => record.assignedClipperIds)));
  const assignedCreators = assignedIds.length
    ? await prisma.creatorProfile.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const creatorById = new Map(assignedCreators.map((creator) => [creator.id, creator.displayName]));

  const incomplete = records.filter((record) => completion(record).done < CHECKLIST.length);
  const noClippers = records.filter((record) => record.assignedClipperIds.length === 0);
  const ready = records.filter((record) => completion(record).done === CHECKLIST.length);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Client Start"
        title="Brand Onboarding"
        description="Admin checklist behavior: every brand stays blocked until package, payment, contract, brief, assets, audience, angles, assigned clippers, start date, and owner are complete."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Onboarding records" value={String(records.length)} detail="Brands with checklist" />
        <StatCard label="Ready for production" value={String(ready.length)} detail="All checklist items complete" tone={ready.length > 0 ? "success" : "neutral"} />
        <StatCard label="Blocked" value={String(incomplete.length)} detail="Shown in command center" tone={incomplete.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Missing clippers" value={String(noClippers.length)} detail="No assigned-brand visibility yet" tone={noClippers.length > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Checklist Cards" description="Operator scans blockers first, then assigns clippers before production starts." />
        {records.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            title="No onboarding checklists yet"
            description="Convert a won CRM lead or create a brand onboarding record through the API. The checklist model is now in place."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {records.map((record) => {
              const progress = completion(record);
              const assignedNames = record.assignedClipperIds.map((id) => creatorById.get(id) ?? id);
              return (
                <article key={record.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-neutral-950">{record.brand.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {record.packageName || "No package"} · {formatCurrency(record.monthlyPrice, record.brand.currency)} · starts {formatDate(record.startDate)}
                      </p>
                    </div>
                    <Badge variant={progress.done === progress.total ? "verified" : "pending"}>
                      {progress.done}/{progress.total}
                    </Badge>
                  </header>

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CHECKLIST.map((item) => {
                      const ok = itemDone(record, item.key);
                      return (
                        <div key={item.key} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-neutral-300" />}
                          <span className={ok ? "text-neutral-950" : "text-neutral-500"}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoBlock label="Account manager" value={record.accountManager || "-"} />
                    <InfoBlock label="Assigned clippers" value={assignedNames.length > 0 ? assignedNames.join(", ") : "None assigned"} />
                    <InfoBlock label="Target audience" value={record.targetAudience || "-"} />
                    <InfoBlock label="Product/service" value={record.mainProductOrService || "-"} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm text-neutral-950">{value}</p>
    </div>
  );
}

function itemDone(record: Record<ChecklistKey, unknown>, key: ChecklistKey) {
  const value = record[key];
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  if (key === "monthlyPrice") return Number(value) > 0;
  return Boolean(value);
}

function completion(record: Record<ChecklistKey, unknown>) {
  const done = CHECKLIST.filter((item) => itemDone(record, item.key)).length;
  return { done, total: CHECKLIST.length };
}
