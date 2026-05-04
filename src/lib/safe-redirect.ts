export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;

  try {
    const url = new URL(value, "https://clipprofit.local");
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (!path.startsWith("/") || path.startsWith("//")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
