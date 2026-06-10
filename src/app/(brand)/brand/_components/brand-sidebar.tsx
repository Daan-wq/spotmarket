"use client";

import Link from "next/link";
import { Clapperboard, FileText, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";

interface BrandSidebarProps {
  email: string;
  brandNames: string[];
  isAdminPreview: boolean;
}

export function BrandSidebar({ email, brandNames, isAdminPreview }: BrandSidebarProps) {
  const pathname = usePathname();
  const primaryBrand = isAdminPreview ? "Admin preview" : brandNames[0] ?? "Brand";
  const navigation = [
    { href: "/brand", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/brand" },
    { href: "/brand/content", label: "Content", icon: Clapperboard, active: pathname.startsWith("/brand/content") },
    { href: "/brand/reports", label: "Rapporten", icon: FileText, active: pathname.startsWith("/brand/reports") },
  ];

  return (
    <aside className="fixed left-8 top-0 hidden h-screen w-56 flex-col py-10 lg:flex">
      <div className="mb-8">
        <Link href="/brand" aria-label="ClipProfit Brands" className="block">
          <Logo variant="light" size="fill" />
        </Link>
        <p className="mt-1 text-xs text-neutral-500">Brands</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                item.active
                  ? "bg-neutral-200 text-neutral-950"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3">
        <p className="truncate text-sm font-semibold text-neutral-950">{primaryBrand}</p>
        <p className="mt-1 truncate text-xs text-neutral-500">{email}</p>
        <a href="/api/auth/signout" className="mt-3 block text-sm font-medium text-neutral-500 hover:text-neutral-950">
          Uitloggen
        </a>
      </div>
    </aside>
  );
}
