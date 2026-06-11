export const AUTH_ATTEMPT_COOKIE_NAME = "clipprofit-auth-attempt";

const ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BrandAuthEvent =
  | "form_opened"
  | "submit_started"
  | "auth_failed"
  | "auth_succeeded"
  | "network_error"
  | "redirect_succeeded";

type BrandAuthLog = {
  event: BrandAuthEvent;
  attemptId: string;
  brandFlow?: boolean;
  errorCode?: string;
  pathname?: string;
  redirectPath?: string;
};

export function isSafeAuthAttemptId(
  value: string | undefined,
): value is string {
  return Boolean(value && ATTEMPT_ID_PATTERN.test(value));
}

export function logBrandAuthEvent(
  level: "info" | "warn",
  details: BrandAuthLog,
) {
  const logger = level === "warn" ? console.warn : console.info;
  logger("[brand-auth]", details);
}
