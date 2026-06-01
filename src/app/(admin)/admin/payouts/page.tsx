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
        eyebrow="Money Ops"
        title="Payouts"
        description="Payout runs group approved unpaid work by creator and period, support bonuses and deductions, export CSV, proof, and paid status."
        actions={[
          { label: "New payout run", href: "/admin/payouts?new=1", icon: Plus },
          { label: "Export CSV", href: "/api/admin/payout-runs?format=csv", icon: Download },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Payment requests" value={String(paymentRequests.length)} detail="Manual transfers waiting" tone={paymentRequests.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Open runs" value={String(openRuns.length)} detail="Draft, finalized, or processing" />
        <StatCard label="Run net total" value={formatCurrencyPrecise(runNet)} detail="All payout run net amounts" />
        <StatCard label="Approved unpaid" value={formatCurrencyPrecise(owed)} detail={`${approvedUnpaid.length} submissions not in a run`} tone={approvedUnpaid.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Payment requests" description="Manual bank and USDC-Solana payout requests submitted by clippers." />
        <DataTable
          rows={paymentRequests}
          rowKey={(payout) => payout.id}
          emptyState={<EmptyState title="No payment requests" description="New clipper withdrawal requests will appear here before you transfer them manually." />}
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
              header: "Method",
              cell: (payout) => (
                <Badge variant={payout.paymentMethod === "CRYPTO" ? "pending" : "neutral"}>
                  {payout.paymentMethod === "CRYPTO" ? "USDC (Solana)" : "Bank transfer"}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (payout) => (
                <span className="font-semibold text-neutral-950">
                  {formatCurrencyPrecise(payout.amount, payout.currency)}
                </span>
              ),
            },
            {
              key: "destination",
              header: "Destination",
              cell: (payout) => (
                <div className="min-w-[220px]">
                  <p className="font-mono text-xs text-neutral-950">
                    {payout.paymentMethod === "CRYPTO"
                      ? payout.walletAddress || "-"
                      : payout.bankIbanSnapshot || "-"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {payout.paymentMethod === "CRYPTO"
                      ? "USDC on Solana"
                      : payout.bankAccountNameSnapshot || "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "requested",
              header: "Requested",
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
              header: "Actions",
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
        <SectionHeader title="Create payout run" description="Group approved unpaid work into a period-based payout run." />
        <PayoutRunForm />
      </section>

      <section>
        <SectionHeader title="Payout Runs" description="Weekly or period-based grouped payout runs." />
        <DataTable
          rows={runs}
          rowKey={(run) => run.id}
          emptyState={<EmptyState title="No payout runs yet" description="Create a run from approved unpaid work. The API can group items by creator and period." />}
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
            { key: "gross", header: "Gross", align: "right", cell: (run) => formatCurrencyPrecise(run.totalGross, run.currency) },
            { key: "bonus", header: "Bonus", align: "right", cell: (run) => formatCurrencyPrecise(run.totalBonus, run.currency) },
            { key: "deduction", header: "Deductions", align: "right", cell: (run) => formatCurrencyPrecise(run.totalDeduction, run.currency) },
            { key: "net", header: "Net", align: "right", cell: (run) => <span className="font-semibold text-neutral-950">{formatCurrencyPrecise(run.totalNet, run.currency)}</span> },
            { key: "proof", header: "Proof", cell: (run) => run.proofUrl ? <a href={run.proofUrl} className="font-semibold underline underline-offset-2">Open</a> : "-" },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Details" description="Open source material or legacy records only when payout work calls for it." />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <SectionHeader title="Approved unpaid work" description="Source material for the next payout run." />
            <DataTable
              rows={approvedUnpaid}
              rowKey={(submission) => submission.id}
              emptyState={<EmptyState title="No approved unpaid submissions" description="All approved work is either already in a payout run or no approved work exists." />}
              columns={[
                { key: "campaign", header: "Campaign", cell: (submission) => submission.campaign.name },
                { key: "creator", header: "Creator", cell: (submission) => submission.creator.email },
                { key: "amount", header: "Amount", align: "right", cell: (submission) => formatCurrencyPrecise(submission.earnedAmount, "EUR") },
              ]}
            />
          </div>

          <div>
            <SectionHeader title="Legacy payout records" description="Existing payout history remains available for audit and support." />
            <DataTable
              rows={payouts}
              rowKey={(payout) => payout.id}
              emptyState={<EmptyState title="No payouts yet" description="Creator payout records will appear here after processing." />}
              columns={[
                {
                  key: "record",
                  header: "Record",
                  className: "min-w-[190px]",
                  cell: (payout) => (
                    <FieldList
                      items={[
                        { label: "Payout", value: payout.id, mono: true },
                        { label: "Run", value: payout.payoutRunId, mono: true },
                        { label: "Run item", value: payout.payoutRunItemId, mono: true },
                        { label: "Application", value: payout.applicationId, mono: true },
                      ]}
                    />
                  ),
                },
                {
                  key: "creator",
                  header: "Creator",
                  className: "min-w-[190px]",
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
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  className: "min-w-[130px]",
                  cell: (payout) => (
                    <FieldList
                      align="right"
                      items={[
                        { label: "Amount", value: formatCurrencyPrecise(payout.amount, payout.currency), strong: true },
                        { label: "Currency", value: payout.currency },
                        { label: "Type", value: titleCaseEnum(payout.type) },
                      ]}
                    />
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  className: "min-w-[150px]",
                  cell: (payout) => (
                    <div className="space-y-2">
                      <Badge variant={payout.status === "confirmed" || payout.status === "sent" ? "verified" : payout.status === "failed" ? "failed" : "pending"}>
                        {titleCaseEnum(payout.status)}
                      </Badge>
                      <ProofBadge payout={payout} />
                    </div>
                  ),
                },
                {
                  key: "method",
                  header: "Method & destination",
                  className: "min-w-[260px]",
                  cell: (payout) => (
                    <FieldList
                      items={[
                        { label: "Method", value: payout.paymentMethod || "-" },
                        {
                          label: payout.paymentMethod === "CRYPTO" ? "Wallet" : "IBAN",
                          value: payout.paymentMethod === "CRYPTO" ? payout.walletAddress : payout.bankIbanSnapshot,
                          mono: true,
                        },
                        {
                          label: payout.paymentMethod === "CRYPTO" ? "Network" : "Account",
                          value: payout.paymentMethod === "CRYPTO" ? "USDC on Solana" : payout.bankAccountNameSnapshot,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "proof",
                  header: "Payment evidence",
                  className: "min-w-[280px]",
                  cell: (payout) => (
                    <FieldList
                      items={[
                        { label: "Bank ref/note", value: payout.bankReference, mono: true, warn: isWeakBankReference(payout.bankReference) },
                        { label: "Tx hash", value: payout.txHash, mono: true },
                        { label: "Stripe transfer", value: payout.stripeTransferId, mono: true },
                        { label: "Coinbase charge", value: payout.coinbaseChargeId, mono: true },
                        { label: "Internal reason", value: payout.rejectionReason },
                      ]}
                    />
                  ),
                },
                {
                  key: "timeline",
                  header: "Timeline",
                  className: "min-w-[240px]",
                  cell: (payout) => (
                    <FieldList
                      items={[
                        { label: "Requested", value: formatDate(payout.requestedAt ?? payout.createdAt) },
                        { label: "Initiated", value: formatDate(payout.initiatedAt) },
                        { label: "Confirmed", value: formatDate(payout.confirmedAt) },
                        { label: "Processed", value: formatDate(payout.processedAt) },
                        { label: "Created", value: formatDate(payout.createdAt) },
                        { label: "Updated", value: formatDate(payout.updatedAt) },
                      ]}
                    />
                  ),
                },
                {
                  key: "scope",
                  header: "Scope",
                  className: "min-w-[210px]",
                  cell: (payout) => (
                    <FieldList
                      items={[
                        { label: "Period start", value: formatDate(payout.periodStart) },
                        { label: "Period end", value: formatDate(payout.periodEnd) },
                        { label: "Verified views", value: payout.verifiedViews?.toLocaleString() },
                        { label: "Application IDs", value: payout.applicationIds.length > 0 ? payout.applicationIds.join(", ") : null, mono: true },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldList({
  items,
  align = "left",
}: {
  items: Array<{
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    strong?: boolean;
    warn?: boolean;
  }>;
  align?: "left" | "right";
}) {
  return (
    <dl className={align === "right" ? "space-y-1 text-right" : "space-y-1"}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {item.label}
          </dt>
          <dd
            className={[
              "mt-0.5 break-words text-xs",
              item.mono ? "font-mono" : "",
              item.strong ? "font-semibold text-neutral-950" : "text-neutral-700",
              item.warn ? "text-amber-700" : "",
            ].filter(Boolean).join(" ")}
          >
            {isPresent(item.value) ? item.value : "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProofBadge({
  payout,
}: {
  payout: {
    status: string;
    paymentMethod: string | null;
    bankReference: string | null;
    txHash: string | null;
    stripeTransferId: string | null;
    coinbaseChargeId: string | null;
  };
}) {
  if (!["confirmed", "sent"].includes(payout.status)) return null;

  if (payout.paymentMethod === "BANK_TRANSFER") {
    if (!payout.bankReference) return <Badge variant="failed">Missing bank note</Badge>;
    if (isWeakBankReference(payout.bankReference)) return <Badge variant="pending">Weak bank note</Badge>;
    return <Badge variant="verified">Bank note present</Badge>;
  }

  if (payout.paymentMethod === "CRYPTO") {
    return payout.txHash ? <Badge variant="verified">Tx hash present</Badge> : <Badge variant="failed">Missing tx hash</Badge>;
  }

  if (payout.stripeTransferId || payout.coinbaseChargeId) {
    return <Badge variant="verified">Provider proof present</Badge>;
  }

  return <Badge variant="pending">Manual proof unknown</Badge>;
}

function isWeakBankReference(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  return ["bank", "paid", "done", "ok", "yes", "ja", "sent", "transfer"].includes(normalized);
}

function isPresent(value: React.ReactNode) {
  return value !== null && value !== undefined && value !== "";
}
