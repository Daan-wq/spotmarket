import { Circle, ListChecks } from "lucide-react";
import { CircleCheckBig as CheckCircle2 } from "@/components/animate-ui/icons/circle-check-big";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const CHECKLIST = [
  { key: "packageName", label: "Pakket geselecteerd" },
  { key: "monthlyPrice", label: "Maandprijs ingesteld" },
  { key: "contractSigned", label: "Contract getekend" },
  { key: "paymentReceived", label: "Betaling ontvangen" },
  { key: "kickoffCallDone", label: "Kickoffcall gedaan" },
  { key: "brandBriefReceived", label: "Brief ontvangen" },
  { key: "contentExamplesReceived", label: "Voorbeelden ontvangen" },
  { key: "driveFolderCreated", label: "Drive-map gemaakt" },
  { key: "targetAudience", label: "Doelpubliek" },
  { key: "mainProductOrService", label: "Product/dienst" },
  { key: "hooksAngles", label: "Hooks/angles" },
  { key: "dosAndDonts", label: "Do/don'ts" },
  { key: "assignedClipperIds", label: "Toegewezen clippers" },
  { key: "startDate", label: "Startdatum" },
  { key: "accountManager", label: "Accountmanager" },
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
        eyebrow="Klantstart"
        title="Merkonboarding"
        description="Adminchecklist: elk merk blijft geblokkeerd tot pakket, betaling, contract, brief, assets, publiek, angles, toegewezen clippers, startdatum en eigenaar compleet zijn."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Onboardingrecords" value={String(records.length)} detail="Merken met checklist" />
        <StatCard label="Klaar voor productie" value={String(ready.length)} detail="Alle checklistitems compleet" tone={ready.length > 0 ? "success" : "neutral"} />
        <StatCard label="Geblokkeerd" value={String(incomplete.length)} detail="Getoond in command center" tone={incomplete.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Clippers ontbreken" value={String(noClippers.length)} detail="Nog geen zichtbaarheid op toegewezen merken" tone={noClippers.length > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Checklistkaarten" description="De operator scant eerst blokkades en wijst daarna clippers toe voordat productie start." />
        {records.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            title="Nog geen onboardingchecklists"
            description="Zet een gewonnen CRM-lead om of maak een merkonboardingrecord via de API. Het checklistmodel staat klaar."
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
                        {record.packageName || "Geen pakket"} - {formatCurrency(record.monthlyPrice, record.brand.currency)} - start {formatDate(record.startDate)}
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
                    <InfoBlock label="Accountmanager" value={record.accountManager || "-"} />
                    <InfoBlock label="Toegewezen clippers" value={assignedNames.length > 0 ? assignedNames.join(", ") : "Niemand toegewezen"} />
                    <InfoBlock label="Doelpubliek" value={record.targetAudience || "-"} />
                    <InfoBlock label="Product/dienst" value={record.mainProductOrService || "-"} />
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
