"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/i18n-format";
import { formatIban, isValidIban, maskIban, normalizeIban } from "@/lib/validation/iban";
import {
  isValidSolanaAddress,
  maskSolanaAddress,
  normalizeSolanaAddress,
} from "@/lib/validation/solana";
import { useLocale, useTranslations } from "next-intl";

const MIN_WITHDRAW = 20;

type WithdrawalMethod = "BANK_TRANSFER" | "USDC_SOLANA";
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

  const [method, setMethod] = useState<WithdrawalMethod>("BANK_TRANSFER");
  const [savedIban, setSavedIban] = useState<string | null>(null);
  const [savedAccountName, setSavedAccountName] = useState<string | null>(null);
  const [savedSolanaAddress, setSavedSolanaAddress] = useState<string | null>(null);

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);

  const [isEditingCrypto, setIsEditingCrypto] = useState(false);
  const [solanaInput, setSolanaInput] = useState("");
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const [showWithdrawPanel, setShowWithdrawPanel] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingCryptoRequest, setPendingCryptoRequest] = useState<{
    amount: number;
    solanaAddress: string;
  } | null>(null);
  const [cryptoWarningAccepted, setCryptoWarningAccepted] = useState(false);

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
        setSavedSolanaAddress(data.payoutSolanaAddress ?? null);
        setAmountInput(formatAmountInput(availableBalance));
      }
    } catch {
      // The section falls back to its loading or empty state.
    } finally {
      setLoading(false);
    }
  }

  function startEditingBank() {
    setIbanInput(savedIban ? formatIban(savedIban) : "");
    setAccountNameInput(savedAccountName ?? "");
    setBankError(null);
    setIsEditingBank(true);
  }

  function startEditingCrypto() {
    setSolanaInput(savedSolanaAddress ?? "");
    setCryptoError(null);
    setIsEditingCrypto(true);
  }

  function selectMethod(nextMethod: WithdrawalMethod) {
    setMethod(nextMethod);
    setError(null);
    setSuccess(null);
    setAmountError(null);
    setBankError(null);
    setCryptoError(null);

    if (nextMethod === "BANK_TRANSFER") {
      if (!savedIban || !savedAccountName) startEditingBank();
      else setIsEditingBank(false);
      return;
    }

    if (!savedSolanaAddress) startEditingCrypto();
    else setIsEditingCrypto(false);
  }

  function handleWithdrawPanelToggle() {
    setError(null);
    setSuccess(null);
    setAmountError(null);
    setBankError(null);
    setCryptoError(null);
    setPendingCryptoRequest(null);
    setCryptoWarningAccepted(false);

    if (showWithdrawPanel) {
      setShowWithdrawPanel(false);
      setIsEditingBank(false);
      setIsEditingCrypto(false);
      return;
    }

    setAmountInput(formatAmountInput(balance));
    const preferredMethod =
      !savedIban && !savedAccountName && savedSolanaAddress
        ? "USDC_SOLANA"
        : "BANK_TRANSFER";
    setMethod(preferredMethod);

    if (preferredMethod === "BANK_TRANSFER") {
      if (!savedIban || !savedAccountName) startEditingBank();
      else setIsEditingBank(false);
      setIsEditingCrypto(false);
    } else {
      if (!savedSolanaAddress) startEditingCrypto();
      else setIsEditingCrypto(false);
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

  async function saveCryptoDetails() {
    const solanaAddress = normalizeSolanaAddress(solanaInput);

    if (!isValidSolanaAddress(solanaAddress)) {
      setCryptoError(t("solanaAddressError"));
      return null;
    }

    setCryptoError(null);
    const res = await fetch("/api/wallet/crypto-payout-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solanaAddress }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCryptoError(data.error || t("saveCryptoFailed"));
      return null;
    }

    setSavedSolanaAddress(data.payoutSolanaAddress);
    setIsEditingCrypto(false);
    return data.payoutSolanaAddress as string;
  }

  async function requestWithdrawal(amount: number, selectedMethod: WithdrawalMethod) {
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method: selectedMethod }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("withdrawalFailed"));
      return false;
    }

    setSuccess(t("success", { amount: formatCurrency(data.withdrawal.amount, locale) }));
    setShowWithdrawPanel(false);
    setIsEditingBank(false);
    setIsEditingCrypto(false);
    await fetchWallet();
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
      if (method === "BANK_TRANSFER") {
        if (!savedIban || !savedAccountName || isEditingBank) {
          const bankSaved = await saveBankDetails();
          if (!bankSaved) return;
        }
        await requestWithdrawal(parsed.amount, "BANK_TRANSFER");
        return;
      }

      let solanaAddress = savedSolanaAddress;
      if (!solanaAddress || isEditingCrypto) {
        solanaAddress = await saveCryptoDetails();
        if (!solanaAddress) return;
      }

      setPendingCryptoRequest({ amount: parsed.amount, solanaAddress });
      setCryptoWarningAccepted(false);
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCryptoWithdrawal() {
    if (!pendingCryptoRequest || !cryptoWarningAccepted) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const submitted = await requestWithdrawal(pendingCryptoRequest.amount, "USDC_SOLANA");
      if (submitted) {
        setPendingCryptoRequest(null);
        setCryptoWarningAccepted(false);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  function closeCryptoWarning() {
    if (submitting) return;
    setPendingCryptoRequest(null);
    setCryptoWarningAccepted(false);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  }

  const canWithdraw = balance >= MIN_WITHDRAW;
  const showBankInput = method === "BANK_TRANSFER" && (!savedIban || !savedAccountName || isEditingBank);
  const showCryptoInput = method === "USDC_SOLANA" && (!savedSolanaAddress || isEditingCrypto);
  const parsedPreview = parseAmountInput(amountInput);
  const previewAmount = "amount" in parsedPreview ? parsedPreview.amount : null;
  const destinationAddress = showCryptoInput
    ? normalizeSolanaAddress(solanaInput)
    : savedSolanaAddress ?? "";

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
                  <div className="mt-2 flex rounded-xl border border-neutral-200 bg-white focus-within:border-neutral-400">
                    <span className="flex h-11 shrink-0 items-center border-0 bg-transparent px-3 text-sm font-semibold text-neutral-500">
                      EUR
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
                      className="h-11 min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 text-sm font-semibold text-neutral-950 shadow-none outline-none ring-0 placeholder:text-neutral-400 focus:border-0 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      className="h-11 shrink-0 appearance-none border-0 bg-transparent px-3 text-sm font-semibold text-neutral-500 shadow-none outline-none ring-0 transition hover:text-neutral-950 focus:outline-none focus:ring-0"
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
                  <h2 className="text-base font-semibold text-neutral-950">{t("destinationPanelTitle")}</h2>
                  {method === "BANK_TRANSFER" && !showBankInput ? (
                    <Button type="button" variant="ghost" size="sm" onClick={startEditingBank}>
                      {sharedT("actions.edit")}
                    </Button>
                  ) : null}
                  {method === "USDC_SOLANA" && !showCryptoInput ? (
                    <Button type="button" variant="ghost" size="sm" onClick={startEditingCrypto}>
                      {sharedT("actions.edit")}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                  <button
                    type="button"
                    aria-pressed={method === "BANK_TRANSFER"}
                    onClick={() => selectMethod("BANK_TRANSFER")}
                    className={`h-10 rounded-lg px-3 text-sm font-semibold transition ${
                      method === "BANK_TRANSFER"
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-950"
                    }`}
                  >
                    {t("bankMethod")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={method === "USDC_SOLANA"}
                    onClick={() => selectMethod("USDC_SOLANA")}
                    className={`h-10 rounded-lg px-3 text-sm font-semibold transition ${
                      method === "USDC_SOLANA"
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-950"
                    }`}
                  >
                    {t("cryptoMethod")}
                  </button>
                </div>

                {method === "BANK_TRANSFER" ? (
                  showBankInput ? (
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
                  )
                ) : (
                  <div className="mt-4 grid gap-3">
                    {showCryptoInput ? (
                      <label className="block text-sm font-semibold text-neutral-950">
                        {t("solanaAddressLabel")}
                        <input
                          type="text"
                          value={solanaInput}
                          onChange={(e) => {
                            setSolanaInput(e.target.value.trim());
                            if (cryptoError) setCryptoError(null);
                          }}
                          placeholder={t("solanaAddressPlaceholder")}
                          autoComplete="off"
                          spellCheck={false}
                          className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 font-mono text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
                        />
                      </label>
                    ) : (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase text-neutral-400">
                          {t("savedCryptoAddress")}
                        </p>
                        <p
                          className="mt-1 truncate font-mono text-sm text-neutral-950"
                          title={savedSolanaAddress ?? undefined}
                        >
                          {maskSolanaAddress(savedSolanaAddress ?? "")}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">{t("cryptoNetwork")}</p>
                      </div>
                    )}
                    <AlertBanner
                      tone="warning"
                      title={t("cryptoInlineWarning")}
                    />
                    {cryptoError ? <p className="text-xs text-red-600">{cryptoError}</p> : null}
                  </div>
                )}
              </div>
            </div>

            {previewAmount ? (
              <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                {method === "BANK_TRANSFER"
                  ? t.rich("confirmText", {
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
                    })
                  : t.rich("cryptoConfirmText", {
                      amount: () => <strong>{formatCurrency(previewAmount, locale)}</strong>,
                      address: () => (
                        <span className="font-mono text-neutral-950" title={destinationAddress || undefined}>
                          {destinationAddress ? maskSolanaAddress(destinationAddress) : sharedT("emptyValue")}
                        </span>
                      ),
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
                {method === "BANK_TRANSFER" ? t("panelTitle") : t("cryptoPanelTitle")}
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <Dialog
        open={pendingCryptoRequest !== null}
        onClose={closeCryptoWarning}
        title={t("cryptoWarningTitle")}
        description={t("cryptoWarningDescription")}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={closeCryptoWarning}
              disabled={submitting}
            >
              {sharedT("actions.cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmCryptoWithdrawal}
              isPending={submitting}
              disabled={!cryptoWarningAccepted}
            >
              {t("cryptoConfirmSubmit")}
            </Button>
          </>
        }
      >
        {pendingCryptoRequest ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-red-700">
                {t("cryptoConfirmAddressLabel")}
              </p>
              <p className="mt-2 break-all font-mono text-sm font-semibold text-red-950">
                {pendingCryptoRequest.solanaAddress}
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={cryptoWarningAccepted}
                onChange={(event) => setCryptoWarningAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300"
              />
              <span>{t("cryptoConfirmCheckbox")}</span>
            </label>
          </div>
        ) : null}
      </Dialog>
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
