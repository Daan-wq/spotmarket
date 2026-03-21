import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { checkRole } from "@/lib/auth";

const NAV = [
  {
    label: "OVERVIEW",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "CAMPAIGNS",
    items: [
      { href: "/admin/campaigns", label: "All campaigns" },
      { href: "/admin/submissions", label: "Submissions" },
    ],
  },
  {
    label: "NETWORK",
    items: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/creators", label: "Creators" },
      { href: "/admin/networks", label: "Networks" },
    ],
  },
  {
    label: "MONEY",
    items: [
      { href: "/admin/payouts", label: "Payouts" },
      { href: "/admin/invoices", label: "Invoices" },
    ],
  },
  {
    label: "CLIENTS",
    items: [
      { href: "/admin/clients", label: "Direct clients" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const isAdmin = await checkRole("admin");
  if (!isAdmin) redirect("/unauthorized");

  const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-[200px] flex flex-col shrink-0 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: "#534AB7" }}
            >
              S
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">Spotmarket</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
          {NAV.map(({ label, items }) => (
            <div key={label}>
              <p
                className="px-[10px] mb-1 text-[11px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "#94a3b8" }}
              >
                {label}
              </p>
              {items.map(({ href, label: itemLabel }) => (
                <AdminNavLink key={href} href={href} label={itemLabel} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-1">
          <div className="flex items-center gap-2 px-[10px] py-[7px]">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
              style={{ background: "#534AB7" }}
            >
              {initials}
            </div>
            <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
          </div>
          <a
            href="/api/auth/signout"
            className="flex items-center px-[10px] py-[7px] rounded-md text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Log out
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
