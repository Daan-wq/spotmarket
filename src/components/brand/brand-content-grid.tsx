import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/admin/agency-format";
import type { BrandContentSort } from "@/lib/brand-content";

interface ContentItem {
  id: string;
  platform: string;
  postUrl: string;
  thumbnailUrl: string | null;
  publicAccount: string;
  submittedAt: string;
  views: number;
  engagement: number;
}

interface BrandContentGridProps {
  selectedCampaignId: string;
  items: ContentItem[];
  total: number;
  page: number;
  totalPages: number;
  platform: string;
  sort: BrandContentSort;
}

export function BrandContentGrid({
  selectedCampaignId,
  items,
  total,
  page,
  totalPages,
  platform,
  sort,
}: BrandContentGridProps) {
  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-200 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Goedgekeurde clips</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl">Content</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          Bekijk alle goedgekeurde campagnecontent en open video’s direct op het oorspronkelijke platform.
        </p>
      </header>

      <form action="/brand/content" method="get" className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input type="hidden" name="campaignId" value={selectedCampaignId} />
        <FilterField label="Platform">
          <select name="platform" defaultValue={platform} className={selectClassName}>
            <option value="all">Alle platforms</option>
            <option value="TikTok">TikTok</option>
            <option value="Instagram">Instagram</option>
            <option value="YouTube Shorts">YouTube Shorts</option>
            <option value="Facebook">Facebook</option>
            <option value="X">X</option>
          </select>
        </FilterField>
        <FilterField label="Sortering">
          <select name="sort" defaultValue={sort} className={selectClassName}>
            <option value="recent">Meest recent</option>
            <option value="views">Meeste views</option>
            <option value="engagement">Meeste engagement</option>
          </select>
        </FilterField>
        <button type="submit" className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800">
          Tonen
        </button>
      </form>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">{formatNumber(total, "nl")} goedgekeurde clips</p>
        <p className="text-sm text-neutral-500">Pagina {page} van {totalPages}</p>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300">
                    <Play className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{item.platform}</p>
                    <p className="mt-2 font-semibold text-neutral-950">{item.publicAccount}</p>
                    <p className="mt-1 text-xs text-neutral-500">Ingezonden {formatDate(item.submittedAt, "nl")}</p>
                  </div>
                  <Link
                    href={item.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open video"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4">
                  <ContentMetric label="Views" value={formatNumber(item.views, "nl")} />
                  <ContentMetric label="Engagement" value={formatNumber(item.engagement, "nl")} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-14 text-center">
          <h2 className="font-semibold text-neutral-950">Geen goedgekeurde content gevonden</h2>
          <p className="mt-2 text-sm text-neutral-500">Pas de filters aan of kies een andere campagne.</p>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between border-t border-neutral-200 pt-6">
          <PageLink
            disabled={page <= 1}
            href={contentPageHref(selectedCampaignId, platform, sort, page - 1)}
          >
            Vorige
          </PageLink>
          <PageLink
            disabled={page >= totalPages}
            href={contentPageHref(selectedCampaignId, platform, sort, page + 1)}
          >
            Volgende
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-neutral-500">
      {label}
      {children}
    </label>
  );
}

function ContentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return disabled ? (
    <span className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-300">{children}</span>
  ) : (
    <Link href={href} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-950 hover:text-neutral-950">
      {children}
    </Link>
  );
}

function contentPageHref(campaignId: string, platform: string, sort: BrandContentSort, page: number) {
  const params = new URLSearchParams({
    campaignId,
    platform,
    sort,
    page: String(page),
  });
  return `/brand/content?${params.toString()}`;
}

const selectClassName = "h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-950";
