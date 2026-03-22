import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

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
    niche?: string;
    isActive?: boolean;
    followerCount?: {
      gte?: number;
      lte?: number;
    };
  }

  const where: WhereClause = {};

  if (filters.platform) {
    where.platform = filters.platform as "instagram" | "tiktok";
  }
  if (filters.niche) {
    where.niche = filters.niche;
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

  const pages = await prisma.socialAccount.findMany({
    where,
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
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
          <h1 className="text-2xl font-bold text-gray-900">Creator Pages</h1>
          <p className="text-sm text-gray-500 mt-1">All Instagram and TikTok pages connected across creators</p>
        </div>
        <span className="text-sm text-gray-500">{totalPages} total pages</span>
      </div>

      {/* Filters */}
      <form className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <select name="platform" defaultValue={filters.platform ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select name="niche" defaultValue={filters.niche ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All niches</option>
          {["sports", "memes", "casino", "lifestyle", "crypto", "other"].map(n => (
            <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
          ))}
        </select>
        <input name="country" type="text" placeholder="Country (US, NL...)" defaultValue={filters.country ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input name="followerMin" type="number" placeholder="Min followers" defaultValue={filters.followerMin ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input name="followerMax" type="number" placeholder="Max followers" defaultValue={filters.followerMax ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <select name="status" defaultValue={filters.status ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Active only</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <div className="col-span-full flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Apply Filters</button>
          <Link href="/admin/pages" className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Clear</Link>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Handle", "Owner", "Niche", "Followers", "Eng%", "Top Geo", "Campaigns", "Earnings", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map(page => (
              <tr key={page.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">@{page.platformUsername}</span>
                  {page.displayLabel && <p className="text-xs text-gray-500">{page.displayLabel}</p>}
                </td>
                <td className="px-4 py-3">
                  {page.creatorProfile ? (
                    <Link href={`/admin/creators/${page.creatorProfile.id}`} className="text-blue-600 hover:underline">
                      {page.creatorProfile.displayName || page.creatorProfile.user?.email || "—"}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{page.niche || "—"}</td>
                <td className="px-4 py-3 text-gray-900">
                  {page.followerCount >= 1000000
                    ? `${(page.followerCount / 1000000).toFixed(1)}M`
                    : page.followerCount >= 1000
                    ? `${(page.followerCount / 1000).toFixed(0)}K`
                    : page.followerCount}
                </td>
                <td className="px-4 py-3 text-gray-900">{Number(page.engagementRate).toFixed(1)}%</td>
                <td className="px-4 py-3 text-gray-600">—</td>
                <td className="px-4 py-3 text-gray-900">{page._count.campaignApplicationPages}</td>
                <td className="px-4 py-3 text-gray-900">€{(page.totalEarnings / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    page.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {page.isActive ? "Active" : "Disconnected"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">No pages found.</p>
        )}
      </div>
    </div>
  );
}
