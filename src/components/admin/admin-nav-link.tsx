"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavLinkProps {
  href: string;
  label: string;
}

export function AdminNavLink({ href, label }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="flex items-center px-[10px] py-[7px] rounded-md text-[13px] transition-colors hover:bg-gray-50"
      style={
        isActive
          ? { background: "#ffffff", color: "#534AB7", fontWeight: 500, border: "0.5px solid #e5e7eb" }
          : { color: "#64748b" }
      }
    >
      {label}
    </Link>
  );
}
