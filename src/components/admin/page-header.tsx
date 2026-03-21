import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-medium text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] text-white px-4 py-2 rounded-md"
          style={{ background: "#534AB7" }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
