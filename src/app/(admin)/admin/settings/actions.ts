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

export interface UpdateAdminLocaleResult {
  ok: boolean;
  error?: string;
}

export async function updateAdminLocale(locale: Locale): Promise<UpdateAdminLocaleResult> {
  await requireAuth("admin");

  if (!isLocale(locale)) {
    return { ok: false, error: "Unsupported language." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");

  return { ok: true };
}
