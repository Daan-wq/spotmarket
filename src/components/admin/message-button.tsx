"use client";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

interface MessageButtonProps {
  channel: Channel;
  handle: string;
  prefill?: string;
}

function getLink(channel: Channel, handle: string, prefill?: string): string {
  const msg = prefill ? encodeURIComponent(prefill) : "";
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/${handle.replace(/\D/g, "")}${msg ? `?text=${msg}` : ""}`;
    case "telegram":
      return `https://t.me/${handle.replace("@", "")}${msg ? `?text=${msg}` : ""}`;
    case "instagram":
      return `https://ig.me/m/${handle.replace("@", "")}`;
    case "email":
      return `mailto:${handle}${msg ? `?body=${msg}` : ""}`;
    case "signal":
      return `https://signal.me/#p/${handle}`;
    default:
      return "#";
  }
}

const CHANNEL_ICONS: Record<Channel, string> = {
  whatsapp:  "💬",
  telegram:  "✈️",
  instagram: "📸",
  email:     "✉️",
  signal:    "🔒",
};

export function MessageButton({ channel, handle, prefill }: MessageButtonProps) {
  const href = getLink(channel, handle, prefill);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text-secondary)",
      }}
      title={`Message via ${channel}`}
    >
      <span>{CHANNEL_ICONS[channel]}</span>
      <span>{channel}</span>
    </a>
  );
}
