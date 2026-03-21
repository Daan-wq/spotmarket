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
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <p className="text-[14px] font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-[13px] text-gray-500 max-w-[340px] mb-5">{description}</p>
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(({ label, href, variant = "primary" }) => (
            <Link
              key={label}
              href={href}
              className={`text-[13px] px-4 py-2 rounded-md ${
                variant === "primary"
                  ? "text-white"
                  : "border border-gray-300 text-gray-600 bg-white"
              }`}
              style={variant === "primary" ? { background: "#534AB7" } : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
