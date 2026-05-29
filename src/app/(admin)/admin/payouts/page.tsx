import { Download } from "@/components/animate-ui/icons/download";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrencyPrecise, formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import { PayoutRunForm } from "./payout-run-form";
import { PaymentRequestActions } from "./payment-request-actions";

export const dynamic = "force-dynamic";

const PAID_LIKE_STATUSES = new Set(["sent", "confirmed"]);

export default async function PayoutsPage() {
  const [paymentRequests, runs, payouts, approvedUnpaid] = await Promise.all([
    prisma.payout.findMany({
      where: {
        paymentMethod: { in: ["BANK_TRANSFER", "CRYPTO"] },
        status: { in: ["pending", "processing"] },
      },
      include: {
        creatorProfile: {
          select: {
            displayName: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: [{ requestedAt: "asc" }, { createdAt: "asc" }],
      take: 100,
    }),
    prisma.payoutRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } },
        },
      },
      take: 50,
    }),
    prisma.payout.findMany({
      include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.campaignSubmission.findMany({
      where: { status: "APPROVED", payoutRunItems: { none: {} } },
      select: { id: true, earnedAmount: true, creator: { select: { email: true } }, campaign: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const openRuns = runs.filter((run) => ["DRAFT", "FINALIZED", "PROCESSING"].includes(run.status));
  const owed = approvedUnpaid.reduce((sum, submission) => sum + Number(submission.earnedAmount), 0);
  const runNet = runs.reduce((sum, run) => sum + Number(run.totalNet), 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Financiele ops"
        title="Uitbetalingen"
        description="Uitbetalingsruns groeperen goedgekeurd onbetaald werk per creator en periode, inclusief bonussen, inhoudingen, CSV-export, bewijs en betaalstatus."
        actions={[
          { label: "Nieuwe uitbetalingsrun", href: "/admin/payouts?new=1", icon: Plus },
          { label: "Export CSV", href: "/api/admin/payout-runs?format=csv", icon: Download },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Betaalverzoeken" value={String(paymentRequests.length)} detail="Handmatige overboekingen wachten" tone={paymentRequests.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Open uitbetalingsruns" value={String(openRuns.length)} detail="Concept, afgerond of in verwerking" />
        <StatCard label="Netto run-totaal" value={formatCurrencyPrecise(runNet)} detail="Alle netto bedragen uit uitbetalingsruns" />
        <StatCard label="Goedgekeurd onbetaald" value={formatCurrencyPrecise(owed)} detail={`${approvedUnpaid.length} inzendingen nog niet in een run`} tone={approvedUnpaid.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Betaalverzoeken" description="Handmatige bank- en USDC-Solana betaalverzoeken ingediend door clippers." />
        <DataTable
          rows={paymentRequests}
          rowKey={(payout) => payout.id}
          emptyState={<EmptyState title="Geen betaalverzoeken" description="Nieuwe opnameverzoeken van clippers verschijnen hier voordat je ze handmatig overmaakt." />}
          columns={[
            {
              key: "creator",
              header: "Clipper",
              cell: (payout) => (
                <div>
                  <p className="font-semibold text-neutral-950">
                    {payout.creatorProfile?.displayName || payout.creatorProfile?.user?.email || "-"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {payout.creatorProfile?.user?.email || "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "method",
              header: "Methode",
              cell: (payout) => (
                <Badge variant={payout.paymentMethod === "CRYPTO" ? "pending" : "neutral"}>
                  {payout.paymentMethod === "CRYPTO" ? "USDC (Solana)" : "Bankoverschrijving"}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Bedrag",
              align: "right",
              cell: (payout) => (
                <span className="font-semibold text-neutral-950">
                  {formatCurrencyPrecise(payout.amount, payout.currency)}
                </span>
              ),
            },
            {
              key: "destination",
              header: "Bestemming",
              cell: (payout) => (
                <div className="min-w-[220px]">
                  <p className="font-mono text-xs text-neutral-950">
                    {payout.paymentMethod === "CRYPTO"
                      ? payout.walletAddress || "-"
                      : payout.bankIbanSnapshot || "-"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {payout.paymentMethod === "CRYPTO"
                      ? "USDC op Solana"
                      : payout.bankAccountNameSnapshot || "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "requested",
              header: "Aangevraagd",
              cell: (payout) => formatDate(payout.requestedAt ?? payout.createdAt),
            },
            {
              key: "status",
              header: "Status",
              cell: (payout) => (
                <Badge variant={payout.status === "processing" ? "pending" : "neutral"}>
                  {titleCaseEnum(payout.status)}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Acties",
              cell: (payout) => (
                <PaymentRequestActions
                  id={payout.id}
                  method={payout.paymentMethod}
                  iban={payout.bankIbanSnapshot}
                  accountName={payout.bankAccountNameSnapshot}
                  walletAddress={payout.walletAddress}
                />
              ),
            },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Uitbetalingsrun maken" description="Groepeer goedgekeurd onbetaald werk in een periodegebonden uitbetalingsrun." />
        <PayoutRunForm />
      </section>

      <section>
        <SectionHeader title="Uitbetalingsruns" description="Wekelijkse of periodegebonden gegroepeerde uitbetalingsruns." />
        <DataTable
          rows={runs}
          rowKey={(run) => run.id}
          emptyState={<EmptyState title="Nog geen uitbetalingsruns" description="Maak een run van goedgekeurd onbetaald werk. De API kan items per creator en periode groeperen." />}
          columns={[
            {
              key: "run",
              header: "Run",
              cell: (run) => (
                <div>
                  <p className="font-semibold text-neutral-950">{run.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatDate(run.periodStart)} - {formatDate(run.periodEnd)}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", cell: (run) => <Badge variant={run.status === "CONFIRMED" ? "verified" : run.status === "DRAFT" ? "neutral" : "pending"}>{titleCaseEnum(run.status)}</Badge> },
            { key: "items", header: "Items", align: "right", cell: (run) => run.items.length },
            { key: "gross", header: "Bruto", align: "right", cell: (run) => formatCurrencyPrecise(run.totalGross, run.currency) },
            { key: "bonus", header: "Bonus", align: "right", cell: (run) => formatCurrencyPrecise(run.totalBonus, run.currency) },
            { key: "deduction", header: "Inhoudingen", align: "right", cell: (run) => formatCurrencyPrecise(run.totalDeduction, run.currency) },
            { key: "net", header: "Net", align: "right", cell: (run) => <span className="font-semibold text-neutral-950">{formatCurrencyPrecise(run.totalNet, run.currency)}</span> },
            { key: "proof", header: "Bewijs", cell: (run) => run.proofUrl ? <a href={run.proofUrl} className="font-semibold underline underline-offset-2">Openen</a> : "-" },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Details" description="Open bronmateriaal of legacy-records alleen wanneer uitbetalingswerk daarom vraagt." />
        <div className="grid grid-cols-1 gap-3">
          <div>
            <SectionHeader title="Goedgekeurd onbetaald werk" description="Bronmateriaal voor de volgende uitbetalingsrun." />
            <DataTable
              rows={approvedUnpaid}
              rowKey={(submission) => submission.id}
              emptyState={<EmptyState title="Geen goedgekeurde onbetaalde inzendingen" description="Al het goedgekeurde werk zit al in een uitbetalingsrun of er is geen goedgekeurd werk." />}
              columns={[
                { key: "campaign", header: "Campagne", cell: (submission) => submission.campaign.name },
                { key: "creator", header: "Creator", cell: (submission) => submission.creator.email },
                { key: "amount", header: "Bedrag", align: "right", cell: (submission) => formatCurrencyPrecise(submission.earnedAmount, "EUR") },
              ]}
            />
          </div>

          <div>
            <SectionHeader title="Legacy-uitbetalingsrecords" description="Bestaande uitbetalingshistorie, betaalbewijs, bestemmingen, timestamps en ID's voor audit en support." />
            <DataTable
              rows={payouts}
              rowKey={(payout) => payout.id}
              emptyState={<EmptyState title="Nog geen uitbetalingen" description="Creatoruitbetalingsrecords verschijnen hier na verwerking." />}
              columns={[
                {
                  key: "creator",
                  header: "Creator",
                  cell: (payout) => (
                    <div className="min-w-[170px]">
                      <p className="font-semibold text-neutral-950">
                        {payout.creatorProfile?.displayName || payout.creatorProfile?.user?.email || "-"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {payout.creatorProfile?.user?.email || "-"}
                      </p>
                    </div>
                  ),
                },
                { key: "amount", header: "Bedrag", align: "right", cell: (payout) => formatCurrencyPrecise(payout.amount, payout.currency) },
                { key: "status", header: "Status", cell: (payout) => <Badge variant={payout.status === "confirmed" || payout.status === "sent" ? "verified" : payout.status === "failed" ? "failed" : "pending"}>{titleCaseEnum(payout.status)}</Badge> },
                { key: "method", header: "Methode", cell: (payout) => payout.paymentMethod || "-" },
                { key: "evidence", header: "Betaalbewijs", cell: (payout) => <PayoutEvidence payout={payout} /> },
                { key: "destination", header: "Bestemming", cell: (payout) => <PayoutDestination payout={payout} /> },
                { key: "timeline", header: "Tijdlijn", cell: (payout) => <PayoutTimeline payout={payout} /> },
                { key: "reason", header: "Interne reden", cell: (payout) => <LongValue value={payout.rejectionReason} empty="Geen interne reden" /> },
                { key: "ids", header: "IDs", cell: (payout) => <PayoutIds payout={payout} /> },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

type LegacyPayoutRecord = {
  id: string;
  status: string;
  paymentMethod: string | null;
  walletAddress: string | null;
  txHash: string | null;
  bankIbanSnapshot: string | null;
  bankAccountNameSnapshot: string | null;
  bankReference: string | null;
  coinbaseChargeId: string | null;
  stripeTransferId: string | null;
  payoutRunId: string | null;
  payoutRunItemId: string | null;
  applicationId: string | null;
  applicationIds: string[];
  verifiedViews: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  requestedAt: Date | null;
  initiatedAt: Date | null;
  confirmedAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function PayoutEvidence({ payout }: { payout: LegacyPayoutRecord }) {
  const issue = payoutProofIssue(payout);

  return (
    <div className="min-w-[240px] space-y-2">
      {issue ? <Badge variant="failed">{issue}</Badge> : <Badge variant="neutral">Bewijs opgeslagen</Badge>}
      <AuditLine label="Bankreferentie" value={payout.bankReference} />
      <AuditLine label="Tx-hash" value={payout.txHash} />
      <AuditLine label="Stripe" value={payout.stripeTransferId} />
      <AuditLine label="Coinbase" value={payout.coinbaseChargeId} />
    </div>
  );
}

function PayoutDestination({ payout }: { payout: LegacyPayoutRecord }) {
  return (
    <div className="min-w-[240px] space-y-1">
      <AuditLine label="IBAN" value={payout.bankIbanSnapshot} />
      <AuditLine label="Naam" value={payout.bankAccountNameSnapshot} />
      <AuditLine label="Wallet" value={payout.walletAddress} />
    </div>
  );
}

function PayoutTimeline({ payout }: { payout: LegacyPayoutRecord }) {
  return (
    <div className="min-w-[230px] space-y-1">
      <AuditLine label="Aangevraagd" value={formatDateTime(payout.requestedAt)} />
      <AuditLine label="Gestart" value={formatDateTime(payout.initiatedAt)} />
      <AuditLine label="Bevestigd" value={formatDateTime(payout.confirmedAt)} />
      <AuditLine label="Verwerkt" value={formatDateTime(payout.processedAt)} />
      <AuditLine label="Aangemaakt" value={formatDateTime(payout.createdAt)} />
      <AuditLine label="Bijgewerkt" value={formatDateTime(payout.updatedAt)} />
    </div>
  );
}

function PayoutIds({ payout }: { payout: LegacyPayoutRecord }) {
  const applicationIds = payout.applicationIds.length > 0 ? payout.applicationIds.join(", ") : null;

  return (
    <div className="min-w-[260px] space-y-1">
      <AuditLine label="Uitbetaling" value={payout.id} />
      <AuditLine label="Run" value={payout.payoutRunId} />
      <AuditLine label="Run-item" value={payout.payoutRunItemId} />
      <AuditLine label="Aanmelding" value={payout.applicationId} />
      <AuditLine label="Aanmeldingen" value={applicationIds} />
      <AuditLine label="Views" value={payout.verifiedViews == null ? null : String(payout.verifiedViews)} />
      <AuditLine label="Periode" value={formatPeriod(payout.periodStart, payout.periodEnd)} />
    </div>
  );
}

function AuditLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const displayValue = value?.trim() || "-";

  return (
    <p className="grid grid-cols-[78px_minmax(0,1fr)] gap-2 text-xs text-neutral-600">
      <span className="font-medium text-neutral-500">{label}</span>
      <span className="break-all font-mono text-neutral-950" title={displayValue === "-" ? undefined : displayValue}>
        {displayValue}
      </span>
    </p>
  );
}

function LongValue({ value, empty }: { value: string | null | undefined; empty: string }) {
  return (
    <div className="max-w-[260px] text-xs text-neutral-700">
      {value ? <p className="whitespace-pre-wrap break-words">{value}</p> : <span className="text-neutral-400">{empty}</span>}
    </div>
  );
}

function payoutProofIssue(payout: LegacyPayoutRecord) {
  if (!PAID_LIKE_STATUSES.has(payout.status)) return null;

  if (!payout.paymentMethod) return "Betaald zonder methode";
  if (payout.paymentMethod === "BANK_TRANSFER" && !payout.bankReference) return "Betaald zonder bankreferentie";
  if (payout.paymentMethod === "CRYPTO" && !payout.txHash) return "Betaald zonder tx-hash";
  if (payout.paymentMethod === "STRIPE" && !payout.stripeTransferId) return "Betaald zonder Stripe-referentie";

  return null;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleString("nl-NL", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriod(start: Date | null, end: Date | null) {
  if (!start && !end) return null;

  return `${formatDate(start)} - ${formatDate(end)}`;
}
