"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, QrCode } from "lucide-react";
import { Send } from "@/components/animate-ui/icons/send";
import { PlatformLogo } from "@clipprofit/platform-icons";

interface ReferralLinkProps {
  referralCode: string;
  referralUrl: string;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2.05 22l5.26-1.38a9.9 9.9 0 0 0 4.73 1.2h.01c5.46 0 9.91-4.45 9.91-9.91S17.51 2 12.04 2Zm5.83 14.16c-.25.7-1.44 1.34-2.02 1.43-.52.08-1.18.12-1.9-.12-.44-.14-1-.33-1.72-.65-3.02-1.3-4.99-4.34-5.14-4.54-.15-.2-1.23-1.64-1.23-3.13s.78-2.22 1.06-2.52c.28-.31.61-.38.82-.38h.59c.18.01.44-.07.69.52.25.6.85 2.08.92 2.23.08.15.13.33.03.53-.1.2-.15.32-.3.49-.15.18-.32.39-.46.52-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.31.15.49.13.67-.08.2-.23.77-.9.97-1.2.2-.31.41-.26.69-.15.28.1 1.8.85 2.1 1 .31.15.51.23.59.36.08.13.08.74-.18 1.44Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.36 2.8a13.8 13.8 0 0 0-.63 1.29 18.5 18.5 0 0 0-5.5 0 12.9 12.9 0 0 0-.64-1.29 19.7 19.7 0 0 0-4.96 1.58C.49 9.09-.37 13.69.05 18.22a20 20 0 0 0 6.08 3.07c.49-.67.93-1.38 1.3-2.12-.72-.27-1.4-.6-2.05-.98.17-.12.34-.26.5-.4a14.1 14.1 0 0 0 12.26 0c.16.14.33.28.5.4-.65.38-1.34.71-2.06.98.37.74.8 1.45 1.3 2.12a20 20 0 0 0 6.08-3.07c.5-5.25-.85-9.81-3.64-13.85ZM8.02 15.43c-1.18 0-2.16-1.09-2.16-2.43s.95-2.43 2.16-2.43c1.2 0 2.18 1.1 2.16 2.43 0 1.34-.96 2.43-2.16 2.43Zm7.97 0c-1.18 0-2.16-1.09-2.16-2.43s.95-2.43 2.16-2.43c1.2 0 2.18 1.1 2.16 2.43 0 1.34-.95 2.43-2.16 2.43Z" />
    </svg>
  );
}

export function ReferralLink({ referralCode, referralUrl }: ReferralLinkProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Join me on ClipProfit and start earning from your content!\n${referralUrl}`
  )}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join me on ClipProfit and start earning from your content! ${referralUrl}`
  )}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(
    "Join ClipProfit"
  )}&body=${encodeURIComponent(
    `Hey! I've been using ClipProfit to earn from my content. Sign up with my referral link and let's both earn:\n\n${referralUrl}`
  )}`;

  const [discordCopied, setDiscordCopied] = useState(false);
  async function copyForDiscord() {
    const message = `**Earn from your clips on ClipProfit** — sign up with my link and we both earn: ${referralUrl}`;
    await navigator.clipboard.writeText(message);
    setDiscordCopied(true);
    setTimeout(() => setDiscordCopied(false), 2000);
  }

  return (
    <div
      className="rounded-lg p-6 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Your Referral Link
      </h2>

      {/* Link + Copy */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono truncate"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {referralUrl}
        </div>
        <button
          onClick={copyLink}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
          style={{
            background: copied ? "#22c55e" : "var(--accent)",
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code badge */}
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Your code: <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{referralCode}</span>
      </p>

      {/* Share buttons row */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50"
        >
          <PlatformLogo
            platform="X"
            size={16}
            decorative
            className="transition-transform group-hover:scale-110"
          />
          Twitter
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50"
        >
          <WhatsAppIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
          WhatsApp
        </a>
        <a
          href={mailUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50"
        >
          <Send className="h-4 w-4" animateOnHover />
          Email
        </a>
        <button
          type="button"
          onClick={copyForDiscord}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50"
          title="Copies a formatted message you can paste into Discord"
        >
          {discordCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <DiscordIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
          )}
          {discordCopied ? "Copied!" : "Discord"}
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50"
        >
          <QrCode className="h-4 w-4" />
          {showQR ? "Hide QR" : "QR Code"}
        </button>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="mt-4 flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={referralUrl} size={180} />
          </div>
        </div>
      )}
    </div>
  );
}
