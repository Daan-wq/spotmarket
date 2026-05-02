import { Text, Button, Section } from "@react-email/components";
import { EmailShell, styles } from "./_layout";

export function EarningsMilestoneEmail({ data }: { data: Record<string, unknown> }) {
  const milestone = String(data.milestone ?? data.amount ?? "");
  const url = `${styles.appUrl}/creator/wallet`;

  return (
    <EmailShell
      preview="You hit an earnings milestone"
      heading="🎉 Earnings milestone unlocked"
    >
      <Text style={styles.p}>
        Congrats — you just crossed {milestone || "a new milestone"} in
        ClipProfit earnings. That&apos;s real momentum.
      </Text>
      <Section>
        <Button href={url} style={styles.cta}>
          View wallet
        </Button>
      </Section>
    </EmailShell>
  );
}
