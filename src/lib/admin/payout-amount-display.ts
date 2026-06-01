import type { ExchangeRate } from "@/lib/exchange-rates";
import { formatCurrencyPrecise, toNumber, type FormatLocale } from "./agency-format";

interface PayoutAmountDisplayInput {
  amount: number | string | { toString(): string } | null | undefined;
  currency: string | null | undefined;
  paymentMethod: string | null | undefined;
  eurUsdRate: ExchangeRate;
  locale?: FormatLocale;
}

interface PayoutAmountDisplay {
  primary: string;
  secondary?: string;
  rateLabel?: string;
}

export function formatAdminPayoutAmount({
  amount,
  currency,
  paymentMethod,
  eurUsdRate,
  locale = "nl",
}: PayoutAmountDisplayInput): PayoutAmountDisplay {
  const payoutCurrency = currency || "EUR";

  if (paymentMethod !== "CRYPTO" || payoutCurrency !== "EUR") {
    return {
      primary: formatCurrencyPrecise(amount, payoutCurrency, locale),
    };
  }

  const eurAmount = toNumber(amount);
  return {
    primary: formatUsd(eurAmount * eurUsdRate.rate),
    secondary: `${formatCurrencyPrecise(amount, "EUR", locale)} EUR`,
    rateLabel: `1 EUR = ${eurUsdRate.rate.toFixed(4)} USD · ${eurUsdRate.source} ${eurUsdRate.date}`,
  };
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
