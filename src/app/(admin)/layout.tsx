import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCachedAuthClaims, resolveRoleFor } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminLocaleDomTranslator } from "./_components/admin-locale-dom-translator";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PostHogIdentify } from "@/components/providers/posthog-identify";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const claims = await getCachedAuthClaims();
  if (!claims) redirect("/sign-in");

  const role = await resolveRoleFor(claims);
  if (role !== "admin") redirect("/unauthorized");

  const email = claims.email ?? "";
  const initials = email.slice(0, 1).toUpperCase() || "A";
  const locale = (await getLocale()) as Locale;

  return (
    <DashboardShell sidebar={<AdminSidebar initials={initials} email={email} />} mainClassName="admin-content">
      <AdminLocaleDomTranslator locale={locale} />
      <PostHogIdentify userId={claims.sub} role="admin" />
      {children}
    </DashboardShell>
  );
}
