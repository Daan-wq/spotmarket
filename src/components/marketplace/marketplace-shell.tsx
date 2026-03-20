"use client";

import { useState, useMemo } from "react";
import { MOCK_CAMPAIGNS, CATEGORIES, type Category, type MockCampaign } from "@/data/mock-campaigns";
import { PublicNav } from "./public-nav";
import { FeaturedCard } from "./featured-card";
import { CampaignCard } from "./campaign-card";
import { FilterTabs } from "./filter-tabs";
import { AuthModal } from "./auth-modal";

type SortKey = "newest" | "budget" | "ending";

export function MarketplaceShell() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [modalCampaign, setModalCampaign] = useState<MockCampaign | null>(null);

  const featured = MOCK_CAMPAIGNS.find(c => c.featured)!;

  const filtered = useMemo(() => {
    let list = MOCK_CAMPAIGNS.filter(c => !c.featured);
    if (activeCategory !== "All") list = list.filter(c => c.category === activeCategory);
    if (sort === "budget") list = [...list].sort((a, b) => b.totalBudget - a.totalBudget);
    if (sort === "ending") list = [...list].sort((a, b) => a.daysLeft - b.daysLeft);
    return list;
  }, [activeCategory, sort]);

  const counts = useMemo(() => {
    const nonFeatured = MOCK_CAMPAIGNS.filter(c => !c.featured);
    const result: Record<string, number> = { All: nonFeatured.length };
    for (const cat of CATEGORIES.filter(c => c !== "All")) {
      result[cat] = nonFeatured.filter(c => c.category === cat).length;
    }
    return result;
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <PublicNav />

      {/* Hero */}
      <div
        className="pt-28 pb-16 px-4"
        style={{ background: "#0a0a0a" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {MOCK_CAMPAIGNS.length} campaigns live
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
              Browse campaigns
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: "#f3f4f6" }}>
            {[
              { value: "€285,550", label: "Total budgets live" },
              { value: "8,400+",   label: "Active creators"   },
              { value: "200+",     label: "Campaigns launched"},
              { value: "€2M+",     label: "Paid to creators"  },
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
        {/* Featured */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#9ca3af" }}>
            Featured
          </p>
          <FeaturedCard campaign={featured} onApply={setModalCampaign} />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterTabs active={activeCategory} onChange={setActiveCategory} counts={counts} />
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

        {/* Grid */}
        {filtered.length === 0 ? (
          <div
            className="rounded-xl px-6 py-16 text-center"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <p className="text-sm" style={{ color: "#9ca3af" }}>No campaigns in this category right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} onApply={setModalCampaign} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div
          className="mt-16 rounded-xl px-8 py-10 text-center"
          style={{ background: "#0a0a0a", border: "1px solid #1f2937" }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Ready to earn?</h2>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            Free to join. No minimum followers to apply.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/sign-up"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-black transition-opacity"
              style={{ background: "#ffffff" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Join as Creator
            </a>
            <a
              href="/sign-up"
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#d1d5db")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
            >
              Post a Campaign
            </a>
          </div>
        </div>
      </div>

      {modalCampaign && (
        <AuthModal campaignName={modalCampaign.name} onClose={() => setModalCampaign(null)} />
      )}
    </div>
  );
}
