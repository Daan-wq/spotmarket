"use client";

import { useState } from "react";
import { CampaignSelector } from "./campaign-selector";
import { Composer } from "./composer";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
  contentGuidelines: string | null;
  requirements: string | null;
  contentAssetUrls: string[];
  deadline: string;
  creatorCpv: string;
  platform: string;
  contentType: string | null;
}

interface CampaignWithApp {
  applicationId: string;
  campaign: Campaign;
}

interface IgAccount {
  id: string;
  platformUsername: string;
  platformUserId: string;
  followerCount: number;
}

interface AutoPostClientProps {
  campaigns: CampaignWithApp[];
  igAccounts: IgAccount[];
  userId: string;
}

export function AutoPostClient({ campaigns, igAccounts, userId }: AutoPostClientProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const selected = campaigns.find(c => c.campaign.id === selectedCampaignId) ?? null;

  return (
    <div className="flex h-full">
      {/* Campaign selector sidebar — desktop */}
      <div
        className="hidden md:flex flex-col shrink-0 overflow-y-auto"
        style={{
          width: "280px",
          borderRight: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <CampaignSelector
          campaigns={campaigns}
          selectedId={selectedCampaignId}
          onSelect={setSelectedCampaignId}
        />
      </div>

      {/* Campaign selector — mobile (horizontal scroll) */}
      <div
        className="md:hidden overflow-x-auto px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex gap-2" style={{ minWidth: "max-content" }}>
          {campaigns.map(c => (
            <button
              key={c.campaign.id}
              onClick={() => setSelectedCampaignId(c.campaign.id)}
              className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                background:
                  selectedCampaignId === c.campaign.id
                    ? "var(--accent-bg)"
                    : "var(--bg-elevated)",
                color:
                  selectedCampaignId === c.campaign.id
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                border: `1px solid ${
                  selectedCampaignId === c.campaign.id
                    ? "var(--accent)"
                    : "var(--border)"
                }`,
              }}
            >
              {c.campaign.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <Composer
            campaign={selected.campaign}
            igAccounts={igAccounts}
            userId={userId}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--accent-bg)" }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: "var(--accent)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Select a campaign
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Choose a campaign from the sidebar to start composing your post.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state when no campaigns */}
      {campaigns.length === 0 && (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center px-6">
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              No active campaigns
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Browse open campaigns and apply to get started.
            </p>
            <Link
              href="/campaigns"
              className="text-xs font-semibold px-4 py-2 rounded-lg inline-block"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Browse campaigns
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
