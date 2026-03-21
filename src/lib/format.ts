/** Format a CPV (cost per view) as dollars per 1 million views. */
export function formatCpM(cpv: number | string): string {
  const n = typeof cpv === "string" ? parseFloat(cpv) : cpv;
  if (isNaN(n)) return "—";
  const perMillion = n * 1_000_000;
  return `$${perMillion % 1 === 0 ? perMillion.toFixed(0) : perMillion.toFixed(2)}/1M views`;
}
