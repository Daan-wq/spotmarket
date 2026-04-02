import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--dark-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-8">
            <Logo variant="dark" size="sm" />
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
