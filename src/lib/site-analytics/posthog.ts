export interface PostHogQueryConfig {
  host: string;
  projectId: string;
  personalApiKey: string;
}

interface PostHogQueryResponse {
  results?: unknown[];
  result?: unknown[];
  columns?: string[];
  query_status?: {
    results?: unknown[];
  };
}

export function getPostHogQueryConfig(env: NodeJS.ProcessEnv = process.env): PostHogQueryConfig {
  const missing = [
    "POSTHOG_PERSONAL_API_KEY",
    "POSTHOG_PROJECT_ID",
    "POSTHOG_HOST",
  ].filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing PostHog analytics env vars: ${missing.join(", ")}`);
  }

  return {
    host: env.POSTHOG_HOST!.replace(/\/$/, ""),
    projectId: env.POSTHOG_PROJECT_ID!,
    personalApiKey: env.POSTHOG_PERSONAL_API_KEY!,
  };
}

export async function runPostHogHogQLQuery(
  sql: string,
  name: string,
  config = getPostHogQueryConfig(),
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(`${config.host}/api/projects/${config.projectId}/query/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.personalApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: sql,
      },
      name,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PostHog query failed (${response.status}): ${detail || response.statusText}`);
  }

  return extractRows(await response.json() as PostHogQueryResponse);
}

export function extractRows(response: PostHogQueryResponse): unknown[][] {
  const rawRows = response.results ?? response.result ?? response.query_status?.results ?? [];
  if (!Array.isArray(rawRows)) return [];

  return rawRows.map((row) => (Array.isArray(row) ? row : [row]));
}

export function toHogQLDate(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
