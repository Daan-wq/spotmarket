"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatCurrency } from "@/lib/i18n-format";
import { formatIban, isValidIban, maskIban, normalizeIban } from "@/lib/validation/iban";
import { useLocale, useTranslations } from "next-intl";

const MIN_WITHDRAW = 20;

type AmountParseResult =
  | { amount: number }
  | { error: "amountRequired" | "amountCentError" };

export function WithdrawTab() {
  const locale = useLocale();
  const t = useTranslations("creator.payouts.withdraw");
  const sharedT = useTranslations("creator.shared");

  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [profit, setProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  const [savedIban, setSavedIban] = useState<string | null>(null);
  const [savedAccountName, setSavedAccountName] = useState<string | null>(null);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);

  const [showWithdrawPanel, setShowWithdrawPanel] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
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
        const availableBalance = data.availableBalance ?? data.balance ?? 0;
        setBalance(availableBalance);
        setPendingBalance(data.pendingBalance ?? 0);
        setProfit(data.profit ?? 0);
        setSavedIban(data.payoutIban ?? null);
        setSavedAccountName(data.payoutAccountName ?? null);
        setAmountInput(formatAmountInput(availableBalance));
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

  function handleWithdrawPanelToggle() {
    setError(null);
    setSuccess(null);
    setAmountError(null);
    setBankError(null);

    if (showWithdrawPanel) {
      setShowWithdrawPanel(false);
      setIsEditingBank(false);
      return;
    }

    setAmountInput(formatAmountInput(balance));
    if (!savedIban || !savedAccountName) {
      startEditing();
    } else {
      setIsEditingBank(false);
    }
    setShowWithdrawPanel(true);
  }

  async function saveBankDetails() {
    const iban = normalizeIban(ibanInput);
    const accountName = accountNameInput.replace(/\s+/g, " ").trim();

    if (!isValidIban(iban)) {
      setBankError(t("ibanError"));
      return false;
    }
    if (accountName.length < 2) {
      setBankError(t("accountNameError"));
      return false;
    }

    setBankError(null);
    const res = await fetch("/api/wallet/payout-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iban, accountName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBankError(data.error || t("saveFailed"));
      return false;
    }

    setSavedIban(data.payoutIban);
    setSavedAccountName(data.payoutAccountName);
    setIsEditingBank(false);
    return true;
  }

  async function handleWithdraw(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(amountInput);

    if ("error" in parsed) {
      setAmountError(t(parsed.error));
      return;
    }
    if (parsed.amount < MIN_WITHDRAW) {
      setAmountError(t("amountMinError", { amount: formatCurrency(MIN_WITHDRAW, locale) }));
      return;
    }
    if (parsed.amount > roundToCents(balance)) {
      setAmountError(t("amountMaxError", { amount: formatCurrency(balance, locale) }));
      return;
    }

    setSubmitting(true);
    setAmountError(null);
    setError(null);
    setSuccess(null);

    try {
      if (!savedIban || !savedAccountName || isEditingBank) {
        const bankSaved = await saveBankDetails();
        if (!bankSaved) return;
      }

      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed.amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("withdrawalFailed"));
        return;
      }

      setSuccess(t("success", { amount: formatCurrency(data.withdrawal.amount, locale) }));
      setShowWithdrawPanel(false);
      setIsEditingBank(false);
      await fetchWallet();
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
  const showBankInput = !savedIban || !savedAccountName || isEditingBank;
  const parsedPreview = parseAmountInput(amountInput);
  const previewAmount = "amount" in parsedPreview ? parsedPreview.amount : null;

  return (
    <div className="space-y-4">
      {error ? <AlertBanner tone="error" title={error} /> : null}
      {success ? <AlertBanner tone="success" title={success} /> : null}

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <BalanceCard label={t("balance")} value={formatCurrency(balance, locale)} />
        <BalanceCard label={t("pendingBalance")} value={formatCurrency(pendingBalance, locale)} />
        <BalanceCard label={t("profit")} value={formatCurrency(profit, locale)} />
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-neutral-400">
              {t("availableToWithdraw")}
            </p>
            <p className="mt-1 text-4xl font-semibold text-neutral-950">
              {formatCurrency(balance, locale)}
            </p>
            {balance < MIN_WITHDRAW ? (
              <p className="mt-2 text-sm text-neutral-500">
                {t("moreToUnlock", { amount: formatCurrency(MIN_WITHDRAW - balance, locale) })}
              </p>
            ) : null}
          </div>
          <Button
            className="h-11 w-full rounded-xl px-5 md:w-auto"
            onClick={handleWithdrawPanelToggle}
            disabled={!canWithdraw}
            type="button"
          >
            {showWithdrawPanel ? sharedT("actions.cancel") : sharedT("actions.withdrawFunds")}
          </Button>
        </div>

        {showWithdrawPanel ? (
          <form onSubmit={handleWithdraw} className="mt-5 border-t border-neutral-200 pt-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">{t("panelTitle")}</h2>
                <label className="mt-4 block text-sm font-semibold text-neutral-950">
                  {t("amountLabel")}
                  <div className="mt-2 flex overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-neutral-400">
                    <span className="flex h-11 items-center px-3 text-sm font-semibold text-neutral-500">
                      €
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        if (amountError) setAmountError(null);
                      }}
                      placeholder={t("amountPlaceholder")}
                      className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-neutral-950 outline-none placeholder:text-neutral-400"
                    />
                    <button
                      type="button"
                      className="px-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
                      onClick={() => {
                        setAmountInput(formatAmountInput(balance));
                        setAmountError(null);
                      }}
                    >
                      {t("maxAmount")}
                    </button>
                  </div>
                </label>
                <p className="mt-2 text-xs text-neutral-500">
                  {t("amountHint", {
                    min: formatCurrency(MIN_WITHDRAW, locale),
                    max: formatCurrency(balance, locale),
                  })}
                </p>
                {amountError ? <p className="mt-2 text-xs text-red-600">{amountError}</p> : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-neutral-950">{t("bankPanelTitle")}</h2>
                  {!showBankInput ? (
                    <Button type="button" variant="ghost" size="sm" onClick={startEditing}>
                      {sharedT("actions.edit")}
                    </Button>
                  ) : null}
                </div>

                {showBankInput ? (
                  <div className="mt-4 grid gap-3">
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
                        autoComplete="name"
                        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
                      />
                    </label>
                    {bankError ? <p className="text-xs text-red-600">{bankError}</p> : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase text-neutral-400">
                      {t("savedBankDetails")}
                    </p>
                    <p className="mt-1 truncate font-mono text-sm text-neutral-950" title={savedIban ?? undefined}>
                      {maskIban(savedIban ?? "")}
                    </p>
                    <p className="mt-1 truncate text-sm text-neutral-600">
                      {savedAccountName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {previewAmount ? (
              <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                {t.rich("confirmText", {
                  amount: () => <strong>{formatCurrency(previewAmount, locale)}</strong>,
                  iban: () => (
                    <span
                      className="font-mono text-neutral-950"
                      title={showBankInput ? normalizeIban(ibanInput) : savedIban ?? undefined}
                    >
                      {showBankInput ? formatIban(ibanInput) : maskIban(savedIban ?? "")}
                    </span>
                  ),
                  accountName: () => <strong>{showBankInput ? accountNameInput : savedAccountName}</strong>,
                })}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleWithdrawPanelToggle}
                disabled={submitting}
              >
                {sharedT("actions.cancel")}
              </Button>
              <Button type="submit" isPending={submitting} disabled={!canWithdraw}>
                {t("panelTitle")}
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3">
      <p className="truncate text-[10px] font-semibold uppercase text-neutral-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[clamp(0.95rem,3.6vw,1.25rem)] font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function parseAmountInput(value: string): AmountParseResult {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return { error: "amountRequired" };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { error: "amountCentError" };

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amountRequired" };
  return { amount: roundToCents(amount) };
}

function formatAmountInput(amount: number) {
  return amount > 0 ? roundToCents(amount).toFixed(2) : "";
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}
