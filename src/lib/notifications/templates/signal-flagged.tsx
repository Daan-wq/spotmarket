import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function SignalFlaggedEmail({ data }: { data: Record<string, unknown> }) {
  const signal = String(data.signal ?? "UNKNOWN");
  const severity = String(data.severity ?? "WARN");
  const submissionId = String(data.submissionId ?? "");
  const url = `${styles.appUrl}/admin/signals`;

  return (
    <EmailShell
      preview="A submission was flagged for review"
      heading="⚠️ Submission flagged"
    >
      <Text style={styles.p}>
        A new <strong>{signal}</strong> signal at severity{" "}
        <strong>{severity}</strong> has fired
        {submissionId ? ` on submission ${submissionId}` : ""}.
      </Text>
      <Section>
        <Button href={url} style={styles.cta}>
          Open signals inbox
        </Button>
      </Section>
    </EmailShell>
  );
}
