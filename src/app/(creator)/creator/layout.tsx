import { Suspense } from "react";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreatorSidebar } from "../_components/creator-sidebar";
import { BalanceWidget } from "../_components/balance-widget";
import { BalanceSkeleton } from "../_components/page-skeletons";
import { TopBar } from "@/components/shared/top-bar";
import { ScopeErrorDialog } from "@/components/auth/scope-error-dialog";
import { RejectionAlertLoader } from "./_components/rejection-alert-loader";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isCreator = await checkRole("creator");
  if (!isCreator) redirect("/unauthorized");

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let userName = "Creator";
  let creatorProfileId: string | null = null;
  let dbUserId: string | null = null;
  const supabaseId: string | null = authUser?.id ?? null;

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        creatorProfile: { select: { displayName: true, id: true } },
      },
    });
    if (user) {
      dbUserId = user.id;
      if (user.creatorProfile) {
        userName = user.creatorProfile.displayName;
        creatorProfileId = user.creatorProfile.id;
      }
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
        <TopBar supabaseId={supabaseId} />
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>{children}</main>
      </div>
      <Suspense fallback={null}>
        <ScopeErrorDialog />
      </Suspense>
      {dbUserId && (
        <Suspense fallback={null}>
          <RejectionAlertLoader userId={dbUserId} />
        </Suspense>
      )}
    </div>
  );
}
