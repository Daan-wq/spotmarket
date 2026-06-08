import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function TokenBrokenEmail({ data }: { data: Record<string, unknown> }) {
  const accountLabel = String(
    data.accountLabel ?? data.connectionType ?? data.platform ?? "your account",
  );
  const href =
    typeof data.href === "string" &&
    data.href.startsWith("/") &&
    !data.href.startsWith("//")
      ? data.href
      : "/creator/connections";
  const url = new URL(href, styles.appUrl).toString();

  return (
    <EmailShell
      preview="Reconnect your social account"
      heading="Token expired. Please connect your page again."
    >
      <Text style={styles.p}>
        We can&apos;t reach <strong>{accountLabel}</strong>. Analytics tracking
        has stopped because the connection token expired, was revoked, or is
        missing.
      </Text>
      <Section>
        <Button href={url} style={styles.cta}>
          Reconnect now
        </Button>
      </Section>
    </EmailShell>
  );
}
