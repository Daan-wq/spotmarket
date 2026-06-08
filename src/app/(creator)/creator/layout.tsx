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
import { MobileCreatorChrome } from "../_components/mobile-creator-chrome";
import { ScopeErrorDialog } from "@/components/auth/scope-error-dialog";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FirstClipCoach } from "@/components/onboarding/first-clip-coach";
import { PostHogIdentify } from "@/components/providers/posthog-identify";
import { ConnectionHealthAlertLoader } from "@/components/connection-health/connection-health-alert-loader";

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
        mobileChrome={
          <MobileCreatorChrome
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
        <PostHogIdentify userId={supabaseId} role="creator" />
        <Suspense fallback={null}>
          <FirstClipCoach supabaseId={supabaseId} />
        </Suspense>
        <Suspense fallback={null}>
          <ConnectionHealthAlertLoader
            supabaseId={supabaseId}
            viewerRole="creator"
          />
        </Suspense>
        {children}
      </DashboardShell>
      <Suspense fallback={null}>
        <ScopeErrorDialog />
      </Suspense>
    </div>
  );
}
