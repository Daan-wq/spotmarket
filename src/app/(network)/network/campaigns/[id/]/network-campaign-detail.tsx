"use client";

import { useState } from "react";
import type {
  Campaign,
  CampaignApplication,
  NetworkProfile,
  NetworkMember,
  NetworkMemberAssignment,
  CampaignPost,
} from "@prisma/client";

type ApplicationWithRelations = CampaignApplication & {
  assignedMembers: (NetworkMemberAssignment & { member: NetworkMember })[];
  posts: CampaignPost[];
};

interface Props {
  campaign: Campaign;
  application: ApplicationWithRelations | null;
  network: NetworkProfile;
  members: NetworkMember[];
}

export function NetworkCampaignDetail({ campaign, application, members }: Props) {
  const [slotCount, setSlotCount] = useState(1);
  const [postUrls, setPostUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasClaimed = !!application;
  const assignedIds = new Set(application?.assignedMembers.map((a) => a.member.id) ?? []);

  async function handleClaim() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/network/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, slotCount }),
    });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to claim");
    } else {
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleAssignMember(memberId: string) {
    if (!application) return;
    await fetch(`/api/network/applications/${application.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    window.location.reload();
  }

  async function handleSubmitPost(memberId: string) {
    if (!application) return;
    const postUrl = postUrls[memberId];
    if (!postUrl) return;
    await fetch(`/api/network/applications/${application.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, postUrl }),
    });
    window.location.reload();
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{campaign.name}</h1>
      <p className="text-gray-500 text-sm mb-6">Campaign</p>

      {campaign.description && (
        <p className="text-gray-700 mb-6">{campaign.description}</p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">CPV</p>
          <p className="font-semibold">${(Number(campaign.creatorCpv) * 1_000_000).toFixed(0)}/1M views</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Deadline</p>
          <p className="font-semibold">{new Date(campaign.deadline).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Slots available</p>
          <p className="font-semibold">
            {campaign.maxSlots != null
              ? `${campaign.maxSlots - campaign.claimedSlots} left`
              : "Unlimited"}
          </p>
        </div>
      </div>

      {!hasClaimed && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Claim this campaign</h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-gray-600">How many creator slots?</label>
              <input
                type="number"
                min={1}
                value={slotCount}
                onChange={(e) => setSlotCount(Number(e.target.value))}
                className="w-24 ml-3 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleClaim}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Claiming..." : "Claim Campaign"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {hasClaimed && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Assign Members &amp; Submit Posts</h2>
          <div className="space-y-4">
            {members
              .filter((m) => m.igIsConnected)
              .map((member) => {
                const isAssigned = assignedIds.has(member.id);
                const existingPost = application?.posts.find(
                  (p) => p.networkMemberId === member.id
                );
                return (
                  <div key={member.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">
                        @{member.igUsername} ({member.igFollowerCount?.toLocaleString()} followers)
                      </p>
                      {!isAssigned && (
                        <button
                          onClick={() => handleAssignMember(member.id)}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                        >
                          Assign
                        </button>
                      )}
                      {isAssigned && (
                        <span className="text-xs text-green-600 font-medium">Assigned</span>
                      )}
                    </div>
                    {isAssigned && !existingPost && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="url"
                          placeholder="https://instagram.com/p/..."
                          value={postUrls[member.id] ?? ""}
                          onChange={(e) =>
                            setPostUrls((p) => ({ ...p, [member.id]: e.target.value }))
                          }
                          className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm"
                        />
                        <button
                          onClick={() => handleSubmitPost(member.id)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                    {existingPost && (
                      <p className="text-xs text-green-600 mt-1">Post submitted ✓</p>
                    )}
                  </div>
                );
              })}
            {members.filter((m) => m.igIsConnected).length === 0 && (
              <p className="text-gray-400 text-sm">
                No connected members yet. Share your invite link.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
