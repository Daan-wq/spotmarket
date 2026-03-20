"use client";

import Link from "next/link";

export function PublicNav() {
  return (
    <nav
      className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-3 rounded-xl"
      style={{
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: "#ffffff", color: "#111827" }}>S</div>
        <span className="text-white font-semibold text-sm">Spotmarket</span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="hidden md:inline-flex text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
        >
          Log in
        </Link>
        <Link
          href="/sign-up"
          className="text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-opacity"
          style={{ background: "#ffffff", color: "#111827" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Sign up
        </Link>
      </div>
    </nav>
  );
}
