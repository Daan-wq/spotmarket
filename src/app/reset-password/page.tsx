"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/shared/logo";
import Link from "next/link";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth.reset");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/sign-in?reset=1");
  }

  const inputClass =
    "h-12 w-full rounded-[18px] border border-[#d2d9db] bg-white px-4 text-sm text-[#010405] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#8a9699] focus:border-[#5d5fef] focus:bg-white focus:shadow-[0_0_0_4px_rgba(93,95,239,0.14)]";

  return (
    <main className="min-h-screen bg-[#f7f9f9] px-4 py-10 text-[#010405]">
      <div className="auth-page-enter mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col items-center justify-center">
        <div className="mb-11 text-center">
          <Link href="/" className="inline-block">
            <Logo variant="light" size="md" />
          </Link>
        </div>

        <section
          className="w-full overflow-hidden rounded-[24px] border border-[#d2d9db] bg-[#fbfcfc] p-8 shadow-[0_2px_8px_rgba(23,33,54,0.08),0_18px_48px_rgba(23,33,54,0.08)] sm:p-10"
          aria-labelledby="reset-password-title"
        >
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <span className="mb-4 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#5d5fef] to-[#3f41b3]" aria-hidden="true" />
              <h1 id="reset-password-title" className="text-[32px] font-extrabold leading-[1.02] text-[#010405] sm:text-[40px]">{t("title")}</h1>
            </div>
            <span className="mt-1 h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] shadow-[0_16px_34px_rgba(93,95,239,0.24)]" aria-hidden="true" />
          </div>
          <p className="mb-7 text-[15px] leading-6 text-[#5a6569]">{t("description")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[#282f31]">{t("newPassword")}</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5a6569] transition-colors hover:bg-[#e8eced] hover:text-[#010405]"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#282f31]">{t("confirmPassword")}</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className={`${inputClass} pr-11`}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-medium leading-6 text-[#be123c]" aria-live="assertive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-gradient-to-br from-[#5d5fef] to-[#3f41b3] text-sm font-bold text-white shadow-[0_16px_34px_rgba(93,95,239,0.24)] transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:opacity-55 disabled:hover:brightness-100"
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
