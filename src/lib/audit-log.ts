import { prisma } from "@/lib/prisma";

interface AuditLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an auditable action to the database.
 * Fails silently to avoid disrupting the main request flow.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? {}) as Record<string, string | number | boolean>,
      },
    });
  } catch (err) {
    console.error("[audit-log] Failed to persist audit event:", err);
  }
}
