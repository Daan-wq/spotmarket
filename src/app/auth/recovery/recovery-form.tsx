"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/shared/logo";

export function RecoveryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth.recovery");
  const tokenHash = searchParams.get("token_hash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!tokenHash) return;

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/password-reset/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenHash }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.error || t("failed"));
      setLoading(false);
      return;
    }

    router.replace("/reset-password");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f9f9] px-4 py-10 text-[#010405]">
      <div className="auth-page-enter mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col items-center justify-center">
        <Link href="/" className="mb-11 inline-block" aria-label="ClipProfit home">
          <Logo variant="light" size="md" />
        </Link>

        <section
          className="w-full overflow-hidden rounded-[24px] border border-[#d2d9db] bg-[#fbfcfc] p-8 shadow-[0_2px_8px_rgba(23,33,54,0.08),0_18px_48px_rgba(23,33,54,0.08)] sm:p-10"
          aria-labelledby="recovery-title"
        >
          <span
            className="mb-5 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#5d5fef] to-[#3f41b3]"
            aria-hidden="true"
          />

          {tokenHash ? (
            <>
              <h1
                id="recovery-title"
                className="text-[32px] font-extrabold leading-[1.02] text-[#010405] sm:text-[40px]"
              >
                {t("title")}
              </h1>
              <p className="mb-7 mt-4 text-[15px] leading-6 text-[#5a6569]">
                {t("description")}
              </p>

              {error && (
                <p
                  className="mb-5 rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-medium leading-6 text-[#be123c]"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="h-12 w-full rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] text-sm font-bold text-white shadow-[0_16px_34px_rgba(93,95,239,0.24)] transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:opacity-55 disabled:hover:brightness-100"
              >
                {loading ? t("submitting") : t("button")}
              </button>
            </>
          ) : (
            <>
              <h1
                id="recovery-title"
                className="text-[32px] font-extrabold leading-[1.02] text-[#010405] sm:text-[40px]"
              >
                {t("invalidTitle")}
              </h1>
              <p className="mb-7 mt-4 text-[15px] leading-6 text-[#5a6569]">
                {t("invalidBody")}
              </p>
              <Link
                href="/sign-in"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] text-sm font-bold text-white shadow-[0_16px_34px_rgba(93,95,239,0.24)]"
              >
                {t("back")}
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
