import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--dark-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>C</div>
            <span className="text-white font-semibold text-sm">ClipProfit</span>
          </Link>
        </div>
        <div className="rounded-xl p-8" style={{ background: "var(--dark-card)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Suspense>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
