export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

export function maskIban(value: string): string {
  const normalized = normalizeIban(value);
  if (normalized.length <= 10) return normalized;
  return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ... ${normalized.slice(-4)}`;
}

export function isValidIban(value: string): boolean {
  const normalized = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) return false;

  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  let remainder = 0;

  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    const chunk = code >= 65 && code <= 90 ? String(code - 55) : char;

    for (const digit of chunk) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}
