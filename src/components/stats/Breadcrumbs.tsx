import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      className="flex items-center gap-1.5 text-sm flex-wrap"
      style={{ color: "var(--text-muted)" }}
      aria-label="Breadcrumb"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: last ? "var(--text-primary)" : "var(--text-muted)" }}>
                {item.label}
              </span>
            )}
            {!last && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </span>
        );
      })}
    </nav>
  );
}
