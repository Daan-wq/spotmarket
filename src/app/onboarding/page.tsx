import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/shared/logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  if (user.user_metadata?.role === "admin") redirect("/admin");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (dbUser) redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10"
        style={{ background: "var(--dark-panel)" }}
      >
        <Logo variant="dark" size="sm" />
        <div>
          <p className="text-2xl font-semibold text-white leading-snug mb-3">
            Almost there. Let&apos;s set up your account.
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Just one step before you can start browsing campaigns and tracking earnings.
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--dark-text-light)" }}>
          © {new Date().getFullYear()} ClipProfit
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Welcome to ClipProfit
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Tell us what to call you.
          </p>
          <Suspense><OnboardingForm /></Suspense>
        </div>
      </div>
    </div>
  );
}
