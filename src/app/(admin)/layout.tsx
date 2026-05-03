import { redirect } from "next/navigation";
import { getCachedAuthUser, resolveRoleFor } from "@/lib/auth";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedAuthUser();
  if (!user) redirect("/sign-in");

  const role = await resolveRoleFor(user);
  if (role !== "admin") redirect("/unauthorized");

  const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <AdminSidebar initials={initials} email={user.email ?? ""} />
      <main className="flex-1 overflow-auto admin-content">{children}</main>
    </div>
  );
}
