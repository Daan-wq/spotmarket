import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: "#ffffff", color: "#111827" }}>S</div>
            <span className="text-white font-semibold text-sm">Spotmarket</span>
          </a>
        </div>
        <div className="rounded-xl p-8" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Suspense>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
