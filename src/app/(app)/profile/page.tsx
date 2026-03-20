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
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: { socialAccounts: true },
      },
    },
  });

  const profile = user?.creatorProfile;
  const instagramAccount = profile?.socialAccounts.find((a) => a.platform === "instagram" && a.isActive);
  const tiktokAccount = profile?.socialAccounts.find((a) => a.platform === "tiktok" && a.isActive);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Profile</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Manage your public profile and connected accounts.</p>
      </div>

      {params.success === "instagram_connected" && (
        <div
          className="mb-6 px-4 py-3 rounded-lg"
          style={{ borderLeft: "3px solid #16a34a", background: "#f0fdf4" }}
        >
          <p className="text-sm" style={{ color: "#15803d" }}>
            Instagram connected successfully. Your stats have been synced.
          </p>
        </div>
      )}
      {params.error && (
        <div
          className="mb-6 px-4 py-3 rounded-lg"
          style={{ borderLeft: "3px solid #dc2626", background: "#fef2f2" }}
        >
          <p className="text-sm" style={{ color: "#b91c1c" }}>
            {params.error === "instagram_denied"
              ? "Instagram connection was cancelled."
              : params.error === "token_exchange_failed"
              ? "Failed to connect Instagram. Please try again."
              : "Something went wrong. Please try again."}
          </p>
          {params.detail && (
            <p className="text-xs mt-1 font-mono" style={{ color: "#b91c1c", opacity: 0.8 }}>
              {params.detail}
            </p>
          )}
        </div>
      )}

      {/* Connected accounts */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Connected Accounts</p>
        </div>
        <div style={{ background: "#ffffff" }}>
          {/* Instagram */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid #f8fafc" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
              >
                IG
              </div>
              <div>
                {instagramAccount ? (
                  <>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>@{instagramAccount.platformUsername}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      {instagramAccount.followerCount.toLocaleString()} followers · {instagramAccount.engagementRate.toString()}% engagement
                    </p>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "#64748b" }}>Instagram not connected</p>
                )}
              </div>
            </div>
            {instagramAccount ? (
              <a href="/api/auth/instagram" className="text-xs hover:underline" style={{ color: "#94a3b8" }}>Reconnect</a>
            ) : (
              <a
                href="/api/auth/instagram"
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ background: "#4f46e5" }}
              >
                Connect
              </a>
            )}
          </div>

          {/* TikTok */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "#000000" }}
              >
                TT
              </div>
              <div>
                {tiktokAccount ? (
                  <>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>@{tiktokAccount.platformUsername}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      {tiktokAccount.followerCount.toLocaleString()} followers · {tiktokAccount.engagementRate.toString()}% engagement
                    </p>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "#64748b" }}>TikTok not connected</p>
                )}
              </div>
            </div>
            {!tiktokAccount && <span className="text-xs italic" style={{ color: "#94a3b8" }}>Coming soon</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {instagramAccount && profile && (
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-6" style={{ background: "#e2e8f0" }}>
          {[
            { value: profile.totalFollowers.toLocaleString(), label: "Total Followers" },
            { value: `${profile.engagementRate.toString()}%`, label: "Engagement Rate" },
            { value: profile.primaryGeo, label: "Primary Geo" },
          ].map(({ value, label }) => (
            <div key={label} className="px-5 py-4" style={{ background: "#ffffff" }}>
              <p className="text-xl font-semibold" style={{ color: "#0f172a" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Profile form */}
      {profile && (
        <ProfileForm
          profileId={profile.id}
          initialData={{
            displayName: profile.displayName,
            bio: profile.bio ?? "",
            walletAddress: profile.walletAddress ?? "",
            primaryGeo: profile.primaryGeo,
          }}
        />
      )}
    </div>
  );
}
