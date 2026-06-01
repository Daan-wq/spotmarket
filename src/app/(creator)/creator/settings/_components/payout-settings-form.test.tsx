import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PayoutSettingsForm } from "./payout-settings-form";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      title: "Payout destinations",
      description: "Save bank and USDC destinations before requesting withdrawals.",
      bankTitle: "Bank transfer",
      bankDescription: "Save an IBAN and account holder name.",
      ibanLabel: "IBAN",
      ibanPlaceholder: "NL00 BANK 0000 0000 00",
      accountNameLabel: "Account holder name",
      accountNamePlaceholder: "Name on the bank account",
      savedBankDetails: "Saved bank details",
      cryptoTitle: "USDC on Solana",
      cryptoDescription: "Save a Solana wallet address for USDC payouts.",
      solanaAddressLabel: "Solana wallet address",
      solanaAddressPlaceholder: "Solana address",
      savedCryptoAddress: "Saved wallet address",
      cryptoNetwork: "USDC on Solana",
      saveBankDetails: "Save bank details",
      saveCryptoDetails: "Save USDC wallet",
      edit: "Edit",
    };
    return labels[key] ?? key;
  },
}));

describe("PayoutSettingsForm", () => {
  it("renders both bank and USDC payout destinations in settings", () => {
    const html = renderToStaticMarkup(
      <PayoutSettingsForm
        initialIban="NL91ABNA0417164300"
        initialAccountName="Clipper Name"
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
