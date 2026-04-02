"use client";

import { useState } from "react";

interface Props {
  stripeAccountId: string | null;
}

export function BillingSection({ stripeAccountId }: Props) {
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openStripeDashboard() {
    setLoadingDashboard(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/dashboard-link");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        setError(data.error ?? "Failed to open Stripe dashboard.");
      }
    } catch {
      setError("Failed to open Stripe dashboard.");
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function connectStripe() {
    setConnectingStripe(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start Stripe onboarding.");
        setConnectingStripe(false);
      }
    } catch {
      setError("Failed to start Stripe onboarding.");
      setConnectingStripe(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">Billing & Payouts</p>
        <p className="text-xs text-gray-400 mt-0.5">Manage your Stripe payout account.</p>
      </div>
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {stripeAccountId ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Connected
              </span>
              <span className="text-xs text-gray-400">Stripe Express account active</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">No Stripe account connected yet.</span>
          )}
        </div>

        {stripeAccountId ? (
          <button
            type="button"
            onClick={openStripeDashboard}
            disabled={loadingDashboard}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loadingDashboard ? "Opening…" : "Open Stripe Dashboard"}
          </button>
        ) : (
          <button
            type="button"
            onClick={connectStripe}
            disabled={connectingStripe}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {connectingStripe ? "Redirecting…" : "Connect Stripe"}
          </button>
        )}
      </div>
      {error && <p className="px-5 pb-4 text-xs text-red-600">{error}</p>}
    </div>
  );
}
