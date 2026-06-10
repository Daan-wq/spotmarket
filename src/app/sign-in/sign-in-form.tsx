"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OAuthButtons, OAuthDivider } from "@/components/auth/oauth-buttons";
import { TurnstileChallenge } from "@/components/auth/turnstile-challenge";
import { safeRedirectPath } from "@/lib/safe-redirect";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth.signIn");
  const forgotT = useTranslations("auth.forgot");
  const oauthT = useTranslations("auth.oauth");
  const commonT = useTranslations("common");
  const redirectUrl = safeRedirectPath(searchParams.get("redirect_url"), "/");

  const passwordReset = searchParams.get("reset") === "1";
  const authError = searchParams.get("auth_error");
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [challengeSiteKey, setChallengeSiteKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError === "callback_failed"
      ? t("callbackFailed")
      : authError === "recovery_failed"
        ? t("recoveryFailed")
        : authError
  );
  const [success, setSuccess] = useState<string | null>(
    passwordReset ? t("passwordUpdated") : null
  );
  const [loading, setLoading] = useState(false);

  async function submitSignIn(turnstileToken?: string) {
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, turnstileToken }),
    });
    const data = await response.json().catch(() => null);

    if (response.status === 428 && data?.challengeRequired && data?.siteKey) {
      setChallengeSiteKey(data.siteKey);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setChallengeSiteKey(null);
      setError(data?.error || t("callbackFailed"));
      setLoading(false);
      return;
    }

    setChallengeSiteKey(null);
    router.push(redirectUrl);
    router.refresh();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    await submitSignIn();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);

    setLoading(false);

    if (!response.ok) {
      setError(data?.error || forgotT("failed"));
      return;
    }

    setSuccess(forgotT("success"));
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-zinc-50 placeholder:text-zinc-500";
  const inputStyle = { border: "1px solid #2a2a2a", background: "#18181b" };

  if (mode === "forgot") {
    return (
      <div className="-m-8 rounded-[20px] bg-[#f7f9f9] p-8 text-[#010405] sm:-m-10 sm:p-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="mb-4 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#5d5fef] to-[#3f41b3]" aria-hidden="true" />
            <h1 className="text-[32px] font-extrabold leading-[1.02] text-[#010405] sm:text-[40px]">{forgotT("title")}</h1>
          </div>
          <span className="mt-1 h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] shadow-[0_16px_34px_rgba(93,95,239,0.24)]" aria-hidden="true" />
        </div>
        <p className="mb-7 text-[15px] leading-6 text-[#5a6569]">
          {forgotT("description")}
        </p>

        {success ? (
          <div className="space-y-5">
            <p
              className="rounded-[18px] border border-[#bdebd3] bg-[#e7fbef] px-4 py-4 text-sm font-medium leading-6 text-[#047857]"
              aria-live="polite"
            >
              {success}
            </p>
            <button
              type="button"
              onClick={() => { setMode("signin"); setSuccess(null); setError(null); }}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#303295] transition-colors hover:bg-[#e8e6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d5fef]"
            >
              {forgotT("back")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-[#282f31]">{commonT("email")}</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-12 w-full rounded-[18px] border border-[#d2d9db] bg-white px-4 text-sm text-[#010405] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#8a9699] focus:border-[#5d5fef] focus:bg-white focus:shadow-[0_0_0_4px_rgba(93,95,239,0.14)]"
              />
            </div>

            {error && (
              <p className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-medium leading-6 text-[#be123c]" aria-live="assertive">
                {error}
              </p>
            )}

            {challengeSiteKey && (
              <TurnstileChallenge
                siteKey={challengeSiteKey}
                onToken={(token) => void submitSignIn(token)}
                onError={() => setError(t("callbackFailed"))}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] text-sm font-bold text-white shadow-[0_16px_34px_rgba(93,95,239,0.24)] transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:opacity-55 disabled:hover:brightness-100"
            >
              {loading ? forgotT("submitting") : forgotT("submit")}
            </button>

            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className="w-full rounded-full py-2 text-center text-sm font-semibold text-[#5a6569] transition-colors hover:bg-[#e8eced] hover:text-[#010405] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d5fef]"
            >
              {forgotT("back")}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-[24px] font-semibold leading-tight text-zinc-50">{t("title")}</h1>
      <p className="mb-3 text-sm text-[#a1a1aa]">
        {t("subtitle")}
      </p>
      <p className="mb-6 text-sm text-[#a1a1aa]">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-white hover:underline">
          {t("createOne")}
        </Link>
      </p>

      {success && (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ color: "#86efac", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}>
          {success}
        </p>
      )}

      {error && !showOtherMethods && (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ color: "#fecaca", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.24)" }}>
          {error}
        </p>
      )}

      <OAuthButtons mode="signin" providers={["discord"]} />

      {showOtherMethods ? (
        <>
          <div className="mt-4">
            <OAuthButtons mode="signin" providers={["google"]} />
          </div>
          <OAuthDivider />

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="sign-in-email" className="block text-sm font-medium mb-1.5 text-[#d4d4d8]">{commonT("email")}</label>
              <input
                id="sign-in-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#5865F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(88,101,242,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="sign-in-password" className="text-sm font-medium text-[#d4d4d8]">{commonT("password")}</label>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(null); }}
                  className="text-xs text-[#a1a1aa] hover:text-white"
                >
                  {t("forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#5865F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(88,101,242,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#a1a1aa" }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ color: "#fecaca", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.24)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-sm font-semibold text-zinc-950 transition-opacity disabled:opacity-50"
              style={{ background: "#ffffff" }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowOtherMethods(true)}
          className="mt-5 w-full text-center text-[13px] font-medium text-[#a1a1aa] transition-colors hover:text-white"
        >
          {oauthT("signInOther")}
        </button>
      )}
    </>
  );
}
