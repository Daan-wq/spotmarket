"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
  platform: string;
  postUrl: string | null;
  status: string;
  date: string;
}

interface MessageItem {
  id: string;
  isMe: boolean;
  content: string;
  date: string;
}

interface ContactClientProps {
  campaignId: string;
  brandName: string;
  brandUserId: string;
  currentUserId: string;
  submissions: Submission[];
  messages: MessageItem[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending Review" },
  APPROVED: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Approved" },
  REJECTED: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Rejected" },
  FLAGGED: { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6", label: "Flagged" },
};

export function ContactClient({
  campaignId,
  brandName,
  brandUserId,
  currentUserId,
  submissions,
  messages: initialMessages,
}: ContactClientProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          receiverId: brandUserId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: data.id,
          isMe: true,
          content: newMessage.trim(),
          date: new Date().toISOString(),
        }]);
        setNewMessage("");
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{brandName}</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You can send a message</p>
      </div>

      {/* Rules Banner */}
      <div className="mx-6 mt-4 p-3 rounded-lg flex items-start gap-2" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <div>
          <span className="text-xs font-semibold" style={{ color: "#B45309" }}>Messaging Rules: </span>
          <span className="text-xs" style={{ color: "#92400E" }}>
            You can send one message per submission. Wait for the brand to reply before sending another message.
          </span>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Submission Cards */}
        {submissions.map((sub) => {
          const statusStyle = STATUS_STYLES[sub.status] ?? STATUS_STYLES.PENDING;
          return (
            <div key={sub.id} className="flex justify-end">
              <div className="max-w-sm rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Video Submission</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </div>
                <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
                  <div>Platform: <strong className="uppercase">{sub.platform}</strong></div>
                  {sub.postUrl && (
                    <a href={sub.postUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: "var(--primary)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      View original post
                    </a>
                  )}
                  <div style={{ color: "var(--text-muted)" }}>
                    Submitted {new Date(sub.date).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-sm rounded-xl px-4 py-2.5"
              style={{
                background: msg.isMe ? "var(--primary)" : "var(--bg-card)",
                color: msg.isMe ? "#FFFFFF" : "var(--text-primary)",
                border: msg.isMe ? "none" : "1px solid var(--border-default)",
              }}
            >
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs mt-1 opacity-60">
                {new Date(msg.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--border-default)" }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="p-2.5 rounded-xl text-white cursor-pointer disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
