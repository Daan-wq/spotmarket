"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DealType, Niche } from "@prisma/client";
import { NicheSelector } from "@/components/admin/NicheSelector";
import { NICHE_CONFIG } from "@/lib/niches";
import { createBrandDeal } from "../actions";

export default function NewDealPage() {
  return <NewDealForm />;
}

function NewDealForm() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dealType, setDealType] = useState<DealType>("FLAT_FEE");
  const [niche, setNiche] = useState<Niche | null>(null);
  const [proposedCPM, setProposedCPM] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const benchmarkCPM = niche ? NICHE_CONFIG[niche].cpmBenchmark : null;
  const agencyCommission = flatFee ? (parseFloat(flatFee) * 0.18).toFixed(2) : null;
  const operatorCut = flatFee ? (parseFloat(flatFee) * 0.82).toFixed(2) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niche) { setError("Selecteer een niche"); return; }
    setLoading(true);
    setError("");
    try {
      const id = await createBrandDeal({
        brandName,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        dealType,
        niche,
        proposedCPM: proposedCPM ? parseFloat(proposedCPM) : undefined,
        flatFee: flatFee ? parseFloat(flatFee) : undefined,
        commissionPct: commissionPct ? parseFloat(commissionPct) : undefined,
        pageIds: [],
        notes: notes || undefined,
      });
      router.push(`/admin/deals/${id}`);
    } catch {
      setError("Er is iets misgegaan. Probeer opnieuw.");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/deals" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Deal Pipeline
      </Link>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Nieuwe Brand Deal</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Brand info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Brand naam *</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
              placeholder="Acme Finance BV"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Contact naam</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jan de Vries"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="jan@acmefinance.nl"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Deal type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--card-foreground)" }}>Deal type</label>
          <div className="flex gap-2">
            {(["FLAT_FEE", "CPM", "AFFILIATE", "HYBRID"] as DealType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDealType(t)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                style={
                  dealType === t
                    ? { background: "var(--text-primary)", color: "#fff", borderColor: "var(--text-primary)" }
                    : { background: "var(--bg-primary)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                }
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Niche */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Niche</label>
          <NicheSelector value={niche} onChange={setNiche} includeEmpty />
        </div>

        {/* Deal value fields */}
        {dealType === "FLAT_FEE" && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Flat fee (€)</label>
            <input
              type="number"
              step="50"
              value={flatFee}
              onChange={(e) => setFlatFee(e.target.value)}
              placeholder="2500"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {agencyCommission && (
              <div className="mt-2 rounded-lg px-4 py-3 text-sm" style={{ background: "var(--success-bg)", border: `1px solid var(--success)` }}>
                <p style={{ color: "var(--success)" }}>Agency (18%): <strong>€{agencyCommission}</strong></p>
                <p style={{ color: "var(--text-secondary)" }}>Operator (82%): €{operatorCut}</p>
              </div>
            )}
          </div>
        )}

        {(dealType === "CPM" || dealType === "HYBRID") && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>CPM (€)</label>
            <input
              type="number"
              step="0.1"
              value={proposedCPM}
              onChange={(e) => setProposedCPM(e.target.value)}
              placeholder={benchmarkCPM?.toString() ?? "5.00"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {benchmarkCPM && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Markt benchmark voor {niche}: €{benchmarkCPM} CPM</p>
            )}
          </div>
        )}

        {(dealType === "AFFILIATE" || dealType === "HYBRID") && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Commissie %</label>
            <input
              type="number"
              step="0.5"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              placeholder="15"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Notities</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Deal context, bijzonderheden..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--text-primary)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Aanmaken..." : "Deal aanmaken"}
        </button>
      </form>
    </div>
  );
}
