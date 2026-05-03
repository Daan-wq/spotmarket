// Lightweight server-side timing helper.
// Wrap an async call to log its duration to the server console (visible in
// Vercel function logs). Use this to triangulate where layout/page render
// time goes after the cheap optimizations are in. No-op in production unless
// PERF_TRACE=1 is set so we don't pollute logs by default.

const ENABLED = process.env.NODE_ENV !== "production" || process.env.PERF_TRACE === "1";

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = (performance.now() - start).toFixed(1);
    console.log(`[perf] ${label}: ${ms}ms`);
  }
}
