"use client";

import { useState } from "react";

interface CampaignBriefProps {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    contentGuidelines: string | null;
    requirements: string | null;
  };
}

export function CampaignBrief({ campaign }: CampaignBriefProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    const key = `campaign-brief-${campaign.id}`;
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : false;
  });

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`campaign-brief-${campaign.id}`, JSON.stringify(newState));
  };

  return (
    <div
      className="rounded-lg border p-4 mb-6"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border)",
      }}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between"
        style={{ cursor: "pointer" }}
      >
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {campaign.name}
        </h2>
        <span
          style={{
            color: "var(--text-secondary)",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 250ms ease",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {campaign.description && (
            <div>
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Campaign Description
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {campaign.description}
              </p>
            </div>
          )}

          {campaign.requirements && (
            <div>
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Requirements
              </p>
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ color: "var(--text-primary)" }}
              >
                {campaign.requirements}
              </p>
            </div>
          )}

          {campaign.contentGuidelines && (
            <div>
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Content Guidelines
              </p>
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ color: "var(--text-primary)" }}
              >
                {campaign.contentGuidelines}
              </p>
            </div>
          )}

          <div
            className="rounded-md border p-3"
            style={{
              background: "var(--warning-bg)",
              borderColor: "#fde68a",
            }}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--warning-text)" }}
            >
              Prohibited Content
            </p>
            <ul
              className="text-xs space-y-1"
              style={{ color: "var(--warning-text)" }}
            >
              <li>• Misleading claims or false statements</li>
              <li>• Offensive or discriminatory content</li>
              <li>• Third-party branding (unless approved)</li>
              <li>• Compliance violations (privacy, regulations)</li>
            </ul>
          </div>

          <div
            className="rounded-md border p-3"
            style={{
              background: "var(--accent-bg)",
              borderColor: "var(--accent)",
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--accent-foreground)" }}
            >
              Brand Overlay Compositing
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-primary)" }}
            >
              The brand overlay will be composited onto your video automatically during processing. Position and size settings control the final placement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
