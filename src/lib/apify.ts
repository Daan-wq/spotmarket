/**
 * Thin Apify Actor wrapper. Synchronous run-and-return-dataset call so
 * callers can `await fetchTikTokBio(...)` from a Next.js route handler.
 *
 * Used by the link-in-bio fallback flow and the view-scraping worker.
 */

const APIFY_BASE = "https://api.apify.com/v2";

export class ApifyError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApifyError";
    this.status = status;
  }
}

function getToken(): string | null {
  return process.env.APIFY_API_TOKEN ?? null;
}

export function isApifyConfigured(): boolean {
  return !!getToken();
}

export async function runApifyActor<TInput, TOutput = unknown>(
  actorId: string,
  input: TInput,
  opts: { timeoutSecs?: number; memoryMb?: number } = {},
): Promise<TOutput[]> {
  const token = getToken();
  if (!token) {
    throw new ApifyError("APIFY_API_TOKEN is not configured");
  }

  const params = new URLSearchParams({ token });
  if (opts.timeoutSecs) params.set("timeout", String(opts.timeoutSecs));
  if (opts.memoryMb) params.set("memory", String(opts.memoryMb));

  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((opts.timeoutSecs ?? 60) * 1000 + 5_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApifyError(
      `Apify actor ${actorId} returned ${res.status}: ${text.slice(0, 300)}`,
      res.status,
    );
  }

  const items = (await res.json()) as TOutput[];
  if (!Array.isArray(items)) {
    throw new ApifyError(`Apify actor ${actorId} returned non-array payload`);
  }
  return items;
}
