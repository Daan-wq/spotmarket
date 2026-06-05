import { Resend } from "resend";
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "@/i18n/routing";

export const AUTH_EMAIL_FROM = "ClipProfit <noreply@clipprofit.com>";

type AuthEmailKind = "verification" | "passwordRecovery";

type AuthEmailInput = {
  kind: AuthEmailKind;
  locale: Locale;
  actionUrl: string;
};

type SendAuthEmailInput = AuthEmailInput & {
  to: string;
};

type AuthEmailCopy = {
  subject: string;
  preview: string;
  title: string;
  body: string;
  button: string;
  fallback: string;
  footer: string;
};

const COPY: Record<Locale, Record<AuthEmailKind, AuthEmailCopy>> = {
  en: {
    verification: {
      subject: "Confirm your ClipProfit account",
      preview: "Confirm your email address to activate your ClipProfit account.",
      title: "Confirm your account",
      body: "Verify your email address to activate your ClipProfit account and start using the platform.",
      button: "Confirm my account",
      fallback: "Or open this secure link:",
      footer: "This link expires after 15 minutes. If you did not create a ClipProfit account, you can ignore this email.",
    },
    passwordRecovery: {
      subject: "Reset your ClipProfit password",
      preview: "Choose a new password for your ClipProfit account.",
      title: "Reset your password",
      body: "We received a request to reset your ClipProfit password. Use the secure button below to choose a new one.",
      button: "Reset password",
      fallback: "Or open this secure link:",
      footer: "If you did not request a password reset, you can safely ignore this email.",
    },
  },
  nl: {
    verification: {
      subject: "Bevestig je ClipProfit-account",
      preview: "Bevestig je e-mailadres om je ClipProfit-account te activeren.",
      title: "Bevestig je account",
      body: "Verifieer je e-mailadres om je ClipProfit-account te activeren en het platform te gebruiken.",
      button: "Bevestig mijn account",
      fallback: "Of open deze beveiligde link:",
      footer: "Deze link verloopt na 15 minuten. Heb je geen ClipProfit-account aangemaakt, dan kun je deze e-mail negeren.",
    },
    passwordRecovery: {
      subject: "Reset je ClipProfit-wachtwoord",
      preview: "Kies een nieuw wachtwoord voor je ClipProfit-account.",
      title: "Reset je wachtwoord",
      body: "We hebben een verzoek ontvangen om je ClipProfit-wachtwoord te resetten. Kies via de beveiligde knop hieronder een nieuw wachtwoord.",
      button: "Wachtwoord resetten",
      fallback: "Of open deze beveiligde link:",
      footer: "Heb je geen wachtwoordreset aangevraagd, dan kun je deze e-mail veilig negeren.",
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCopy(kind: AuthEmailKind, locale: Locale): AuthEmailCopy {
  return COPY[locale][kind];
}

export function getAuthEmailLocale(request: Request): Locale {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const hostname = host.toLowerCase().split(":")[0] ?? "";

  if (hostname === "clipprofit.nl" || hostname.endsWith(".clipprofit.nl")) {
    return "nl";
  }

  if (hostname === "clipprofit.com" || hostname.endsWith(".clipprofit.com")) {
    return "en";
  }

  const forwardedLocale = request.headers.get("x-locale");
  return isLocale(forwardedLocale) ? forwardedLocale : DEFAULT_LOCALE;
}

export function renderAuthEmail({
  kind,
  locale,
  actionUrl,
}: AuthEmailInput): string {
  const copy = getCopy(kind, locale);
  const safeUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;background:#f4f6f7;color:#010405;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(copy.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f7;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
            <tr>
              <td style="padding:0 8px 18px;color:#010405;font-size:22px;font-weight:900;font-style:italic;letter-spacing:-0.6px;text-transform:uppercase;">ClipProfit</td>
            </tr>
            <tr>
              <td style="background:#fbfcfc;border:1px solid #d2d9db;border-radius:24px;padding:34px 32px;box-shadow:0 18px 48px rgba(23,33,54,0.08);">
                <div style="width:56px;height:6px;margin:0 0 24px;border-radius:999px;background:#5d5fef;"></div>
                <h1 style="margin:0 0 16px;color:#010405;font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-0.7px;">${escapeHtml(copy.title)}</h1>
                <p style="margin:0 0 26px;color:#4f5b5f;font-size:16px;line-height:1.65;">${escapeHtml(copy.body)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:999px;background:#5d5fef;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 27px;color:#ffffff;font-size:15px;font-weight:750;line-height:1;text-decoration:none;border-radius:999px;">${escapeHtml(copy.button)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 8px;color:#6d787b;font-size:12px;line-height:1.55;">${escapeHtml(copy.fallback)}</p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.55;">
                  <a href="${safeUrl}" style="color:#4648bf;text-decoration:underline;">${safeUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;color:#6d787b;font-size:12px;line-height:1.6;">${escapeHtml(copy.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderAuthEmailText({
  kind,
  locale,
  actionUrl,
}: AuthEmailInput): string {
  const copy = getCopy(kind, locale);
  return [
    "ClipProfit",
    "",
    copy.title,
    copy.body,
    "",
    actionUrl,
    "",
    copy.footer,
  ].join("\n");
}

export async function sendAuthEmail({
  to,
  kind,
  locale,
  actionUrl,
}: SendAuthEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const copy = getCopy(kind, locale);
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: AUTH_EMAIL_FROM,
    to,
    subject: copy.subject,
    html: renderAuthEmail({ kind, locale, actionUrl }),
    text: renderAuthEmailText({ kind, locale, actionUrl }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
