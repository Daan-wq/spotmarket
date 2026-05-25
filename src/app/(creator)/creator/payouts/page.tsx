import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentsTabs } from "./_components/payments-tabs";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../_components/creator-journey";
import { formatCurrency, formatNumber, formatShortDate } from "@/lib/i18n-format";
import { maskIban } from "@/lib/validation/iban";
import { maskSolanaAddress } from "@/lib/validation/solana";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

type ServerT = Awaited<ReturnType<typeof getTranslations>>;

export async function generateMetadata() {
  const t = await getTranslations("creator.payouts.metadata");
  return { title: t("title") };
}

export default async function PaymentsPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.payouts");
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      payoutIban: true,
      payoutAccountName: true,
      payoutSolanaAddress: true,
    },
  });
  if (!profile) throw new Error("Creator profile not found");

  const [payouts, paymentSummary] = await Promise.all([
    prisma.payout.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    getCreatorPaymentSummary(user.id, profile.id),
  ]);

  const {
    totalEarned,
    totalPaid,
    pendingPayout,
    profit,
    availableBalance: balance,
    earningsByCampaign,
  } = paymentSummary;
  const hasPaymentMethod = Boolean(
    (profile.payoutIban && profile.payoutAccountName) ||
      profile.payoutSolanaAddress,
  );
  const overviewSlot = await OverviewTab({
    locale,
    profit,
    balance,
    pendingPayout,
    earningsByCampaign,
  });
  const historySlot = await HistoryTab({ locale, payouts });

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <PaymentsTabs
        totalEarned={totalEarned}
        totalPaid={totalPaid}
        balance={balance}
        pendingPayout={pendingPayout}
        hasPaymentMethod={hasPaymentMethod}
        overviewSlot={overviewSlot}
        historySlot={historySlot}
      />
    </div>
  );
}

interface OverviewTabProps {
  locale: Locale;
  profit: number;
  balance: number;
  pendingPayout: number;
  earningsByCampaign: Array<{
    campaignId: string;
    campaignName: string;
    totalViews: number;
    totalEarned: number;
    count: number;
  }>;
}

