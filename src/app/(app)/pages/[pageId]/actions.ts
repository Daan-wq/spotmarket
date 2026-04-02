"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updatePageSettings(
  pageId: string,
  data: { niche?: import("@prisma/client").Niche; displayLabel?: string }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile) redirect("/onboarding");

  // Verify page belongs to this creator
  const page = await prisma.socialAccount.findUnique({
    where: { id: pageId, creatorProfileId: user.creatorProfile.id },
    select: { id: true },
  });
  if (!page) throw new Error("Page not found or unauthorized");

  await prisma.socialAccount.update({ where: { id: pageId }, data });
  revalidatePath(`/pages/${pageId}`);
}
