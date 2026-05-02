import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function PerformanceUnderperformEmail({ data }: { data: Record<string, unknown> }) {
  const dimensions = Array.isArray(data.weakDimensions)
    ? (data.weakDimensions as string[]).join(", ")
    : "";
  const url = `${styles.appUrl}/creator/dashboard`;

  return (
    <EmailShell
      preview="A submission is underperforming"
      heading="📉 One of your clips is underperforming"
    >
      <Text style={styles.p}>
        We noticed a recent submission isn&apos;t hitting the campaign&apos;s
        usual performance benchmarks
        {dimensions ? ` — particularly on ${dimensions}` : ""}.
      </Text>
      <Text style={styles.p}>
        Tweaking the hook, caption, or thumbnail can often turn things around.
      </Text>
      <Section>
        <Button href={url} style={styles.cta}>
          See details
        </Button>
      </Section>
    </EmailShell>
  );
}
