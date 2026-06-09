import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PostHogIdentify } from "@/components/providers/posthog-identify";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { BrandMobileHeader } from "./_components/brand-mobile-header";
import { BrandSidebar } from "./_components/brand-sidebar";

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const context = await getBrandPortalContext();
  const brandNames = context.memberships.map((membership) => membership.brand.name);
  const identifyUserId = context.user?.id ?? "admin-brand-preview";

  return (
    <DashboardShell
      sidebar={<BrandSidebar email={context.email} brandNames={brandNames} isAdminPreview={context.isAdminPreview} />}
      mobileChrome={
        <BrandMobileHeader
          brandName={brandNames[0] ?? "Brand"}
          isAdminPreview={context.isAdminPreview}
        />
      }
      mainClassName="brand-content"
    >
      <PostHogIdentify userId={identifyUserId} role={context.isAdminPreview ? "admin" : "brand"} />
      {children}
    </DashboardShell>
  );
}
