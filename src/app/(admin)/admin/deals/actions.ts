"use server";

import { prisma } from "@/lib/prisma";
import { DealStatus, DealType, Niche } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface BrandDealFormData {
  brandName: string;
  contactName?: string;
  contactEmail?: string;
  dealType: DealType;
  niche: Niche;
  proposedCPM?: number;
  flatFee?: number;
  commissionPct?: number;
  pageIds: string[];
  notes?: string;
}

export async function createBrandDeal(data: BrandDealFormData) {
  // Compute total value based on deal type
  let totalValue: number | undefined;
  let agencyCommission: number | undefined;

  if (data.dealType === "FLAT_FEE" && data.flatFee) {
    totalValue = data.flatFee;
    agencyCommission = data.flatFee * 0.18;
  } else if (data.dealType === "CPM" && data.proposedCPM) {
    // Can't compute without reach; store CPM only
    totalValue = undefined;
  } else if (data.dealType === "AFFILIATE" && data.commissionPct) {
    totalValue = undefined; // performance-based
  }

  const deal = await prisma.brandDeal.create({
    data: {
      brandName: data.brandName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      dealType: data.dealType,
      status: "IDENTIFIED",
      niche: data.niche,
      proposedCPM: data.proposedCPM,
      flatFee: data.flatFee,
      commissionPct: data.commissionPct,
      totalValue,
      agencyCommission,
      notes: data.notes,
      pages: {
        create: data.pageIds.map((pageId) => ({ pageId })),
      },
    },
  });

  revalidatePath("/admin/deals");
  return deal.id;
}

export async function advanceDealStatus(id: string, status: DealStatus) {
  const update: Record<string, unknown> = { status };
  if (status === "PITCHED") update.pitchedAt = new Date();
  if (status === "SIGNED") update.signedAt = new Date();
  if (status === "LIVE") update.respondedAt = new Date();
  if (status === "COMPLETED") update.deliveredAt = new Date();

  await prisma.brandDeal.update({ where: { id }, data: update });
  revalidatePath("/admin/deals");
}

export async function updateDealValue(id: string, totalValue: number) {
  const agencyCommission = totalValue * 0.18;
  await prisma.brandDeal.update({ where: { id }, data: { totalValue, agencyCommission } });
  revalidatePath(`/admin/deals/${id}`);
}
