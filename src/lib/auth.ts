import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * Check if the current user has one of the allowed roles.
 * Reads role from the database via Supabase auth.
 */
export async function checkRole(
  ...allowedRoles: UserRole[]
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return false;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  if (!user?.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Get the current user's role from the database.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  return user?.role ?? null;
}

/**
 * Require authentication and optionally a specific role.
 * Returns supabaseId or throws if unauthorized.
 */
export async function requireAuth(
  ...allowedRoles: UserRole[]
): Promise<{ userId: string; role: UserRole }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });

  const role = user?.role;

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    throw new Error("Forbidden");
  }

  return { userId: authUser.id, role: role! };
}
