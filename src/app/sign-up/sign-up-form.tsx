"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { OAuthButtons, OAuthDivider } from "@/components/auth/oauth-buttons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth.signUp");
  const oauthT = useTranslations("auth.oauth");
  const commonT = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ticketId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-ticket?ticket=${ticketId}`);
        const data = await res.json();

        if (data.pending) return;

        // Ticket redeemed - clear polling and log in.
        if (pollRef.current) clearInterval(pollRef.current);

        if (!res.ok || !data.session) return;

        const supabase = createSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        const redirectTo = data.ref ? `/onboarding?ref=${data.ref}` : "/onboarding";
        router.push(redirectTo);
        router.refresh();
      } catch {
        // Network error - keep polling.
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ticketId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    const ref = searchParams.get("ref");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ref: ref || undefined }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || t("fallbackError"));
      setLoading(false);
      return;
    }

    posthog.capture("clipprofit_signup_completed", {
      has_referral: Boolean(ref),
      role: "creator",
    });
    setTicketId(data.ticketId);
    setEmailSent(true);
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-zinc-950";
  const inputStyle = { border: "1px solid var(--border)", background: "#ffffff" };

  if (emailSent) {
    return (
      <div>
        <h1 className="mb-2 text-[23px] font-semibold leading-tight text-zinc-950">{t("checkEmailTitle")}</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("checkEmailBody", { email })}
        </p>
        <p className="text-[13px]" style={{ color: "#666666" }}>
          {t("alreadyVerified")}{" "}
          <Link href="/sign-in" className="font-medium text-zinc-950 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-[23px] font-semibold leading-tight text-zinc-950">{t("title")}</h1>
      <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {t("subtitle")}
      </p>
      <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-zinc-950 hover:underline">
          {t("signIn")}
        </Link>
      </p>

      <OAuthButtons mode="signup" providers={["discord"]} />

      {showOtherMethods ? (
        <>
          <div className="mt-4">
            <OAuthButtons mode="signup" providers={["google"]} />
          </div>
          <OAuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sign-up-email" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{commonT("email")}</label>
              <input
                id="sign-up-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label htmlFor="sign-up-password" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {commonT("password")} <span style={{ color: "var(--text-secondary)" }}>({t("passwordHint")})</span>
              </label>
              <input
                id="sign-up-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label htmlFor="sign-up-confirm-password" className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("confirmPassword")}</label>
              <input
                id="sign-up-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--error-text)", background: "var(--error-bg)", border: "1px solid rgba(239,68,68,0.18)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowOtherMethods(true)}
          className="mt-4 w-full text-center text-[13px] font-medium text-[#666666] transition-colors hover:text-zinc-950"
        >
          {oauthT("signUpOther")}
        </button>
      )}
    </>
  );
}
