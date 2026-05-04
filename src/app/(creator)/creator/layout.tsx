import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreatorSidebar } from "../_components/creator-sidebar";
import { TopBar } from "@/components/shared/top-bar";

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
  let availableBalance = 0;
  let pendingBalance = 0;

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        creatorProfile: { select: { displayName: true, id: true } },
      },
    });
    if (user?.creatorProfile) {
      userName = user.creatorProfile.displayName;

      const [available, pending] = await Promise.all([
        prisma.payout.aggregate({
          where: { creatorProfileId: user.creatorProfile.id, status: "confirmed" },
          _sum: { amount: true },
        }),
        prisma.payout.aggregate({
          where: { creatorProfileId: user.creatorProfile.id, status: "pending" },
          _sum: { amount: true },
        }),
      ]);
      availableBalance = Number(available._sum.amount ?? 0);
      pendingBalance = Number(pending._sum.amount ?? 0);
    }
  }

  return (
    <div className="creator-theme flex h-screen">
      <CreatorSidebar
        userName={userName}
        availableBalance={availableBalance}
        pendingBalance={pendingBalance}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>{children}</main>
      </div>
    </div>
  );
}
