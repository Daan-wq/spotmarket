import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedAuthClaims, resolveRoleFor } from "@/lib/auth";
import { AdminSidebar } from "./_components/admin-sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const claims = await getCachedAuthClaims();
  if (!claims) redirect("/sign-in");

  const role = await resolveRoleFor(claims);
  if (role !== "admin") redirect("/unauthorized");

  const email = claims.email ?? "";
  const initials = email.slice(0, 1).toUpperCase() || "A";

  return (
    <DashboardShell sidebar={<AdminSidebar initials={initials} email={email} />} mainClassName="admin-content">
      {children}
    </DashboardShell>
  );
}
