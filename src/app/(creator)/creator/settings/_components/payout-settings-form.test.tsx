import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PayoutSettingsForm } from "./payout-settings-form";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      title: "Payout destinations",
      description: "Save both payout destinations here.",
      bankTitle: "Bank transfer",
      bankDescription: "Save the IBAN and account holder name.",
      ibanLabel: "IBAN",
      ibanPlaceholder: "NL00 BANK 0000 0000 00",
      accountNameLabel: "Account holder name",
      accountNamePlaceholder: "Name on the bank account",
      savedBankDetails: "Saved bank details",
      cryptoTitle: "USDC on Solana",
      cryptoDescription: "Save the Solana wallet address.",
      solanaAddressLabel: "Solana wallet address",
      solanaAddressPlaceholder: "Solana address",
      savedCryptoAddress: "Saved wallet address",
      cryptoNetwork: "USDC on Solana",
      cryptoWarning: "Only use a Solana wallet address that can receive USDC on Solana.",
      saveBankDetails: "Save bank details",
      saveCryptoDetails: "Save USDC wallet",
    };

    return labels[key] ?? key;
  },
}));

describe("PayoutSettingsForm", () => {
  it("renders bank and USDC payout destinations in settings", () => {
    const html = renderToStaticMarkup(
      <PayoutSettingsForm
        initialIban="NL91ABNA0417164300"
        initialAccountName="Daan Test"
        initialSolanaAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      />,
    );

    expect(html).toContain('id="payout-settings"');
    expect(html).toContain("Payout destinations");
    expect(html).toContain("Bank transfer");
    expect(html).toContain("USDC on Solana");
    expect(html).toContain("NL91 ABNA ... 4300");
    expect(html).toContain("EPjFWd...yTDt1v");
  });
});
