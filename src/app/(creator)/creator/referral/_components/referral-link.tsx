"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ReferralLinkProps {
  referralCode: string;
  referralUrl: string;
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
          className="px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 cursor-pointer transition-colors"
          style={{
            background: copied ? "#22c55e" : "var(--accent)",
            color: "#000",
          }}
        >
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
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "#1DA1F2", color: "#fff" }}
        >
          Twitter
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "#25D366", color: "#fff" }}
        >
          WhatsApp
        </a>
        <a
          href={mailUrl}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Email
        </a>
        <button
          type="button"
          onClick={copyForDiscord}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{ background: "#5865F2", color: "#fff" }}
          title="Copies a formatted message you can paste into Discord"
        >
          {discordCopied ? "Copied!" : "Discord"}
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
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
