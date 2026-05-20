import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-zinc-950">
      <div className="auth-page-enter mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[400px] flex-col items-center justify-center">
        <Link href="/" className="mb-10 inline-flex" aria-label="ClipProfit home">
          <Logo variant="light" size="md" />
        </Link>
        <section
          className="w-full rounded-[20px] border border-[#eeeeee] bg-[#fafafa] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          aria-label="Authentication"
        >
          {children}
        </section>
      </div>
    </main>
  );
}
