"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateNotifications(formData: FormData) {
  const authUser = await getAuthUser();

  const notifyCampaignAlerts = formData.get("notifyCampaignAlerts") === "true";
  const notifyPayoutAlerts = formData.get("notifyPayoutAlerts") === "true";

  await prisma.user.update({
    where: { supabaseId: authUser.id },
    data: { notifyCampaignAlerts, notifyPayoutAlerts },
  });

  return { success: true };
}

export async function deleteAccount() {
  const authUser = await getAuthUser();

  // Delete from Supabase Auth (cascade handles DB records via Prisma onDelete)
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(authUser.id);

  if (error) return { error: error.message };

  redirect("/sign-in");
}
