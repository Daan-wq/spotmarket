"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticket = searchParams.get("ticket");

  async function handleConfirm() {
    if (!ticket) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/redeem-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Verification failed. Please try again.");
      setLoading(false);
      return;
    }

    // Set the session client-side
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    const redirectTo = data.ref ? `/onboarding?ref=${data.ref}` : "/onboarding";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo variant="dark" size="sm" />
          </Link>
        </div>
        <div className="rounded-xl p-8 text-center" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          {ticket ? (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent-bg)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold mb-2 text-white">Confirm your account</h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Click the button below to verify your email and activate your ClipProfit account.
              </p>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg mb-4" style={{ color: "#fca5a5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: "var(--accent)" }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                {loading ? "Confirming…" : "Confirm my account"}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-2 text-white">Invalid link</h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                This verification link is invalid or has expired.
              </p>
              <Link
                href="/sign-up"
                className="w-full block py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                Sign up again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
