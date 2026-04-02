import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopHeader } from "@/components/dashboard/top-header";
import { FsaConnector } from "./_components/fsa-connector";
import { DeviceManager } from "./_components/device-manager";

export default async function AutoPostSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: {
            where: { platform: "instagram", isActive: true },
            select: { id: true, platformUsername: true },
          },
        },
      },
      deviceTokens: {
        where: { revokedAt: null },
        select: { id: true, deviceName: true, deviceType: true, lastUsedAt: true, createdAt: true },
      },
    },
  });

  if (!user?.creatorProfile) redirect("/onboarding");

  return (
    <div style={{ padding: "24px", maxWidth: "800px" }}>
      <h2 style={{ color: "var(--text-primary)", fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>
        AutoPost Settings
      </h2>

      <FsaConnector
        igAccounts={JSON.parse(JSON.stringify(user.creatorProfile.socialAccounts))}
      />

      <div style={{ marginTop: "32px" }}>
        <DeviceManager
          devices={JSON.parse(JSON.stringify(user.deviceTokens))}
        />
      </div>
    </div>
  );
}
