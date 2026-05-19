"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatShortDate } from "@/lib/i18n-format";
import { formatIban, isValidIban, maskIban, normalizeIban } from "@/lib/validation/iban";
import { useLocale, useTranslations } from "next-intl";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  currency: string;
  paymentMethod: string | null;
  bankIban: string | null;
  bankAccountName: string | null;
  bankReference: string | null;
  createdAt: string;
}

const MIN_WITHDRAW = 20;

export function WithdrawTab() {
  const locale = useLocale();
  const t = useTranslations("creator.payouts.withdraw");
  const sharedT = useTranslations("creator.shared");
  const statusT = useTranslations("creator.shared.statuses.payout");

  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [profit, setProfit] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const [savedIban, setSavedIban] = useState<string | null>(null);
  const [savedAccountName, setSavedAccountName] = useState<string | null>(null);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
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
        setBalance(data.availableBalance ?? data.balance ?? 0);
        setPendingBalance(data.pendingBalance ?? 0);
        setProfit(data.profit ?? 0);
        setWithdrawals(data.withdrawals ?? []);
        setSavedIban(data.payoutIban ?? null);
        setSavedAccountName(data.payoutAccountName ?? null);
      }
    } catch {
      // The section falls back to its loading or empty state.
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    setIbanInput(savedIban ? formatIban(savedIban) : "");
    setAccountNameInput(savedAccountName ?? "");
    setBankError(null);
    setIsEditingBank(true);
  }

  function cancelEditing() {
    setIbanInput("");
    setAccountNameInput("");
    setBankError(null);
    setIsEditingBank(false);
  }

  async function handleSaveBank(e: FormEvent) {
    e.preventDefault();
    const iban = normalizeIban(ibanInput);
    const accountName = accountNameInput.replace(/\s+/g, " ").trim();

    if (!isValidIban(iban)) {
      setBankError(t("ibanError"));
      return;
    }
    if (accountName.length < 2) {
      setBankError(t("accountNameError"));
      return;
    }

    setBankSaving(true);
    setBankError(null);
    try {
      const res = await fetch("/api/wallet/payout-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban, accountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBankError(data.error || t("saveFailed"));
        return;
      }
      setSavedIban(data.payoutIban);
      setSavedAccountName(data.payoutAccountName);
      setIsEditingBank(false);
      setIbanInput("");
      setAccountNameInput("");
      setSuccess(t("bankSaved"));
    } catch {
      setBankError(t("saveError"));
    } finally {
      setBankSaving(false);
    }
  }

  function handleWithdrawClick() {
    setError(null);
    setSuccess(null);
    if (!savedIban || !savedAccountName) {
      setError(t("bankRequired"));
      startEditing();
      return;
    }
    setShowConfirm((value) => !value);
  }

  async function handleWithdraw(e: FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("withdrawalFailed"));
        return;
      }

      setSuccess(t("success", { amount: formatCurrency(data.withdrawal.amount, locale) }));
      setShowConfirm(false);
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

  const canWithdraw = balance >= MIN_WITHDRAW;
  const showInput = !savedIban || !savedAccountName || isEditingBank;

  return (
    <div className="space-y-5">
      {error ? <AlertBanner tone="error" title={error} /> : null}
      {success ? <AlertBanner tone="success" title={success} /> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <BalanceCard label={t("balance")} value={formatCurrency(balance, locale)} />
        <BalanceCard label={t("pendingBalance")} value={formatCurrency(pendingBalance, locale)} />
        <BalanceCard label={t("profit")} value={formatCurrency(profit, locale)} />
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{t("methodTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          {t("methodDescription")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="active">EUR</Badge>
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
          <form onSubmit={handleSaveBank} className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("ibanLabel")}
              <input
                type="text"
                value={ibanInput}
                onChange={(e) => {
                  setIbanInput(formatIban(e.target.value));
                  if (bankError) setBankError(null);
                }}
                placeholder={t("ibanPlaceholder")}
                required
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 font-mono text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
            <label className="block text-sm font-semibold text-neutral-950">
              {t("accountNameLabel")}
              <input
                type="text"
                value={accountNameInput}
                onChange={(e) => {
                  setAccountNameInput(e.target.value);
                  if (bankError) setBankError(null);
                }}
                placeholder={t("accountNamePlaceholder")}
                required
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
            {bankError ? (
              <p className="text-xs text-red-600 md:col-span-2">{bankError}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button
                type="submit"
                isPending={bankSaving}
                disabled={!ibanInput || !accountNameInput}
                className="h-10 rounded-xl px-4"
              >
                {savedIban ? sharedT("actions.saveChanges") : t("saveBankDetails")}
              </Button>
              {savedIban && isEditingBank ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-xl px-4"
                  onClick={cancelEditing}
                  disabled={bankSaving}
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
                {t("savedBankDetails")}
              </p>
              <p className="mt-0.5 truncate font-mono text-sm text-neutral-950" title={savedIban ?? undefined}>
                {maskIban(savedIban ?? "")}
              </p>
              <p className="mt-1 truncate text-sm text-neutral-600">
                {savedAccountName}
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
          ) : (
            <Button
              className="h-11 rounded-xl px-5"
              onClick={handleWithdrawClick}
              disabled={!canWithdraw}
            >
              {showConfirm ? sharedT("actions.cancel") : sharedT("actions.requestWithdrawal")}
            </Button>
          )}
        </div>

        {showConfirm && savedIban && savedAccountName ? (
          <form onSubmit={handleWithdraw} className="mt-5 space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              {t.rich("confirmText", {
                amount: () => <strong>{formatCurrency(balance, locale)}</strong>,
                iban: () => (
                  <span className="font-mono text-neutral-950" title={savedIban}>
                    {maskIban(savedIban)}
                  </span>
                ),
                accountName: () => <strong>{savedAccountName}</strong>,
              })}
            </div>
            <Button type="submit" isPending={submitting} className="h-11 rounded-xl px-5">
              {sharedT("actions.confirmWithdrawal")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-950">{t("recentWithdrawals")}</h2>
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
                <WithdrawalCard
                  key={withdrawal.id}
                  withdrawal={withdrawal}
                  locale={locale}
                  t={t}
                  statusLabel={statusT(withdrawal.status.toLowerCase())}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.date")}</th>
                    <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.amount")}</th>
                    <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{sharedT("labels.status")}</th>
                    <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">{t("bankReference")}</th>
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
                        <Badge variant={withdrawalBadge(withdrawal.status)}>
                          {statusT(withdrawal.status.toLowerCase())}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {withdrawal.bankReference || "-"}
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

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function WithdrawalCard({
  withdrawal,
  locale,
  t,
  statusLabel,
}: {
  withdrawal: Withdrawal;
  locale: string;
  t: (key: "bankReference") => string;
  statusLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
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
          {statusLabel}
        </Badge>
      </div>
      <div className="mt-3 text-sm">
        <p className="text-xs text-neutral-500">{t("bankReference")}</p>
        <p className="mt-1 font-medium text-neutral-950">
          {withdrawal.bankReference || "-"}
        </p>
      </div>
    </div>
  );
}

function withdrawalBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "sent" || s === "paid") return "paid" as const;
  if (s === "pending" || s === "processing") return "pending" as const;
  if (s === "failed" || s === "rejected" || s === "disputed") return "failed" as const;
  return "neutral" as const;
}
