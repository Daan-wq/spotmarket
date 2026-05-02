import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function TokenBrokenEmail({ data }: { data: Record<string, unknown> }) {
  const platform = String(data.connectionType ?? data.platform ?? "your account");
  const url = `${styles.appUrl}/creator/connections`;

  return (
    <EmailShell
      preview="Reconnect your social account"
      heading="🔌 Reconnect your social account"
    >
      <Text style={styles.p}>
        We can&apos;t reach <strong>{platform}</strong> anymore — the
        connection token expired or was revoked. Until you reconnect,
        view tracking and earnings on that account are paused.
      </Text>
      <Section>
        <Button href={url} style={styles.cta}>
          Reconnect now
        </Button>
      </Section>
    </EmailShell>
  );
}
