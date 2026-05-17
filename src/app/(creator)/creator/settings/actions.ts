"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import {
  isLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { isValidTronAddress } from "@/lib/validation/tron";

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
}

export interface UpdateLocaleResult {
  ok: boolean;
  error?: string;
}

export async function updateCreatorLocale(locale: Locale): Promise<UpdateLocaleResult> {
  await requireAuth("creator");

  if (!isLocale(locale)) {
    return { ok: false, error: "Unsupported language." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/creator/settings");

  return { ok: true };
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
  if (tronsAddress && !isValidTronAddress(tronsAddress)) {
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
