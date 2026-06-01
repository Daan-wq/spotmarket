"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import {
  formatIban,
  isValidIban,
  maskIban,
  normalizeIban,
} from "@/lib/validation/iban";
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

  const [ibanInput, setIbanInput] = useState(
    initialIban ? formatIban(initialIban) : "",
  );
  const [accountNameInput, setAccountNameInput] = useState(
    initialAccountName ?? "",
  );
  const [solanaInput, setSolanaInput] = useState(initialSolanaAddress ?? "");

  const [savedIban, setSavedIban] = useState(initialIban);
  const [savedAccountName, setSavedAccountName] = useState(initialAccountName);
  const [savedSolanaAddress, setSavedSolanaAddress] = useState(
    initialSolanaAddress,
  );

  const [bankStatus, setBankStatus] = useState<SaveStatus>({ type: "idle" });
  const [cryptoStatus, setCryptoStatus] = useState<SaveStatus>({ type: "idle" });
  const [savingBank, setSavingBank] = useState(false);
  const [savingCrypto, setSavingCrypto] = useState(false);

  async function saveBankDetails() {
    const iban = normalizeIban(ibanInput);
    const accountName = accountNameInput.replace(/\s+/g, " ").trim();

    if (!isValidIban(iban)) {
      setBankStatus({ type: "error", message: t("ibanError") });
      return;
    }
    if (accountName.length < 2) {
      setBankStatus({ type: "error", message: t("accountNameError") });
      return;
    }

    setSavingBank(true);
    setBankStatus({ type: "idle" });

    try {
      const response = await fetch("/api/wallet/payout-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban, accountName }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBankStatus({ type: "error", message: data.error || t("saveFailed") });
        return;
      }

      setSavedIban(data.payoutIban);
      setSavedAccountName(data.payoutAccountName);
      setIbanInput(formatIban(data.payoutIban));
      setAccountNameInput(data.payoutAccountName);
      setBankStatus({ type: "success", message: t("bankSaved") });
    } catch {
      setBankStatus({ type: "error", message: t("saveError") });
    } finally {
      setSavingBank(false);
    }
  }

  async function saveCryptoDetails() {
    const solanaAddress = normalizeSolanaAddress(solanaInput);

    if (!isValidSolanaAddress(solanaAddress)) {
      setCryptoStatus({ type: "error", message: t("solanaAddressError") });
      return;
    }

    setSavingCrypto(true);
    setCryptoStatus({ type: "idle" });

    try {
      const response = await fetch("/api/wallet/crypto-payout-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solanaAddress }),
      });
      const data = await response.json();

      if (!response.ok) {
        setCryptoStatus({
          type: "error",
          message: data.error || t("saveCryptoFailed"),
        });
        return;
      }

      setSavedSolanaAddress(data.payoutSolanaAddress);
      setSolanaInput(data.payoutSolanaAddress);
      setCryptoStatus({ type: "success", message: t("cryptoSaved") });
    } catch {
      setCryptoStatus({ type: "error", message: t("saveCryptoError") });
    } finally {
      setSavingCrypto(false);
    }
  }

  return (
    <section
      id="payout-settings"
      className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5"
    >
      <div className="max-w-2xl">
        <h2 className="text-base font-semibold text-neutral-950">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          {t("description")}
        </p>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="min-w-0">
          <PayoutMethodHeader
            title={t("bankTitle")}
            description={t("bankDescription")}
          />
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("ibanLabel")}
              <input
                type="text"
                value={ibanInput}
                onChange={(event) => {
                  setIbanInput(formatIban(event.target.value));
                  if (bankStatus.type !== "idle") setBankStatus({ type: "idle" });
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
                  if (bankStatus.type !== "idle") setBankStatus({ type: "idle" });
                }}
                placeholder={t("accountNamePlaceholder")}
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
            {savedIban && savedAccountName ? (
              <SavedDestination
                label={t("savedBankDetails")}
                primary={maskIban(savedIban)}
                secondary={savedAccountName}
              />
            ) : null}
            <SaveStatusBanner status={bankStatus} />
            <Button
              type="button"
              onClick={saveBankDetails}
              isPending={savingBank}
              className="w-full md:w-auto"
            >
              {t("saveBankDetails")}
            </Button>
          </div>
        </div>

        <div className="min-w-0 border-t border-neutral-200 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <PayoutMethodHeader
            title={t("cryptoTitle")}
            description={t("cryptoDescription")}
          />
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-neutral-950">
              {t("solanaAddressLabel")}
              <input
                type="text"
                value={solanaInput}
                onChange={(event) => {
                  setSolanaInput(event.target.value.trim());
                  if (cryptoStatus.type !== "idle") setCryptoStatus({ type: "idle" });
                }}
                placeholder={t("solanaAddressPlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 font-mono text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
            {savedSolanaAddress ? (
              <SavedDestination
                label={t("savedCryptoAddress")}
                primary={maskSolanaAddress(savedSolanaAddress)}
                secondary={t("cryptoNetwork")}
              />
            ) : null}
            <AlertBanner tone="warning" title={t("cryptoWarning")} />
            <SaveStatusBanner status={cryptoStatus} />
            <Button
              type="button"
              onClick={saveCryptoDetails}
              isPending={savingCrypto}
              className="w-full md:w-auto"
            >
              {t("saveCryptoDetails")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

type SaveStatus =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function PayoutMethodHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>
    </div>
  );
}

function SavedDestination({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase text-neutral-400">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm text-neutral-950">
        {primary}
      </p>
      <p className="mt-1 truncate text-sm text-neutral-600">{secondary}</p>
    </div>
  );
}

function SaveStatusBanner({ status }: { status: SaveStatus }) {
  if (status.type === "idle") return null;

  return (
    <AlertBanner
      tone={status.type === "success" ? "success" : "error"}
      title={status.message}
    />
  );
}
