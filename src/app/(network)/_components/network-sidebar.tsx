import Link from "next/link";

const navItems = [
  { href: "/network/dashboard", label: "Dashboard" },
  { href: "/network/campaigns", label: "Campaigns" },
  { href: "/network/members", label: "Members" },
  { href: "/network/earnings", label: "Earnings" },
];

export function NetworkSidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 gap-1">
      <div className="font-bold text-gray-900 text-lg mb-6 px-2">Network</div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
