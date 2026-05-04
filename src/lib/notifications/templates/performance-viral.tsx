import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function PerformanceViralEmail({ data }: { data: Record<string, unknown> }) {
  const submissionId = String(data.submissionId ?? "");
  const ratio = typeof data.benchmarkRatio === "number" ? data.benchmarkRatio : null;
  const url = `${styles.appUrl}/creator/dashboard`;

  return (
    <EmailShell
      preview="Your clip is going viral"
      heading="🚀 Your clip is going viral"
    >
      <Text style={styles.p}>
        One of your submissions is outperforming the campaign benchmark
        {ratio ? ` (${ratio.toFixed(1)}× the p90 view rate)` : ""}.
        Keep the momentum going — it&apos;s a great time to reshare.
      </Text>
      {submissionId ? (
        <Text style={styles.p}>
          <strong>Submission:</strong> {submissionId}
        </Text>
      ) : null}
      <Section>
        <Button href={url} style={styles.cta}>
          Open dashboard
        </Button>
      </Section>
    </EmailShell>
  );
}