async function OverviewTab({
  locale,
  profit,
  balance,
  pendingPayout,
  earningsByCampaign,
}: OverviewTabProps) {
  const t = await getTranslations("creator.payouts.overview");
  const sharedT = await getTranslations("creator.shared");
  const cards = [
    { label: t("availableBalance"), value: formatCurrency(balance, locale), detail: t("readyUnlocks") },
    { label: t("pending"), value: formatCurrency(pendingPayout, locale), detail: t("requestsProgress") },
    { label: t("profit"), value: formatCurrency(profit, locale), detail: t("profitDetail") },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {cards.map((card) => (
          <SoftStat key={card.label} label={card.label} value={card.value} detail={card.detail} />
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <CreatorSectionHeader
          title={t("earningsByCampaign")}
          description={t("earningsDescription")}
        />
        {earningsByCampaign.length === 0 ? (
          <EmptyState
            title={t("noEarningsTitle")}
            description={t("noEarningsDescription")}
            primaryCta={{ label: sharedT("actions.browseCampaigns"), href: "/creator/campaigns" }}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.campaign")}</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("units.submissions")}</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.views")}</th>
                  <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.earned")}</th>
                </tr>
              </thead>
              <tbody>
                {earningsByCampaign.map((row) => (
                  <tr key={row.campaignId} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-neutral-950">{row.campaignName}</td>
                    <td className="px-5 py-3 text-neutral-600">{formatNumber(row.count, locale)}</td>
                    <td className="px-5 py-3 text-neutral-600">{formatNumber(row.totalViews, locale)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-950">
                      {formatCurrency(row.totalEarned, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {earningsByCampaign.map((row) => (
                <div
                  key={row.campaignId}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <p className="text-sm font-semibold text-neutral-950">
                    {row.campaignName}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-neutral-500">{sharedT("units.clips")}</p>
                      <p className="mt-1 font-semibold text-neutral-950">{formatNumber(row.count, locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{sharedT("labels.views")}</p>
                      <p className="mt-1 font-semibold text-neutral-950">
                        {formatNumber(row.totalViews, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{sharedT("labels.earned")}</p>
                      <p className="mt-1 font-semibold text-neutral-950">
                        {formatCurrency(row.totalEarned, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

async function HistoryTab({
  locale,
  payouts,
}: {
  locale: Locale;
  payouts: Array<{
    id: string;
    amount: { toString(): string } | number;
    type: string;
    status: string;
    paymentMethod: string | null;
    walletAddress: string | null;
    bankIbanSnapshot: string | null;
    txHash: string | null;
    createdAt: Date;
  }>;
}) {
  const t = await getTranslations("creator.payouts.history");
  const sharedT = await getTranslations("creator.shared");
  const statusT = await getTranslations("creator.shared.statuses.payout");
  const withdrawT = await getTranslations("creator.payouts.withdraw");
  if (payouts.length === 0) {
    return (
      <EmptyState
        title={t("noPayoutsTitle")}
        description={t("noPayoutsDescription")}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="space-y-3 p-4 md:hidden">
        {payouts.map((p) => (
          <PayoutHistoryCard
            key={p.id}
            locale={locale}
            payout={p}
            sharedT={sharedT}
            statusT={statusT}
            withdrawT={withdrawT}
          />
        ))}
      </div>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.date")}</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.amount")}</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.type")}</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.status")}</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.method")}</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.destination")}</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-5 py-3 text-neutral-600">
                {formatShortDate(p.createdAt, locale)}
              </td>
              <td className="px-5 py-3 font-medium text-neutral-950">
                {formatCurrency(Number(p.amount), locale)}
              </td>
              <td className="px-5 py-3 text-neutral-600">
                {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
              </td>
              <td className="px-5 py-3">
                <Badge variant={payoutBadge(p.status)}>{statusT(p.status.toLowerCase())}</Badge>
              </td>
              <td className="px-5 py-3 text-neutral-600">
                {payoutMethodLabel(p.paymentMethod, withdrawT)}
              </td>
              <td className="px-5 py-3 text-neutral-600">
                <PayoutDestination payout={p} withdrawT={withdrawT} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutHistoryCard({
  locale,
  payout,
  sharedT,
  statusT,
  withdrawT,
}: {
  locale: Locale;
  payout: {
    amount: { toString(): string } | number;
    type: string;
    status: string;
    paymentMethod: string | null;
    walletAddress: string | null;
    bankIbanSnapshot: string | null;
    txHash: string | null;
    createdAt: Date;
  };
  sharedT: ServerT;
  statusT: ServerT;
  withdrawT: ServerT;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">
            {formatShortDate(payout.createdAt, locale)}
          </p>
          <p className="mt-1 text-xl font-semibold text-neutral-950">
            {formatCurrency(Number(payout.amount), locale)}
          </p>
        </div>
        <Badge variant={payoutBadge(payout.status)}>{statusT(payout.status.toLowerCase())}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-neutral-500">{sharedT("labels.type")}</p>
          <p className="mt-1 font-medium text-neutral-950">
            {payout.type.charAt(0).toUpperCase() + payout.type.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">{sharedT("labels.method")}</p>
          <p className="mt-1 font-medium text-neutral-950">
            {payoutMethodLabel(payout.paymentMethod, withdrawT)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-neutral-500">{sharedT("labels.destination")}</p>
          <div className="mt-1 font-medium text-neutral-950">
            <PayoutDestination payout={payout} withdrawT={withdrawT} />
          </div>
        </div>
      </div>
    </article>
  );
}

function payoutMethodLabel(method: string | null, withdrawT: ServerT) {
  if (method === "CRYPTO") return withdrawT("cryptoMethod");
  if (method === "BANK_TRANSFER") return withdrawT("bankMethod");
  return method || "-";
}

function PayoutDestination({
  payout,
  withdrawT,
}: {
  payout: {
    paymentMethod: string | null;
    walletAddress: string | null;
    bankIbanSnapshot: string | null;
    txHash: string | null;
  };
  withdrawT: ServerT;
}) {
  if (payout.paymentMethod === "CRYPTO" && payout.walletAddress) {
    return (
      <div className="min-w-0">
        <p className="truncate font-mono text-xs" title={payout.walletAddress}>
          {maskSolanaAddress(payout.walletAddress)}
        </p>
        {payout.txHash ? (
          <p className="mt-1 truncate font-mono text-[11px] text-neutral-500" title={payout.txHash}>
            {withdrawT("txHash")}: {payout.txHash}
          </p>
        ) : null}
      </div>
    );
  }

  if (payout.paymentMethod === "BANK_TRANSFER" && payout.bankIbanSnapshot) {
    return (
      <span className="font-mono text-xs" title={payout.bankIbanSnapshot}>
        {maskIban(payout.bankIbanSnapshot)}
      </span>
    );
  }

  return <span>-</span>;
}


function payoutBadge(status: string) {
  if (status === "confirmed" || status === "sent") return "paid" as const;
  if (status === "processing") return "pending" as const;
  if (status === "pending") return "pending" as const;
  if (status === "failed") return "failed" as const;
  return "neutral" as const;
}
