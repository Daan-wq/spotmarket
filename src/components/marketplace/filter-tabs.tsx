"use client";

import { CATEGORIES, type Category } from "@/data/mock-campaigns";

type FilterTabsProps = {
  active: Category;
  onChange: (cat: Category) => void;
  counts: Record<string, number>;
};

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
      {CATEGORIES.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer"
            style={{
              background: isActive ? "#111827" : "transparent",
              color: isActive ? "#ffffff" : "#6b7280",
              border: isActive ? "1px solid #111827" : "1px solid transparent",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = "#111827";
                (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = "#6b7280";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }
            }}
          >
            {cat}
            {counts[cat] !== undefined && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  background: isActive ? "rgba(255,255,255,0.15)" : "#f3f4f6",
                  color: isActive ? "#fff" : "#9ca3af",
                }}
              >
                {counts[cat]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
