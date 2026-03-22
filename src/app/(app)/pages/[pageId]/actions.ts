"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updatePageSettings(
  pageId: string,
  data: { niche?: string; displayLabel?: string }
) {
  await prisma.socialAccount.update({ where: { id: pageId }, data });
  revalidatePath(`/pages/${pageId}`);
}
