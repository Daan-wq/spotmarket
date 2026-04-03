import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Niche } from "@prisma/client";

interface SearchParams {
  platform?: string;
  niche?: string;
  country?: string;
  followerMin?: string;
  followerMax?: string;
  status?: string;
}

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const filters = await searchParams;

  interface WhereClause {
    platform?: "instagram" | "tiktok";
    niche?: Niche;
    isActive?: boolean;
    followerCount?: {
      gte?: number;
      lte?: number;
    };
    creatorProfile?: {
      topCountry?: {
        equals: string;
        mode: "insensitive";
      };
    };
  }

  const where: WhereClause = {};

  if (filters.platform) {
    where.platform = filters.platform as "instagram" | "tiktok";
  }
  if (filters.niche && Object.values(Niche).includes(filters.niche as Niche)) {
    where.niche = filters.niche as Niche;
  }
  if (filters.status === "disconnected") {
    where.isActive = false;
  } else {
    where.isActive = true;
  }
  if (filters.followerMin || filters.followerMax) {
    where.followerCount = {};
    if (filters.followerMin) where.followerCount.gte = parseInt(filters.followerMin);
    if (filters.followerMax) where.followerCount.lte = parseInt(filters.followerMax);
  }
  if (filters.country) {
    where.creatorProfile = {
      topCountry: {
        equals: filters.country.toUpperCase(),
        mode: "insensitive",
      },
    };
  }

  const pages = await prisma.socialAccount.findMany({
    where,
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          topCountry: true,
          user: { select: { email: true } },
        },
      },
      _count: { select: { campaignApplicationPages: true } },
    },
    orderBy: { followerCount: "desc" },
    take: 100,
  });

  const totalPages = await prisma.socialAccount.count({ where });

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Creator Pages</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>All Instagram and TikTok pages connected across creators</p>
        </div>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{totalPages} total pages</span>
      </div>

      {/* Filters */}
      <form className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <select name="platform" defaultValue={filters.platform ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
          <option value="">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select name="niche" defaultValue={filters.niche ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
          <option value="">All niches</option>
          {["sports", "memes", "casino", "lifestyle", "crypto", "other"].map(n => (
            <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
          ))}
        </select>
        <input name="country" type="text" placeholder="Country (US, NL...)" defaultValue={filters.country ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
        <input name="followerMin" type="number" placeholder="Min followers" defaultValue={filters.followerMin ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
        <input name="followerMax" type="number" placeholder="Max followers" defaultValue={filters.followerMax ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
        <select name="status" defaultValue={filters.status ?? ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
          <option value="">Active only</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <div className="col-span-full flex gap-2">
          <button type="submit" className="px-4 py-2 text-white text-sm rounded-lg" style={{ background: "var(--accent)" }}>Apply Filters</button>
          <Link href="/admin/pages" className="px-4 py-2 border text-sm rounded-lg" style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}>Clear</Link>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--bg-secondary)" }}>
            <tr>
              {["Handle", "Owner", "Niche", "Followers", "Eng%", "Top Geo", "Campaigns", "Earnings", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map(page => (
              <tr key={page.id} style={{ borderTopWidth: "1px", borderTopColor: "var(--border)" }}>
                <td className="px-4 py-3">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>@{page.platformUsername}</span>
                  {page.displayLabel && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{page.displayLabel}</p>}
                </td>
                <td className="px-4 py-3">
                  {page.creatorProfile ? (
                    <Link href={`/admin/creators/${page.creatorProfile.id}`} className="hover:underline" style={{ color: "var(--accent)" }}>
                      {page.creatorProfile.displayName || page.creatorProfile.user?.email || "—"}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{page.niche || "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                  {page.followerCount >= 1000000
                    ? `${(page.followerCount / 1000000).toFixed(1)}M`
                    : page.followerCount >= 1000
                    ? `${(page.followerCount / 1000).toFixed(0)}K`
                    : page.followerCount}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{Number(page.engagementRate).toFixed(1)}%</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                  {page.creatorProfile?.topCountry || "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{page._count.campaignApplicationPages}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>€{(page.totalEarnings / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={
                      page.isActive
                        ? { background: "var(--success-bg)", color: "var(--success-text)" }
                        : { background: "var(--bg-secondary)", color: "var(--text-muted)" }
                    }
                  >
                    {page.isActive ? "Active" : "Disconnected"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No pages found.</p>
        )}
      </div>
    </div>
  );
}
