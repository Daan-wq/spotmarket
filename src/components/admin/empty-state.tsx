import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href: string;
  variant?: "primary" | "outline";
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-secondary)",
        }}
      >
        {icon}
      </div>
      <p className="text-[14px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <p
        className="text-[13px] max-w-[340px] mb-5"
        style={{ color: "var(--text-secondary)" }}
      >
        {description}
      </p>
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(({ label, href, variant = "primary" }) => (
            <Link
              key={label}
              href={href}
              className={`text-[13px] px-4 py-2 rounded-md ${
                variant === "primary"
                  ? "text-white"
                  : "text-gray-600"
              }`}
              style={
                variant === "primary"
                  ? { background: "var(--accent)" }
                  : {
                      border: "1px solid var(--border)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
