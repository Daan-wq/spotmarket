import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["admin", "creator"];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

// Deduplicated per request — Supabase getUser() called at most once per request lifecycle
export const getCachedAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Fast per-request auth — local JWT decode, no network call (~1ms vs 300ms+).
// Sufficient for layouts: provides sub (= Supabase user ID) and app_metadata.
// Security: middleware already validates the JWT at the edge on every request.
export const getCachedAuthClaims = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

// Fallback DB lookup — only used when role is not in JWT claims
const getCachedDbRole = cache(async (supabaseId: string): Promise<UserRole | null> => {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { role: true },
  });
  return user?.role ?? null;
});

// Accepts both a full Supabase User (id) and raw JWT claims (sub).
type AuthLike = { id?: string; sub?: string; app_metadata?: Record<string, unknown> | null };

async function resolveRole(authUser: AuthLike): Promise<UserRole | null> {
  // If the JWT hook is active, role is in app_metadata — no DB round-trip needed
  const jwtRole = authUser.app_metadata?.user_role;
  if (isValidRole(jwtRole)) return jwtRole;

  // Fallback: look up role from database (used before hook is enabled)
  const uid = authUser.id ?? authUser.sub;
  if (!uid) return null;
  return getCachedDbRole(uid);
}

// Public form — lets layouts run the role check in parallel with their own queries.
export const resolveRoleFor = resolveRole;

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

// Per-request cached lookup of the creator-side header info (db user id +
// creator profile id/displayName). Used by the creator layout AND by pages
// that previously re-queried the same data — React.cache dedupes them all
// to a single round-trip.
export const getCreatorHeader = cache(async (supabaseId: string) => {
  return prisma.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      email: true,
      creatorProfile: {
        select: { id: true, displayName: true },
      },
    },
  });
});
