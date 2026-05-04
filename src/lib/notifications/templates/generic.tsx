import { Text } from "@react-email/components";
import type { NotificationType } from "@prisma/client";
import { EmailShell, styles } from "./_layout";

export function GenericNotificationEmail({
  type,
  data,
}: {
  type: NotificationType;
  data: Record<string, unknown>;
}) {
  return (
    <EmailShell
      preview="ClipProfit notification"
      heading="ClipProfit notification"
    >
      <Text style={styles.p}>
        You have a new <strong>{type}</strong> notification.
      </Text>
      <Text style={{ ...styles.p, fontFamily: "ui-monospace, monospace", fontSize: "12px" }}>
        {JSON.stringify(data, null, 2)}
      </Text>
    </EmailShell>
  );
}
