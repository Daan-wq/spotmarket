"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resolveConnectionHealthIncident } from "@/lib/connection-health";

export async function removePage(connectionId: string) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) throw new Error("Creator profile not found");

  // Verify ownership before deleting
  const conn = await prisma.creatorIgConnection.findFirst({
    where: { id: connectionId, creatorProfileId: user.creatorProfile.id },
  });

  if (!conn) throw new Error("Page not found");

  await resolveConnectionHealthIncident("IG", connectionId, "UNLINKED");
  await prisma.creatorIgConnection.delete({ where: { id: connectionId } });

  // If no verified connections remain, unset isVerified on profile
  const remaining = await prisma.creatorIgConnection.findFirst({
    where: { creatorProfileId: user.creatorProfile.id, isVerified: true },
  });

  if (!remaining) {
    await prisma.creatorProfile.update({
      where: { id: user.creatorProfile.id },
      data: { isVerified: false },
    });
  }

  revalidatePath("/creator/connections");
}

export async function removeYtPage(connectionId: string) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) throw new Error("Creator profile not found");

  const conn = await prisma.creatorYtConnection.findFirst({
    where: { id: connectionId, creatorProfileId: user.creatorProfile.id },
  });

  if (!conn) throw new Error("Page not found");

  await resolveConnectionHealthIncident("YT", connectionId, "UNLINKED");
  await prisma.creatorYtConnection.delete({ where: { id: connectionId } });

  revalidatePath("/creator/connections");
}

export async function removeTikTokPage(connectionId: string) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) throw new Error("Creator profile not found");

  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, creatorProfileId: user.creatorProfile.id },
  });

  if (!conn) throw new Error("Connection not found");

  await resolveConnectionHealthIncident("TT", connectionId, "UNLINKED");
  await prisma.creatorTikTokConnection.delete({ where: { id: connectionId } });

  revalidatePath("/creator/connections");
}

export async function removeFbPage(connectionId: string) {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) throw new Error("Creator profile not found");

  const conn = await prisma.creatorFbConnection.findFirst({
    where: { id: connectionId, creatorProfileId: user.creatorProfile.id },
  });

  if (!conn) throw new Error("Page not found");

  await resolveConnectionHealthIncident("FB", connectionId, "UNLINKED");
  await prisma.creatorFbConnection.delete({ where: { id: connectionId } });

  revalidatePath("/creator/connections");
}
