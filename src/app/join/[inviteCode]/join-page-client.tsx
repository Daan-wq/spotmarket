"use client";

import { useState } from "react";

interface Props {
  network: { id: string; companyName: string; description: string | null };
  inviteCode: string;
}

export function JoinPageClient({ network, inviteCode }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    sessionStorage.setItem("join_name", name);
    sessionStorage.setItem("join_email", email);
    sessionStorage.setItem("join_invite_code", inviteCode);

    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`);
    const scope = "instagram_business_basic";
    const igAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=join:${inviteCode}`;

    window.location.href = igAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{network.companyName}</h1>
          {network.description && (
            <p className="text-gray-500 mt-2">{network.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-4">
            Connect your Instagram to verify your views for campaigns in this network.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleConnect}
            disabled={!name || loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Connect Instagram"}
          </button>
        </div>
      </div>
    </div>
  );
}
