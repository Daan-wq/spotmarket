"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
}

export async function updateCreatorProfile(formData: FormData): Promise<UpdateProfileResult> {
  const { userId: supabaseId } = await requireAuth("creator");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const tronsAddress = String(formData.get("tronsAddress") ?? "").trim();

  if (displayName.length === 0) {
    return { ok: false, error: "Display name is required." };
  }
  if (displayName.length > 60) {
    return { ok: false, error: "Display name must be 60 characters or fewer." };
  }
  if (bio.length > 280) {
    return { ok: false, error: "Bio must be 280 characters or fewer." };
  }
  if (tronsAddress && !TRON_REGEX.test(tronsAddress)) {
    return {
      ok: false,
      error: "TRON wallet address looks invalid. It should start with T and be 34 characters.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "User not found." };

  await prisma.creatorProfile.update({
    where: { userId: user.id },
    data: {
      displayName,
      bio: bio.length > 0 ? bio : null,
      tronsAddress: tronsAddress.length > 0 ? tronsAddress : null,
    },
  });

  revalidatePath("/creator/settings");
  revalidatePath("/creator/dashboard");
  revalidatePath("/creator/profile");

  return { ok: true };
}
