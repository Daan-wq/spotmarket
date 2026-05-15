type OAuthEnvSource = Record<string, string | undefined>;

const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;
const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function getRequiredOAuthEnv(
  name: string,
  env: OAuthEnvSource = process.env
): string {
  const value = env[name]?.trim() ?? "";

  if (!value) {
    throw new Error(`${name} is required`);
  }

  if (CONTROL_CHAR_RE.test(value)) {
    throw new Error(`${name} contains invalid control characters`);
  }

  return value;
}

export function getRequiredOAuthRedirectUri(
  name: string,
  env: OAuthEnvSource = process.env
): string {
  const value = getRequiredOAuthEnv(name, env);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (url.protocol === "https:") {
    return value;
  }

  const isLocalHttp =
    url.protocol === "http:" &&
    env.NODE_ENV !== "production" &&
    LOCAL_HTTP_HOSTS.has(url.hostname);

  if (isLocalHttp) {
    return value;
  }

  throw new Error(`${name} must use HTTPS`);
}
