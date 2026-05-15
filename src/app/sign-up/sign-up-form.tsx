"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import Link from "next/link";
import { OAuthButtons, OAuthDivider } from "@/components/auth/oauth-buttons";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

        // Ticket redeemed — clear polling and log in
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
        // Network error — keep polling
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
      setError("Passwords do not match.");
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
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setTicketId(data.ticketId);
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Logo variant="dark" size="sm" />
            </Link>
          </div>
          <div className="rounded-xl p-8 text-center" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent-bg)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-2 text-white">Check your email</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              We sent a verification link to <span className="text-white font-medium">{email}</span>. Click it to activate your account and get started.
            </p>
            <p className="text-xs" style={{ color: "#d4d4d8" }}>
              Already verified?{" "}
              <Link href="/sign-in" className="font-medium text-white hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo variant="dark" size="sm" />
          </Link>
        </div>
        <div className="rounded-xl p-8" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h1 className="text-xl font-semibold mb-1 text-white">Create account</h1>
          <p className="text-sm mb-6" style={{ color: "#d4d4d8" }}>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-white hover:underline">
              Sign in
            </Link>
          </p>

          <OAuthButtons mode="signup" />
          <OAuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-white"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password <span style={{ color: "var(--text-secondary)" }}>(min 6 chars)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-white"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-white"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#fca5a5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
