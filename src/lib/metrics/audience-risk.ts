export type AudienceCountryShare = {
  code: string;
  share: number;
};

export type AsianAudienceCountryRisk = {
  code: string;
  sharePercent: number;
  riskPoints: number;
};

export const ASIAN_AUDIENCE_POINTS_PER_PERCENT = 4;

const ASIAN_COUNTRY_CODES = new Set([
  "AE", "AF", "AM", "AZ", "BD", "BH", "BN", "BT", "CN", "CY", "GE", "HK",
  "ID", "IL", "IN", "IQ", "IR", "JO", "JP", "KG", "KH", "KP", "KR", "KW",
  "KZ", "LA", "LB", "LK", "MM", "MN", "MO", "MV", "MY", "NP", "OM", "PH",
  "PK", "PS", "QA", "SA", "SG", "SY", "TH", "TJ", "TL", "TM", "TR", "TW",
  "UZ", "VN", "YE",
]);

export function audienceSharePercent(share: number) {
  const numeric = Math.max(0, Number(share) || 0);
  return Math.min(100, numeric <= 1 ? numeric * 100 : numeric);
}

export function isAsianCountry(code: string) {
  return ASIAN_COUNTRY_CODES.has(code.trim().toUpperCase());
}

export function parseAudienceCountries(value: unknown): AudienceCountryShare[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : "";
    const share = typeof row.share === "number" ? row.share : Number(row.share);
    return code && Number.isFinite(share) ? [{ code, share }] : [];
  });
}

export function calculateAsianAudienceRisk(countries: AudienceCountryShare[]) {
  const asianCountries = countries
    .filter((country) => isAsianCountry(country.code))
    .map((country): AsianAudienceCountryRisk => {
      const sharePercent = audienceSharePercent(country.share);
      return {
        code: country.code.trim().toUpperCase(),
        sharePercent,
        riskPoints: sharePercent * ASIAN_AUDIENCE_POINTS_PER_PERCENT,
      };
    })
    .filter((country) => country.sharePercent > 0)
    .sort((a, b) => b.sharePercent - a.sharePercent);

  const asianSharePercent = Math.min(
    100,
    asianCountries.reduce((sum, country) => sum + country.sharePercent, 0),
  );

  return {
    asianSharePercent,
    riskPoints: asianSharePercent * ASIAN_AUDIENCE_POINTS_PER_PERCENT,
    countries: asianCountries,
  };
}
