import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; detail?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          applications: {
            include: {
              campaign: { select: { id: true, name: true } },
              payouts: { where: { status: { in: ["confirmed", "sent"] } }, select: { amount: true } },
              submissions: { select: { claimedViews: true } },
            },
            orderBy: { appliedAt: "desc" },
          },
        },
      },
    },
  });

  const profile = user?.creatorProfile;
  const initials = (profile?.displayName ?? authUser.email ?? "?")[0].toUpperCase();

  // Stats
  const launchedCampaigns = await prisma.campaign.findMany({
    where: { createdByUserId: user?.id },
    select: { id: true, name: true, status: true, totalBudget: true, createdAt: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalEarned = (profile?.applications ?? []).reduce((sum, app) =>
    sum + app.payouts.reduce((s, p) => s + Number(p.amount), 0), 0
  );
  const totalViews = (profile?.applications ?? []).reduce((sum, app) =>
    sum + app.submissions.reduce((s, p) => s + (p.claimedViews ?? 0), 0), 0
  );
  const totalAdSpend = launchedCampaigns.reduce((sum, c) => sum + Number(c.totalBudget), 0);
  const reviews: never[] = [];
  const avgRating: number | null = null;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm mt-1 text-gray-500">Manage your account identity and payout settings.</p>
      </div>

      {params.success === "instagram_connected" && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-green-500 bg-green-50">
          <p className="text-sm text-green-700">Instagram connected successfully. Your stats have been synced.</p>
        </div>
      )}
      {params.error && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-red-500 bg-red-50">
          <p className="text-sm text-red-700">
            {params.error === "instagram_denied"
              ? "Instagram connection was cancelled."
              : "Failed to connect Instagram. Please try again."}
          </p>
          {params.detail && (
            <p className="text-xs mt-1 font-mono text-red-700 opacity-80">{params.detail}</p>
          )}
        </div>
      )}

      {/* Identity card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
        {profile?.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.displayName ?? "Avatar"}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900">{profile?.displayName ?? "—"}</p>
          <p className="text-sm text-gray-500">{authUser.email}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">
              {user?.role ?? "creator"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Earned", value: totalEarned > 0 ? `$${totalEarned.toFixed(2)}` : "—", sub: "from campaigns" },
          { label: "Total Views", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews > 0 ? String(totalViews) : "—", sub: "generated" },
          { label: "Campaigns Hosted", value: String((profile?.applications ?? []).length), sub: "as creator" },
          { label: "Campaigns Launched", value: String(launchedCampaigns.length), sub: `$${totalAdSpend.toLocaleString()} total spend` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Launched campaigns */}
      {launchedCampaigns.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Launched Campaigns</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {launchedCampaigns.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c._count.applications} applicants · ${Number(c.totalBudget).toLocaleString()} budget</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium shrink-0 ${
                  c.status === "active" ? "bg-green-50 text-green-700" :
                  c.status === "completed" ? "bg-gray-100 text-gray-500" :
                  c.status === "pending_review" || c.status === "pending_payment" ? "bg-amber-50 text-amber-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {c.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator history */}
      {(profile?.applications ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Creator History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(profile?.applications ?? []).map(app => {
              const views = app.submissions.reduce((s, p) => s + (p.claimedViews ?? 0), 0);
              const earned = app.payouts.reduce((s, p) => s + Number(p.amount), 0);
              return (
                <div key={app.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{app.campaign.name}</p>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                    {views > 0 && <span>{views.toLocaleString()} views</span>}
                    {earned > 0 && <span className="text-green-600 font-medium">${earned.toFixed(2)}</span>}
                    <span className={`px-2 py-0.5 rounded-full capitalize ${
                      app.status === "completed" ? "bg-gray-100 text-gray-500" :
                      app.status === "active" || app.status === "approved" ? "bg-green-50 text-green-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>{app.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {profile && (
        <ProfileForm
          profileId={profile.id}
          initialData={{
            displayName: profile.displayName,
            bio: profile.bio ?? "",
            walletAddress: profile.walletAddress ?? "",
            tronsAddress: profile.tronsAddress ?? "",
            primaryGeo: profile.primaryGeo,
          }}
        />
      )}
    </div>
  );
}
