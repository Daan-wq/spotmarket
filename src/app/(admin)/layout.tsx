import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const isAdmin = await checkRole("admin");
  if (!isAdmin) redirect("/unauthorized");

  const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <AdminSidebar initials={initials} email={user.email ?? ""} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
