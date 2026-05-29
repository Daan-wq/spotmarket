import type { Prisma } from "@prisma/client";

type CrmAuditLogInput = {
  authUserId: string;
  action: string;
  entityId: string;
  metadata: Prisma.InputJsonObject;
};

export async function createCrmAuditLog(tx: Prisma.TransactionClient, input: CrmAuditLogInput) {
  const auditUser = await tx.user.findFirst({
    where: {
      OR: [{ id: input.authUserId }, { supabaseId: input.authUserId }],
    },
    select: { id: true },
  });

  if (!auditUser) return;

  await tx.auditLog.create({
    data: {
      userId: auditUser.id,
      action: input.action,
      entityType: "BrandLead",
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}
