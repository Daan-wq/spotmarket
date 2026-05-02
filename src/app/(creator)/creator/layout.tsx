import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentRole, getCachedAuthUser, getCreatorHeader } from "@/lib/auth";
import { CreatorSidebar } from "../_components/creator-sidebar";
import { BalanceWidget } from "../_components/balance-widget";
import { BalanceSkeleton } from "../_components/page-skeletons";
import { TopBar } from "@/components/shared/top-bar";
import { ScopeErrorDialog } from "@/components/auth/scope-error-dialog";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (role !== "creator") redirect("/unauthorized");

  const authUser = await getCachedAuthUser();

  let userName = "Creator";
  let creatorProfileId: string | null = null;

  if (authUser) {
    const header = await getCreatorHeader(authUser.id);
    if (header?.creatorProfile) {
      userName = header.creatorProfile.displayName;
      creatorProfileId = header.creatorProfile.id;
    }
  }

  return (
    <div className="creator-theme flex h-screen">
      <CreatorSidebar
        userName={userName}
        balanceSlot={
          creatorProfileId ? (
            <Suspense fallback={<BalanceSkeleton />}>
              <BalanceWidget creatorProfileId={creatorProfileId} />
            </Suspense>
          ) : (
            <BalanceSkeleton />
          )
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>{children}</main>
      </div>
      <Suspense fallback={null}>
        <ScopeErrorDialog />
      </Suspense>
    </div>
  );
}
