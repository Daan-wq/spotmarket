/** Format a CPV (cost per view) as euros per 1K views. */
export function formatCpM(cpv: number | string): string {
  const n = typeof cpv === "string" ? parseFloat(cpv) : cpv;
  if (isNaN(n)) return "-";
  const perThousand = n * 1_000;
  return `€${perThousand.toFixed(2)}/1K views`;
}
