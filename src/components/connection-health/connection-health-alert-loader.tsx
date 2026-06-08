import { prisma } from "@/lib/prisma";
import { getConnectionHealthAlertsForViewer } from "@/lib/connection-health";
import { ConnectionHealthAlerts } from "./connection-health-alerts";

export async function ConnectionHealthAlertLoader({
  supabaseId,
  viewerRole,
}: {
  supabaseId: string;
  viewerRole: "creator" | "admin";
}) {
  const viewer = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true },
  });
  if (!viewer) return null;

  const incidents = await getConnectionHealthAlertsForViewer({
    id: viewer.id,
    role: viewerRole,
  });

  return (
    <ConnectionHealthAlerts
      initialIncidents={incidents}
      viewerRole={viewerRole}
    />
  );
}
