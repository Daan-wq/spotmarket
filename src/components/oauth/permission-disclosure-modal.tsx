"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OAuthDisclosure } from "@/lib/oauth-disclosures";

interface PermissionDisclosureModalProps {
  open: boolean;
  onClose: () => void;
  disclosure: OAuthDisclosure;
  /** OAuth start URL — navigated to when the user confirms. */
  oauthHref: string;
}

export function PermissionDisclosureModal({
  open,
  onClose,
  disclosure,
  oauthHref,
}: PermissionDisclosureModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Connect ${disclosure.brandName}`}
      description={`Here's exactly what we'll do with your ${disclosure.brandName} account.`}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <a
            href={oauthHref}
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Continue to {disclosure.brandName}
          </a>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <Section title="What we'll access" tone="positive">
          <ul className="space-y-1.5">
            {disclosure.willAccess.map((item) => (
              <li key={item} className="flex gap-2">
                <Check />
                <span style={{ color: "var(--text-primary)" }}>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="What we'll never do" tone="negative">
          <ul className="space-y-1.5">
            {disclosure.willNotDo.map((item) => (
              <li key={item} className="flex gap-2">
                <Cross />
                <span style={{ color: "var(--text-primary)" }}>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <p
          className="text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          You can revoke access anytime at{" "}
          <a
            href={disclosure.revokeUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
            style={{ color: "var(--accent-foreground)" }}
          >
            {disclosure.revokeLabel}
          </a>
          .
        </p>
      </div>
    </Dialog>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "positive" | "negative";
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{
          color:
            tone === "positive"
              ? "var(--success-text)"
              : "var(--text-secondary)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Check() {
  return (
    <span
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6l2.5 2.5L9.5 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Cross() {
  return (
    <span
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--muted)", color: "var(--text-muted)" }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 3l6 6M9 3l-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
