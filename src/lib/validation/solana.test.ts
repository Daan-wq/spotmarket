import { describe, expect, it } from "vitest";
import { isValidSolanaAddress, maskSolanaAddress, normalizeSolanaAddress } from "./solana";

const VALID_SOLANA_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("Solana address validation", () => {
  it("accepts base58 addresses that decode to 32 bytes", () => {
    expect(isValidSolanaAddress(VALID_SOLANA_ADDRESS)).toBe(true);
  });

  it.each([
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "NL91ABNA0417164300",
    "not a solana address",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt10",
  ])("rejects non-Solana payout addresses: %s", (value) => {
    expect(isValidSolanaAddress(value)).toBe(false);
  });

  it("trims saved Solana addresses without changing casing", () => {
    expect(normalizeSolanaAddress(`  ${VALID_SOLANA_ADDRESS}  `)).toBe(VALID_SOLANA_ADDRESS);
  });

  it("masks Solana addresses for compact display", () => {
    expect(maskSolanaAddress(VALID_SOLANA_ADDRESS)).toBe("EPjFWd...yTDt1v");
  });
});
