"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { OAuthButtons, OAuthDivider } from "@/components/auth/oauth-buttons";
import { TurnstileChallenge } from "@/components/auth/turnstile-challenge";
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
  const [challengeSiteKey, setChallengeSiteKey] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function buildOnboardingPath(data: {
    ref?: string | null;
    campaign?: string | null;
    click?: string | null;
  }) {
    const params = new URLSearchParams();
    if (data.ref) params.set("ref", data.ref);
    if (data.campaign) params.set("campaign", data.campaign);
    if (data.click) params.set("click", data.click);
    const query = params.toString();
    return query ? `/onboarding?${query}` : "/onboarding";
  }

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

        router.push(buildOnboardingPath(data));
        router.refresh();
      } catch {
        // Network error - keep polling.
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ticketId, router]);

  async function submitSignup(turnstileToken?: string) {
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    const ref = searchParams.get("ref");
    const campaign = searchParams.get("campaign");
    const click = searchParams.get("click");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ref: ref || undefined,
        campaign: campaign || undefined,
        click: click || undefined,
        turnstileToken,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 428 && data?.challengeRequired && data?.siteKey) {
      setChallengeSiteKey(data.siteKey);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setChallengeSiteKey(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitSignup();
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-zinc-50 placeholder:text-zinc-500";
  const inputStyle = { border: "1px solid #2a2a2a", background: "#18181b" };

  if (emailSent) {
    return (
      <div>
        <h1 className="mb-2 text-[24px] font-semibold leading-tight text-zinc-50">{t("checkEmailTitle")}</h1>
        <p className="mb-6 text-sm text-[#a1a1aa]">
          {t("checkEmailBody", { email })}
        </p>
        <p className="text-[13px] text-[#a1a1aa]">
          {t("alreadyVerified")}{" "}
          <Link href="/sign-in" className="font-medium text-white hover:underline">
            {t("signIn")}
          </Link>
        </p>
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
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-white hover:underline">
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
              <label htmlFor="sign-up-email" className="mb-1.5 block text-sm font-medium text-[#d4d4d8]">{commonT("email")}</label>
              <input
                id="sign-up-email"
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
              <label htmlFor="sign-up-password" className="mb-1.5 block text-sm font-medium text-[#d4d4d8]">
                {commonT("password")} <span className="text-[#a1a1aa]">({t("passwordHint")})</span>
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
                onFocus={(e) => { e.currentTarget.style.borderColor = "#5865F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(88,101,242,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label htmlFor="sign-up-confirm-password" className="mb-1.5 block text-sm font-medium text-[#d4d4d8]">{t("confirmPassword")}</label>
              <input
                id="sign-up-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
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

            {challengeSiteKey && (
              <TurnstileChallenge
                siteKey={challengeSiteKey}
                onToken={(token) => void submitSignup(token)}
                onError={() => setError(t("fallbackError"))}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-sm font-semibold text-zinc-950 transition-opacity disabled:opacity-50"
              style={{ background: "#ffffff" }}
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
          className="mt-5 w-full text-center text-[13px] font-medium text-[#a1a1aa] transition-colors hover:text-white"
        >
          {oauthT("signUpOther")}
        </button>
      )}
    </>
  );
}
