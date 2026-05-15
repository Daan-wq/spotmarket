import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding.page");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  if (user.user_metadata?.role === "admin") redirect("/admin");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (dbUser) {
    if (dbUser.role === "admin") redirect("/admin");
    redirect("/creator/campaigns");
  }

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
            {t("panelTitle")}
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("panelDescription")}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--dark-text-light)" }}>
          © {new Date().getFullYear()} ClipProfit
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-1 text-gray-900">
            {t("title")}
          </h1>
          <p className="text-sm mb-8 text-gray-500">
            {t("description")}
          </p>
          <Suspense><OnboardingForm /></Suspense>
        </div>
      </div>
    </div>
  );
}
