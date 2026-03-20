import { prisma } from "@/lib/prisma";

export default async function AdminCreatorsPage() {
  const creators = await prisma.creatorProfile.findMany({
    include: {
      user: { select: { email: true } },
      socialAccounts: {
        where: { isActive: true },
        select: { platform: true, platformUsername: true, followerCount: true, engagementRate: true },
      },
      _count: { select: { applications: true } },
    },
    orderBy: { totalFollowers: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Creators</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{creators.length} total</p>
        </div>
      </div>

      {creators.length === 0 ? (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <p className="text-sm" style={{ color: "#94a3b8" }}>No creators yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5"
            style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
          >
            {["Creator", "Platform", "Followers", "Engagement", "Geo", "Campaigns", ""].map((h) => (
              <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div style={{ background: "#ffffff" }}>
            {creators.map((c, i) => {
              const ig = c.socialAccounts.find((a) => a.platform === "instagram");
              const tt = c.socialAccounts.find((a) => a.platform === "tiktok");
              const main = ig ?? tt;

              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{c.displayName}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#94a3b8" }}>{c.user.email}</p>
                  </div>

                  <p className="text-sm truncate" style={{ color: main ? "#0f172a" : "#d97706" }}>
                    {main ? `@${main.platformUsername} (${main.platform})` : "Not connected"}
                  </p>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#0f172a" }}>
                    {c.totalFollowers.toLocaleString()}
                  </p>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#0f172a" }}>
                    {c.engagementRate.toString()}%
                  </p>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>{c.primaryGeo}</p>

                  <p className="text-sm whitespace-nowrap text-center" style={{ color: "#64748b" }}>
                    {c._count.applications}
                  </p>

                  <form action={`/api/creators/${c.id}/sync`} method="POST">
                    <button
                      type="submit"
                      className="text-xs font-medium hover:underline whitespace-nowrap"
                      style={{ color: "#4f46e5" }}
                    >
                      Sync stats
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
