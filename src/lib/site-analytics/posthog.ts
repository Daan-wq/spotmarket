export interface PostHogQueryConfig {
  host: string;
  projectId: string;
  personalApiKey: string;
}

export interface PostHogConfigurationStatus {
  isConfigured: boolean;
  host: string | null;
  projectId: string | null;
  missing: string[];
}

interface PostHogQueryResponse {
  results?: unknown[];
  result?: unknown[];
  columns?: string[];
  query_status?: {
    results?: unknown[];
  };
}

function envValue(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function normalizeHost(host: string) {
  return host.replace(/\/+$/, "");
}

function toPrivatePostHogHost(host: string) {
  const normalized = normalizeHost(host);
  if (normalized === "https://eu.i.posthog.com") return "https://eu.posthog.com";
  if (normalized === "https://us.i.posthog.com") return "https://us.posthog.com";
  return normalized;
}

function postHogQueryHost(env: NodeJS.ProcessEnv) {
  const explicitHost = envValue(env, "POSTHOG_HOST") ?? envValue(env, "POSTHOG_API_HOST");
  if (explicitHost) return toPrivatePostHogHost(explicitHost);

  const publicHost = envValue(env, "NEXT_PUBLIC_POSTHOG_HOST");
  return publicHost ? toPrivatePostHogHost(publicHost) : undefined;
}

export function getPostHogConfigurationStatus(env: NodeJS.ProcessEnv = process.env): PostHogConfigurationStatus {
  const host = postHogQueryHost(env) ?? null;
  const projectId = envValue(env, "POSTHOG_PROJECT_ID") ?? null;
  const missing = [
    !envValue(env, "NEXT_PUBLIC_POSTHOG_KEY") ? "NEXT_PUBLIC_POSTHOG_KEY" : null,
    !envValue(env, "NEXT_PUBLIC_POSTHOG_HOST") ? "NEXT_PUBLIC_POSTHOG_HOST" : null,
    !envValue(env, "POSTHOG_PERSONAL_API_KEY") ? "POSTHOG_PERSONAL_API_KEY" : null,
    !projectId ? "POSTHOG_PROJECT_ID" : null,
    !host ? "POSTHOG_HOST or NEXT_PUBLIC_POSTHOG_HOST" : null,
  ].filter((key): key is string => Boolean(key));

  return {
    isConfigured: missing.length === 0,
    host,
    projectId,
    missing,
  };
}

export function getPostHogQueryConfig(env: NodeJS.ProcessEnv = process.env): PostHogQueryConfig {
  const host = postHogQueryHost(env);
  const projectId = envValue(env, "POSTHOG_PROJECT_ID");
  const personalApiKey = envValue(env, "POSTHOG_PERSONAL_API_KEY");
  const missing = [
    !personalApiKey ? "POSTHOG_PERSONAL_API_KEY" : null,
    !projectId ? "POSTHOG_PROJECT_ID" : null,
    !host ? "POSTHOG_HOST or NEXT_PUBLIC_POSTHOG_HOST" : null,
  ].filter((key): key is string => Boolean(key));

  if (missing.length > 0) {
    throw new Error(`Missing PostHog analytics env vars: ${missing.join(", ")}`);
  }

  return {
    host: host!,
    projectId: projectId!,
    personalApiKey: personalApiKey!,
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
