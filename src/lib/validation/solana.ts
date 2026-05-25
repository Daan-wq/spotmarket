const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map(BASE58_ALPHABET.split("").map((char, index) => [char, index]));
const SOLANA_PUBLIC_KEY_BYTES = 32;

export function normalizeSolanaAddress(value: string): string {
  return value.trim();
}

export function isValidSolanaAddress(value: string): boolean {
  const normalized = normalizeSolanaAddress(value);
  if (!normalized) return false;

  const decoded = decodeBase58(normalized);
  return decoded !== null && decoded.length === SOLANA_PUBLIC_KEY_BYTES;
}

export function maskSolanaAddress(value: string): string {
  const normalized = normalizeSolanaAddress(value);
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-6)}`;
}

function decodeBase58(value: string): Uint8Array | null {
  const bytes: number[] = [];

  for (const char of value) {
    const digit = BASE58_INDEX.get(char);
    if (digit === undefined) return null;

    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char !== "1") break;
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}
