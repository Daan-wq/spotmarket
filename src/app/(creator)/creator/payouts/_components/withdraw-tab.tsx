"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/animate-ui/primitives/radix/tooltip";
import { isValidTronAddress, maskTronAddress } from "@/lib/validation/tron";
import { formatCurrency, formatShortDate } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  txHash: string | null;
  createdAt: string;
}

const MIN_WITHDRAW = 50;

export function WithdrawTab() {
  const locale = useLocale();
  const t = useTranslations("creator.payouts.withdraw");
  const sharedT = useTranslations("creator.shared");
  const statusT = useTranslations("creator.shared.statuses.payout");
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setWithdrawals(data.withdrawals);
        setSavedAddress(data.tronsAddress ?? null);
      }
    } catch {
      // The section falls back to its loading or empty state.
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    setAddressInput(savedAddress ?? "");
    setAddressError(null);
    setIsEditingAddress(true);
  }

  function cancelEditing() {
    setAddressInput("");
    setAddressError(null);
    setIsEditingAddress(false);
  }

  async function handleSaveAddress(e: FormEvent) {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!isValidTronAddress(trimmed)) {
      setAddressError(
        t("addressError"),
      );
      return;
    }

    setAddressSaving(true);
    setAddressError(null);
    try {
      const res = await fetch("/api/wallet/payout-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tronsAddress: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddressError(data.error || t("saveFailed"));
        return;
      }
      setSavedAddress(data.tronsAddress);
      setIsEditingAddress(false);
      setAddressInput("");
    } catch {
      setAddressError(t("saveError"));
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleWithdraw(e: FormEvent) {
    e.preventDefault();
    if (!savedAddress) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: savedAddress }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("withdrawalFailed"));
        return;
      }

      setSuccess(
        t("success", { amount: formatCurrency(data.withdrawal.amount, locale) }),
      );
      setShowWithdraw(false);
      fetchWallet();
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  }

  const canWithdraw = balance >= MIN_WITHDRAW && Boolean(savedAddress);
  const showInput = !savedAddress || isEditingAddress;

  return (
    <div className="space-y-5">
      {error ? <AlertBanner tone="error" title={error} /> : null}
      {success ? <AlertBanner tone="success" title={success} /> : null}

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-neutral-950">
            {t("methodTitle")}
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t("methodInfo")}
                  className="inline-flex items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <div className="max-w-xs rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs leading-relaxed text-neutral-900 shadow-lg">
                  {t("tooltip")}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          {t("methodDescription")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="active">USDT TRC-20</Badge>
          <span className="text-xs text-neutral-500">
            {t("minimumWithdrawal", {
              amount: formatCurrency(MIN_WITHDRAW, locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }),
            })}
          </span>
        </div>

        {showInput ? (
          <form onSubmit={handleSaveAddress} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("addressLabel")}
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value.trim());
                if (addressError) setAddressError(null);
              }}
              placeholder="T..."
              required
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 font-mono text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
            />
            {addressError ? (
              <p className="text-xs text-red-600">{addressError}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                isPending={addressSaving}
                disabled={!addressInput}
                className="h-10 rounded-xl px-4"
              >
                {savedAddress ? sharedT("actions.saveChanges") : sharedT("actions.saveAddress")}
              </Button>
              {savedAddress && isEditingAddress ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-xl px-4"
                  onClick={cancelEditing}
                  disabled={addressSaving}
                >
                  {sharedT("actions.cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                {t("savedAddress")}
              </p>
              <p
                className="mt-0.5 truncate font-mono text-sm text-neutral-950"
                title={savedAddress ?? undefined}
              >
                {maskTronAddress(savedAddress ?? "")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl px-3 text-sm"
              onClick={startEditing}
            >
              {sharedT("actions.edit")}
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {t("availableToWithdraw")}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-normal text-neutral-950">
              {formatCurrency(balance, locale)}
            </p>
          </div>
          {balance < MIN_WITHDRAW ? (
            <span className="text-sm text-neutral-500">
              {t("moreToUnlock", { amount: formatCurrency(MIN_WITHDRAW - balance, locale) })}
            </span>
          ) : !savedAddress ? (
            <span className="text-sm text-neutral-500">
              {t("saveToUnlock")}
            </span>
          ) : (
            <Button
              className="h-11 rounded-xl px-5"
              onClick={() => setShowWithdraw((value) => !value)}
              disabled={!canWithdraw}
            >
              {showWithdraw ? sharedT("actions.cancel") : sharedT("actions.requestWithdrawal")}
            </Button>
          )}
        </div>

        {showWithdraw && savedAddress ? (
          <form onSubmit={handleWithdraw} className="mt-5 space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              {t.rich("confirmText", {
                amount: () => <strong>{formatCurrency(balance, locale)}</strong>,
                address: () => (
                  <span
                    className="font-mono text-neutral-950"
                    title={savedAddress}
                  >
                    {maskTronAddress(savedAddress)}
                  </span>
                ),
              })}
            </div>
            <Button
              type="submit"
              isPending={submitting}
              className="h-11 rounded-xl px-5"
            >
              {sharedT("actions.confirmWithdrawal")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-950">
            {t("recentWithdrawals")}
          </h2>
        </div>
        {withdrawals.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={t("noWithdrawalsTitle")}
              description={t("noWithdrawalsDescription")}
            />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-neutral-500">
                        {formatShortDate(withdrawal.createdAt, locale)}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-neutral-950">
                        {formatCurrency(withdrawal.amount, locale)}
                      </p>
                    </div>
                    <Badge variant={withdrawalBadge(withdrawal.status)}>
                      {statusT(withdrawal.status.toLowerCase())}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="text-xs text-neutral-500">{t("txHash")}</p>
                    <p className="mt-1 font-medium text-neutral-950">
                      {withdrawal.txHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${withdrawal.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          {withdrawal.txHash.slice(0, 16)}...
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.date")}</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.amount")}</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.status")}</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{t("txHash")}</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 text-neutral-950">
                      {formatShortDate(withdrawal.createdAt, locale)}
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-950">
                      {formatCurrency(withdrawal.amount, locale)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={withdrawalBadge(withdrawal.status)}>{statusT(withdrawal.status.toLowerCase())}</Badge>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {withdrawal.txHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${withdrawal.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-neutral-950"
                        >
                          {withdrawal.txHash.slice(0, 12)}...
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function withdrawalBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "sent" || s === "paid") return "paid" as const;
  if (s === "pending" || s === "processing") return "pending" as const;
  if (s === "failed" || s === "rejected") return "failed" as const;
  return "neutral" as const;
}
