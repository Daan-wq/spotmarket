"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OAuthButtons, OAuthDivider } from "@/components/auth/oauth-buttons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const [error, setError] = useState<string | null>(
    authError === "callback_failed" ? t("callbackFailed") : authError
  );
  const [success, setSuccess] = useState<string | null>(
    passwordReset ? t("passwordUpdated") : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirectUrl);
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(forgotT("success"));
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-zinc-50 placeholder:text-zinc-500";
  const inputStyle = { border: "1px solid #2a2a2a", background: "#18181b" };

  if (mode === "forgot") {
    return (
      <>
        <h1 className="mb-2 text-[24px] font-semibold leading-tight text-zinc-50">{forgotT("title")}</h1>
        <p className="mb-6 text-sm text-[#a1a1aa]">
          {forgotT("description")}
        </p>

        {success ? (
          <div className="space-y-4">
            <p className="rounded-lg px-3 py-3 text-sm" style={{ color: "#86efac", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}>
              {success}
            </p>
            <button
              type="button"
              onClick={() => { setMode("signin"); setSuccess(null); setError(null); }}
              className="text-sm font-medium text-zinc-50 hover:underline"
            >
              {forgotT("back")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium mb-1.5 text-[#d4d4d8]">{commonT("email")}</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#5865F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(88,101,242,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.boxShadow = "none"; }}
              />
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
              {loading ? forgotT("submitting") : forgotT("submit")}
            </button>

            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className="w-full text-center text-sm text-[#a1a1aa] hover:text-white"
            >
              {forgotT("back")}
            </button>
          </form>
        )}
      </>
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
