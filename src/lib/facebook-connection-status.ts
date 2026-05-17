import type { AlertTone } from "@/components/ui/alert-banner";

export type FacebookConnectionStatusKey =
  | "linked"
  | "denied"
  | "failed"
  | "stateMismatch"
  | "missingScopes"
  | "noPages"
  | "noProfile"
  | "appInvalid"
  | "redirectMismatch"
  | "tokenExchangeFailed";

export interface FacebookConnectionStatus {
  tone: AlertTone;
  key: FacebookConnectionStatusKey;
}

export interface FacebookConnectionStatusParams {
  facebook?: string;
  error?: string;
  detail?: string;
}

export function getFacebookConnectionStatus(
  params: FacebookConnectionStatusParams
): FacebookConnectionStatus | null {
  if (params.facebook === "linked") {
    return { tone: "success", key: "linked" };
  }

  if (!params.error?.startsWith("fb_")) {
    return null;
  }

  switch (params.error) {
    case "fb_denied":
      return { tone: "warning", key: "denied" };
    case "fb_failed":
      return { tone: "error", key: "failed" };
    case "fb_state_mismatch":
      return { tone: "error", key: "stateMismatch" };
    case "fb_missing_scopes":
      return { tone: "warning", key: "missingScopes" };
    case "fb_no_pages":
      return { tone: "warning", key: "noPages" };
    case "fb_no_profile":
      return { tone: "error", key: "noProfile" };
    case "fb_error":
      return getFacebookErrorStatus(params.detail);
    default:
      return { tone: "error", key: "tokenExchangeFailed" };
  }
}

function getFacebookErrorStatus(detail?: string): FacebookConnectionStatus {
  switch (detail) {
    case "fb_app_invalid":
      return { tone: "error", key: "appInvalid" };
    case "fb_redirect_mismatch":
      return { tone: "error", key: "redirectMismatch" };
    default:
      return { tone: "error", key: "tokenExchangeFailed" };
  }
}
