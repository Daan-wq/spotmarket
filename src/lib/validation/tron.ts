export const TRON_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isValidTronAddress(value: string): boolean {
  return TRON_REGEX.test(value);
}

export function maskTronAddress(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
