"use client";

import { useState, useMemo } from "react";
import { type CampaignCardData } from "@/types/campaign-card";
import { PublicNav } from "./public-nav";
import { FeaturedCard } from "./featured-card";
import { CampaignCard } from "./campaign-card";
import { AuthModal } from "./auth-modal";

type SortKey = "newest" | "budget" | "ending";

interface Props {
  campaigns: CampaignCardData[];
}

export function MarketplaceShell({ campaigns }: Props) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [modalCampaign, setModalCampaign] = useState<CampaignCardData | null>(null);

  const featured = campaigns[0] ?? null;
  const rest = campaigns.slice(1);

  const sorted = useMemo(() => {
    if (sort === "budget") return [...rest].sort((a, b) => b.totalBudget - a.totalBudget);
    if (sort === "ending") return [...rest].sort((a, b) => a.daysLeft - b.daysLeft);
    return rest;
  }, [rest, sort]);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <PublicNav />

      {/* Hero */}
      <div className="pt-28 pb-16 px-4" style={{ background: "#0a0a0a" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {campaigns.length} campaigns live
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Get paid to create<br />content you already make
          </h1>
          <p className="text-base mb-8" style={{ color: "#6b7280" }}>
            Browse brand campaigns, apply in seconds, get paid per view.
          </p>

          <div className="flex items-center justify-center gap-3">
            <a
              href="/sign-up"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-black transition-opacity"
              style={{ background: "#ffffff" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Start for free
            </a>
            <a
              href="/sign-in"
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#d1d5db")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
            >
              Sign in
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: "#f3f4f6" }}>
            {[
              { value: "€285,550", label: "Total budgets live"  },
              { value: "8,400+",   label: "Active creators"     },
              { value: "200+",     label: "Campaigns launched"  },
              { value: "€2M+",     label: "Paid to creators"    },
            ].map(({ value, label }) => (
              <div key={label} className="px-6 py-4 text-center" style={{ borderColor: "#f3f4f6" }}>
                <p className="text-lg font-bold" style={{ color: "#111827" }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {campaigns.length === 0 ? (
          <div className="rounded-xl px-6 py-24 text-center" style={{ border: "1px solid #e5e7eb" }}>
            <p className="text-sm font-medium" style={{ color: "#111827" }}>No campaigns live yet.</p>
            <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Sign up to be notified when new campaigns launch.</p>
            <a href="/sign-up" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "#111827" }}>
              Join the waitlist
            </a>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div className="mb-10">
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#9ca3af" }}>Featured</p>
                <FeaturedCard campaign={featured} onApply={setModalCampaign} />
              </div>
            )}

            {/* Sort + Grid */}
            {sorted.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
                    All Campaigns
                  </p>
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value as SortKey)}
                    className="text-sm px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                    style={{ border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151" }}
                  >
                    <option value="newest">Newest</option>
                    <option value="budget">Highest Budget</option>
                    <option value="ending">Ending Soon</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} onApply={setModalCampaign} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div
          className="mt-16 rounded-xl px-8 py-10 text-center"
          style={{ background: "#0a0a0a", border: "1px solid #1f2937" }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Ready to earn?</h2>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Free to join. No minimum followers to apply.</p>
          <a
            href="/sign-up"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-black transition-opacity"
            style={{ background: "#ffffff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Join as Creator
          </a>
        </div>
      </div>

      {modalCampaign && (
        <AuthModal campaignName={modalCampaign.name} onClose={() => setModalCampaign(null)} />
      )}
    </div>
  );
}
