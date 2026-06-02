import { cache } from "react";
import { redirect } from "next/navigation";
import { getCachedAuthClaims, resolveRoleFor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getActiveBrandMembershipsForSupabaseId = cache(async (supabaseId: string) => {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      email: true,
      role: true,
      brandContacts: {
        where: { status: "ACTIVE", brand: { portalEnabled: true } },
        select: {
          id: true,
          brandId: true,
          email: true,
          name: true,
          brand: { select: { id: true, name: true, currency: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return user;
});

export async function getBrandPortalContext() {
  const claims = await getCachedAuthClaims();
  if (!claims?.sub) redirect("/sign-in?redirect_url=/brand");

  const role = await resolveRoleFor(claims);
  if (role === "admin") {
    const user = await getActiveBrandMembershipsForSupabaseId(claims.sub);
    if (user?.brandContacts.length) {
      return {
        isAdminPreview: true,
        user,
        brandIds: user.brandContacts.map((contact) => contact.brandId),
        memberships: user.brandContacts,
        email: user.email,
      };
    }

    return {
      isAdminPreview: true,
      user: null,
      brandIds: null as string[] | null,
      memberships: [],
      email: claims.email ?? "",
    };
  }

  if (role !== "brand") redirect("/unauthorized");

  const user = await getActiveBrandMembershipsForSupabaseId(claims.sub);
  if (!user || user.brandContacts.length === 0) redirect("/unauthorized");

  return {
    isAdminPreview: false,
    user,
    brandIds: user.brandContacts.map((contact) => contact.brandId),
    memberships: user.brandContacts,
    email: user.email,
  };
}
