import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const NAV = [
  { label: "MARKETPLACE", items: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/campaigns", label: "Campaigns" },
    { href: "/admin/creators", label: "Creators" },
    { href: "/admin/payouts", label: "Payouts" },
  ]},
  { label: "OPS", items: [
    { href: "/admin/clients", label: "Clients" },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/internal-campaigns", label: "Internal Campaigns" },
    { href: "/admin/finances", label: "Finances" },
  ]},
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== "admin") redirect("/unauthorized");

  return (
    <div className="flex h-screen" style={{ background: "#f8fafc" }}>
      <aside
        className="w-60 flex flex-col shrink-0"
        style={{ background: "#0b0f1a" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #1e2a40" }}>
          <span className="text-white font-semibold text-base tracking-tight">Spotmarket</span>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {NAV.map(({ label, items }) => (
            <div key={label}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>
                {label}
              </p>
              {items.map(({ href, label: itemLabel }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#1e2a40";
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                  }}
                >
                  {itemLabel}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid #1e2a40" }}>
          <a
            href="/api/auth/signout"
            className="flex items-center px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "#475569" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#475569";
            }}
          >
            Sign out
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
