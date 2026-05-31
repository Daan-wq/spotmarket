"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { formatIban, isValidIban, maskIban, normalizeIban } from "@/lib/validation/iban";
import {
  isValidSolanaAddress,
  maskSolanaAddress,
  normalizeSolanaAddress,
} from "@/lib/validation/solana";

interface PayoutSettingsFormProps {
  initialIban: string | null;
  initialAccountName: string | null;
  initialSolanaAddress: string | null;
}

export function PayoutSettingsForm({
  initialIban,
  initialAccountName,
  initialSolanaAddress,
}: PayoutSettingsFormProps) {
  const t = useTranslations("creatorSettings.payoutSettings");

  const [savedIban, setSavedIban] = useState(initialIban);
  const [savedAccountName, setSavedAccountName] = useState(initialAccountName);
  const [savedSolanaAddress, setSavedSolanaAddress] = useState(initialSolanaAddress);

  const [ibanInput, setIbanInput] = useState(initialIban ? formatIban(initialIban) : "");
  const [accountNameInput, setAccountNameInput] = useState(initialAccountName ?? "");
  const [solanaInput, setSolanaInput] = useState(initialSolanaAddress ?? "");

  const [bankError, setBankError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);
  const [cryptoSuccess, setCryptoSuccess] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [savingCrypto, setSavingCrypto] = useState(false);

  async function saveBankDetails() {
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

    setSavingBank(true);
    setBankError(null);
    setBankSuccess(null);

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
      setIbanInput(formatIban(data.payoutIban));
      setAccountNameInput(data.payoutAccountName);
      setBankSuccess(t("bankSaved"));
    } catch {
      setBankError(t("saveError"));
    } finally {
      setSavingBank(false);
    }
  }

  async function saveCryptoDetails() {
    const solanaAddress = normalizeSolanaAddress(solanaInput);

    if (!isValidSolanaAddress(solanaAddress)) {
      setCryptoError(t("solanaAddressError"));
      return;
    }

    setSavingCrypto(true);
    setCryptoError(null);
    setCryptoSuccess(null);

    try {
      const res = await fetch("/api/wallet/crypto-payout-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solanaAddress }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCryptoError(data.error || t("saveCryptoFailed"));
        return;
      }

      setSavedSolanaAddress(data.payoutSolanaAddress);
      setSolanaInput(data.payoutSolanaAddress);
      setCryptoSuccess(t("cryptoSaved"));
    } catch {
      setCryptoError(t("saveCryptoError"));
    } finally {
      setSavingCrypto(false);
    }
  }

  return (
    <section id="payout-settings" className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="max-w-3xl">
        <h2 className="text-base font-semibold text-neutral-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("description")}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="text-sm font-semibold text-neutral-950">{t("bankTitle")}</h3>
          <p className="mt-1 text-xs text-neutral-500">{t("bankDescription")}</p>

          {savedIban && savedAccountName ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-neutral-400">
                {t("savedBankDetails")}
              </p>
              <p className="mt-1 truncate font-mono text-sm text-neutral-950" title={savedIban}>
                {maskIban(savedIban)}
              </p>
              <p className="mt-1 truncate text-sm text-neutral-600">{savedAccountName}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("ibanLabel")}
              <input
                type="text"
                value={ibanInput}
                onChange={(event) => {
                  setIbanInput(formatIban(event.target.value));
                  setBankError(null);
                  setBankSuccess(null);
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
                onChange={(event) => {
                  setAccountNameInput(event.target.value);
                  setBankError(null);
                  setBankSuccess(null);
                }}
                placeholder={t("accountNamePlaceholder")}
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>

            {bankError ? <AlertBanner tone="error" title={bankError} /> : null}
            {bankSuccess ? <AlertBanner tone="success" title={bankSuccess} /> : null}

            <Button type="button" isPending={savingBank} onClick={saveBankDetails}>
              {t("saveBankDetails")}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="text-sm font-semibold text-neutral-950">{t("cryptoTitle")}</h3>
          <p className="mt-1 text-xs text-neutral-500">{t("cryptoDescription")}</p>

          {savedSolanaAddress ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-neutral-400">
                {t("savedCryptoAddress")}
              </p>
              <p className="mt-1 truncate font-mono text-sm text-neutral-950" title={savedSolanaAddress}>
                {maskSolanaAddress(savedSolanaAddress)}
              </p>
              <p className="mt-1 text-sm text-neutral-600">{t("cryptoNetwork")}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("solanaAddressLabel")}
              <input
                type="text"
                value={solanaInput}
                onChange={(event) => {
                  setSolanaInput(event.target.value.trim());
                  setCryptoError(null);
                  setCryptoSuccess(null);
                }}
                placeholder={t("solanaAddressPlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 font-mono text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>

            <AlertBanner tone="warning" title={t("cryptoWarning")} />
            {cryptoError ? <AlertBanner tone="error" title={cryptoError} /> : null}
            {cryptoSuccess ? <AlertBanner tone="success" title={cryptoSuccess} /> : null}

            <Button type="button" isPending={savingCrypto} onClick={saveCryptoDetails}>
              {t("saveCryptoDetails")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
