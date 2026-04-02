import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PostLog } from "./_components/post-log";

export default async function LogPage() {
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
    },
  });

  if (!user?.creatorProfile) redirect("/onboarding");

  return (
    <PostLog
      igAccounts={JSON.parse(JSON.stringify(user.creatorProfile.socialAccounts))}
    />
  );
}
