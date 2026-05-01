"use client";

import { useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => onChange(val), 300);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder="Search by caption…"
        className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}
