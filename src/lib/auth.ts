import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["admin", "creator", "advertiser"];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

// Deduplicated per request — Supabase getUser() called at most once per request lifecycle
const getCachedAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Fallback DB lookup — only used when role is not in JWT claims
const getCachedDbRole = cache(async (supabaseId: string): Promise<UserRole | null> => {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { role: true },
  });
  return user?.role ?? null;
});

async function resolveRole(authUser: NonNullable<Awaited<ReturnType<typeof getCachedAuthUser>>>): Promise<UserRole | null> {
  // If the JWT hook is active, role is in app_metadata — no DB round-trip needed
  const jwtRole = authUser.app_metadata?.user_role;
  if (isValidRole(jwtRole)) return jwtRole;

  // Fallback: look up role from database (used before hook is enabled)
  return getCachedDbRole(authUser.id);
}

export async function checkRole(
  ...allowedRoles: UserRole[]
): Promise<boolean> {
  const authUser = await getCachedAuthUser();
  if (!authUser) return false;

  const role = await resolveRole(authUser);
  if (!role) return false;
  return allowedRoles.includes(role);
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const authUser = await getCachedAuthUser();
  if (!authUser) return null;

  return resolveRole(authUser);
}

export async function requireAuth(
  ...allowedRoles: UserRole[]
): Promise<{ userId: string; role: UserRole }> {
  const authUser = await getCachedAuthUser();
  if (!authUser) throw new Error("Unauthorized");

  const role = await resolveRole(authUser);

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    throw new Error("Forbidden");
  }

  return { userId: authUser.id, role: role! };
}
