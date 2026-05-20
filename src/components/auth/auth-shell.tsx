import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 py-10 text-zinc-950">
      <div className="auth-page-enter mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col items-center justify-center">
        <Link href="/" className="mb-11 inline-flex" aria-label="ClipProfit home">
          <Logo variant="light" size="md" />
        </Link>
        <section
          className="w-full rounded-[22px] border border-[#242424] bg-[#111111] p-8 shadow-[0_18px_54px_rgba(0,0,0,0.16)] sm:p-10"
          aria-label="Authentication"
        >
          {children}
        </section>
      </div>
    </main>
  );
}
