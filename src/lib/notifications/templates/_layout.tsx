/**
 * Shared transactional email shell.
 */
import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.clipprofit.com";

export function EmailShell({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          {children}
          <Section style={footer}>
            <Text style={footerText}>
              ClipProfit · <a href={APP_URL} style={link}>Open dashboard</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#0b0b0f", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
const container = { maxWidth: "520px", margin: "0 auto", padding: "32px 20px" };
const h1 = { color: "#ffffff", fontSize: "22px", marginBottom: "16px" };
const footer = { borderTop: "1px solid #2a2a32", marginTop: "32px", paddingTop: "16px" };
const footerText = { color: "#666", fontSize: "12px" };
const link = { color: "#6366f1" };

export const styles = {
  p: { color: "#cccccc", fontSize: "14px", lineHeight: "1.6" },
  cta: {
    display: "inline-block",
    background: "#6366f1",
    color: "#ffffff",
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    marginTop: "16px",
  } as const,
  appUrl: APP_URL,
};
