import { redirect } from "next/navigation";
import { getCachedAuthClaims, resolveRoleFor } from "@/lib/auth";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = await getCachedAuthClaims();
  if (!claims) redirect("/sign-in");

  const role = await resolveRoleFor(claims);
  if (role !== "admin") redirect("/unauthorized");

  const email = claims.email ?? "";
  const initials = email.slice(0, 1).toUpperCase() || "A";

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <AdminSidebar initials={initials} email={email} />
      <main className="flex-1 overflow-auto admin-content">{children}</main>
    </div>
  );
}
