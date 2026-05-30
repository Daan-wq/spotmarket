export interface ExchangeRate {
  rate: number;
  date: string;
  source: "Frankfurter";
}

export const FRANKFURTER_EUR_USD_URL = "https://api.frankfurter.dev/v2/rate/EUR/USD";
export const FALLBACK_EUR_USD_RATE: ExchangeRate = {
  date: "unavailable",
  rate: 1,
  source: "Frankfurter",
};

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function getEurUsdRate(
  fetchRate: typeof fetch = fetch,
): Promise<ExchangeRate> {
  try {
    const response = await fetchRate(FRANKFURTER_EUR_USD_URL, {
      next: { revalidate: 60 * 60 },
    } satisfies NextFetchInit);

    if (!response.ok) {
      throw new Error(`Frankfurter returned ${response.status}`);
    }

    return parseFrankfurterEurUsdRate(await response.json());
  } catch {
    return FALLBACK_EUR_USD_RATE;
  }
}

export function parseFrankfurterEurUsdRate(payload: unknown): ExchangeRate {
  if (!isFrankfurterRatePayload(payload)) {
    throw new Error("Invalid Frankfurter EUR/USD rate response");
  }

  return {
    date: payload.date,
    rate: payload.rate,
    source: "Frankfurter",
  };
}

function isFrankfurterRatePayload(
  payload: unknown,
): payload is { date: string; rate: number } {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as { date?: unknown; rate?: unknown };
  return (
    typeof candidate.date === "string" &&
    typeof candidate.rate === "number" &&
    Number.isFinite(candidate.rate) &&
    candidate.rate > 0
  );
}
