import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveRoleFor, getCachedAuthClaims, getCreatorHeader } from "@/lib/auth";
import { timed } from "@/lib/timing";
import { CreatorSidebar } from "../_components/creator-sidebar";
import { BalanceWidget } from "../_components/balance-widget";
import { BalanceSkeleton } from "../_components/page-skeletons";
import { ScopeErrorDialog } from "@/components/auth/scope-error-dialog";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const claims = await timed("creator-layout/auth", () => getCachedAuthClaims());
  if (!claims) redirect("/sign-in");

  const [role, header] = await timed("creator-layout/role+header", () =>
    Promise.all([resolveRoleFor(claims), getCreatorHeader(claims.sub)]),
  );

  if (role !== "creator") redirect("/unauthorized");

  let userName = "Creator";
  let userId: string | null = null;

  if (header) {
    userId = header.id;
    if (header.creatorProfile) {
      userName = header.creatorProfile.displayName;
    }
  }

  return (
    <div className="creator-theme">
      <DashboardShell
        sidebar={
          <CreatorSidebar
            userName={userName}
            balanceSlot={
              userId ? (
                <Suspense fallback={<BalanceSkeleton />}>
                  <BalanceWidget userId={userId} />
                </Suspense>
              ) : (
                <BalanceSkeleton />
              )
            }
          />
        }
      >
        {children}
      </DashboardShell>
      <Suspense fallback={null}>
        <ScopeErrorDialog />
      </Suspense>
    </div>
  );
}
