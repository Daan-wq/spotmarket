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
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL_EN ??
  "https://app.clipprofit.com";

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
          <Section style={brandRow}>
            <Text style={brand}>ClipProfit</Text>
          </Section>
          <Section style={card}>
            <div style={accentBar} />
            <Heading style={h1}>{heading}</Heading>
            {children}
          </Section>
          <Section style={footer}>
            <Text style={footerText}>
              ClipProfit | <Link href={APP_URL} style={link}>Open dashboard</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const body = {
  backgroundColor: "#f7f9f9",
  fontFamily,
  margin: 0,
  padding: 0,
};
const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 20px",
};
const brandRow = {
  marginBottom: "18px",
};
const brand = {
  color: "#010405",
  fontSize: "20px",
  fontWeight: 900,
  fontStyle: "italic",
  letterSpacing: "0",
  lineHeight: "1",
  textTransform: "uppercase" as const,
  margin: 0,
};
const card = {
  backgroundColor: "#fbfcfc",
  border: "1px solid #d2d9db",
  borderRadius: "24px",
  padding: "32px",
  boxShadow: "0 2px 8px rgba(23,33,54,0.08), 0 18px 48px rgba(23,33,54,0.08)",
};
const accentBar = {
  width: "56px",
  height: "6px",
  borderRadius: "999px",
  backgroundColor: "#5d5fef",
  marginBottom: "22px",
};
const h1 = {
  color: "#010405",
  fontSize: "28px",
  lineHeight: "1.08",
  fontWeight: 800,
  margin: "0 0 18px",
};
const footer = {
  marginTop: "22px",
  padding: "0 8px",
};
const footerText = {
  color: "#5a6569",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: 0,
};
const link = {
  color: "#303295",
  fontWeight: 700,
  textDecoration: "none",
};

export const styles = {
  p: {
    color: "#5a6569",
    fontSize: "15px",
    lineHeight: "1.65",
    margin: "0 0 16px",
  },
  cta: {
    display: "inline-block",
    backgroundColor: "#5d5fef",
    color: "#ffffff",
    textDecoration: "none",
    padding: "13px 28px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 700,
    marginTop: "8px",
    boxShadow: "0 12px 26px rgba(93,95,239,0.24)",
  } as const,
  appUrl: APP_URL,
};
