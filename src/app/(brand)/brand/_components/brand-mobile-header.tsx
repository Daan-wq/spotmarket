import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function BrandMobileHeader({
  brandName,
  isAdminPreview,
}: {
  brandName: string;
  isAdminPreview: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="min-w-0">
        <Link href="/brand" aria-label="ClipProfit brand dashboard" className="block w-32">
          <Logo variant="light" size="fill" />
        </Link>
        <p className="mt-1 truncate text-xs text-neutral-500">
          {isAdminPreview ? "Admin preview" : brandName}
        </p>
      </div>
      <a href="/api/auth/signout" className="text-sm font-semibold text-neutral-600 hover:text-neutral-950">
        Uitloggen
      </a>
    </div>
  );
}
