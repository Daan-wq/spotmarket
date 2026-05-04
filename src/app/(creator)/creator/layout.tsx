import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveRoleFor, getCachedAuthClaims } from "@/lib/auth";
import { timed } from "@/lib/timing";
import { CreatorSidebar } from "../_components/creator-sidebar";
import { BalanceWidget } from "../_components/balance-widget";
import { BalanceSkeleton } from "../_components/page-skeletons";
import {
  CreatorIdentity,
  CreatorIdentitySkeleton,
} from "../_components/creator-identity";
import { ScopeErrorDialog } from "@/components/auth/scope-error-dialog";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const claims = await timed("creator-layout/auth", () => getCachedAuthClaims());
  if (!claims) redirect("/sign-in");

  const role = await timed("creator-layout/role", () => resolveRoleFor(claims));
  if (role !== "creator") redirect("/unauthorized");

  const supabaseId = claims.sub;

  return (
    <div className="creator-theme">
      <DashboardShell
        sidebar={
          <CreatorSidebar
            identitySlot={
              <Suspense fallback={<CreatorIdentitySkeleton />}>
                <CreatorIdentity supabaseId={supabaseId} />
              </Suspense>
            }
            balanceSlot={
              <Suspense fallback={<BalanceSkeleton />}>
                <BalanceWidget supabaseId={supabaseId} />
              </Suspense>
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
