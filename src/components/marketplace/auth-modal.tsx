"use client";

import Link from "next/link";
import { useEffect } from "react";

type AuthModalProps = {
  campaignName: string;
  onClose: () => void;
};

export function AuthModal({ campaignName, onClose }: AuthModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 relative"
        style={{ background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 20px 48px rgba(0,0,0,0.14)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "#f3f4f6";
            (e.currentTarget as HTMLElement).style.color = "#111827";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9ca3af";
          }}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <h2 className="text-base font-bold mb-1" style={{ color: "#111827" }}>
          Sign up to apply
        </h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: "#6b7280" }}>
          Create a free account to apply for{" "}
          <span className="font-medium" style={{ color: "#111827" }}>{campaignName}</span>.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { value: "200+", label: "Campaigns" },
            { value: "€2M+", label: "Paid out" },
            { value: "8,400+", label: "Creators" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="rounded-lg px-2 py-2.5 text-center"
              style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
            >
              <p className="text-sm font-bold" style={{ color: "#111827" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/sign-up"
          className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity mb-2.5"
          style={{ background: "#111827" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Create free account
        </Link>

        <p className="text-center text-xs" style={{ color: "#9ca3af" }}>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold transition-colors"
            style={{ color: "#111827" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
