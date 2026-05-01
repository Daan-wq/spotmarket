"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedPost } from "@/types/media";
import PlatformTabs from "./_components/PlatformTabs";
import AccountSwitcher from "./_components/AccountSwitcher";
import PostGrid from "./_components/PostGrid";
import PaginationControls from "./_components/PaginationControls";
import SearchBar from "./_components/SearchBar";
import DateFilterControl, { type DateFilter } from "./_components/DateFilterControl";
import SubmitHeader from "./_components/SubmitHeader";

type Platform = "ig" | "tt" | "fb";

interface Connection {
  id: string;
  username: string;
}

interface Campaign {
  name: string;
  startsAt: string | null;
  requiredHashtags: string[];
  requirements: string | null;
}

interface Props {
  applicationId: string;
  connections: Record<Platform, Connection[]>;
  campaign: Campaign;
  initialSubmittedUrls: string[];
}

export default function SubmitPageClient({
  applicationId,
  connections,
  campaign,
  initialSubmittedUrls,
}: Props) {
  const router = useRouter();

  const platforms = useMemo<Platform[]>(() => {
    const p: Platform[] = [];
    if (connections.ig.length > 0) p.push("ig");
    if (connections.tt.length > 0) p.push("tt");
    if (connections.fb.length > 0) p.push("fb");
    return p;
  }, [connections]);

  const defaultPlatform: Platform = platforms[0] ?? "ig";
  const defaultConnectionId = connections[defaultPlatform]?.[0]?.id ?? "";

  const [mode, setMode] = useState<"select" | "manual">(
    platforms.length === 0 ? "manual" : "select"
  );
  const [activePlatform, setActivePlatform] = useState<Platform>(defaultPlatform);
  const [activeConnectionId, setActiveConnectionId] = useState<string>(defaultConnectionId);

  // Page cache: connectionId → pages array (each page is NormalizedPost[])
  const pageCache = useRef<Map<string, NormalizedPost[][]>>(new Map());
  // Cursor cache: connectionId → [null (page0 cursor), cursorForPage1, ...]
  const cursorCache = useRef<Map<string, (string | null)[]>>(new Map());

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPosts, setCurrentPosts] = useState<NormalizedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    mode: "campaign",
    from: campaign.startsAt ?? undefined,
  });

  const [selectedPostUrls, setSelectedPostUrls] = useState<Set<string>>(new Set());
  const [submittedPostUrls, setSubmittedPostUrls] = useState<Set<string>>(
    new Set(initialSubmittedUrls)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual mode
  const [postUrl, setPostUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const fetchPage = useCallback(
    async (
      platform: Platform,
      connectionId: string,
      pageIndex: number,
      refresh = false
    ) => {
      if (refresh) {
        pageCache.current.delete(connectionId);
        cursorCache.current.delete(connectionId);
      }

      const cached = pageCache.current.get(connectionId)?.[pageIndex];
      if (cached) {
        setCurrentPosts(cached);
        return;
      }

      const cursors = cursorCache.current.get(connectionId) ?? [null];
      const cursor = cursors[pageIndex] ?? null;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          platform,
          connectionId,
          limit: "10",
        });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/creator/media?${params}`);

        if (res.status === 429) {
          setRateLimitedUntil(Date.now() + 60_000);
          setCurrentPosts([]);
          return;
        }
        if (!res.ok) throw new Error("Failed to load posts");

        const data = await res.json();
        const posts: NormalizedPost[] = data.posts ?? [];
        const nextCursor: string | null = data.nextCursor ?? null;
        const hasMore: boolean = data.hasMore ?? false;

        // Store in cache
        const pages = pageCache.current.get(connectionId) ?? [];
        pages[pageIndex] = posts;
        pageCache.current.set(connectionId, pages);

        const newCursors = cursorCache.current.get(connectionId) ?? [null];
        if (hasMore && nextCursor && pageIndex + 1 >= newCursors.length) {
          newCursors[pageIndex + 1] = nextCursor;
        }
        cursorCache.current.set(connectionId, newCursors);

        setCurrentPosts(posts);
      } catch {
        setCurrentPosts([]);
        setError("Failed to load posts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load first page on mount
  useEffect(() => {
    if (defaultConnectionId) {
      fetchPage(defaultPlatform, defaultConnectionId, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlatformChange = (platform: Platform) => {
    const firstConn = connections[platform][0];
    if (!firstConn) return;
    setActivePlatform(platform);
    setActiveConnectionId(firstConn.id);
    setCurrentPageIndex(0);
    setSelectedPostUrls(new Set());
    setSearchQuery("");
    fetchPage(platform, firstConn.id, 0);
  };

  const handleConnectionChange = (connectionId: string) => {
    setActiveConnectionId(connectionId);
    setCurrentPageIndex(0);
    setSelectedPostUrls(new Set());
    fetchPage(activePlatform, connectionId, 0);
  };

  const handleRefresh = () => {
    setCurrentPageIndex(0);
    setSelectedPostUrls(new Set());
    fetchPage(activePlatform, activeConnectionId, 0, true);
  };

  const handleNext = () => {
    const nextIndex = currentPageIndex + 1;
    setCurrentPageIndex(nextIndex);
    setSelectedPostUrls(new Set());
    fetchPage(activePlatform, activeConnectionId, nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = currentPageIndex - 1;
    if (prevIndex < 0) return;
    setCurrentPageIndex(prevIndex);
    setSelectedPostUrls(new Set());
    fetchPage(activePlatform, activeConnectionId, prevIndex);
  };

  // Derived: whether there's a next page available
  const hasMore =
    (cursorCache.current.get(activeConnectionId)?.length ?? 0) > currentPageIndex + 1;

  const isRateLimited = rateLimitedUntil !== null && Date.now() < rateLimitedUntil;

  const filteredPosts = useMemo(() => {
    return currentPosts.filter((post) => {
      if (searchQuery) {
        if (!post.caption?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      if (dateFilter.from) {
        if (post.publishedAt.slice(0, 10) < dateFilter.from) return false;
      }
      if (dateFilter.to) {
        if (post.publishedAt.slice(0, 10) > dateFilter.to) return false;
      }
      return true;
    });
  }, [currentPosts, searchQuery, dateFilter]);

  const togglePost = (url: string) => {
    if (submittedPostUrls.has(url)) return;
    setSelectedPostUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const submitSelected = async () => {
    if (selectedPostUrls.size === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const urls = Array.from(selectedPostUrls);
    let submitted = 0;

    for (const url of urls) {
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, postUrl: url }),
        });
        if (res.ok) {
          submitted++;
          setSubmittedPostUrls((prev) => new Set([...prev, url]));
        } else {
          const data = await res.json();
          setError(data.error || `Failed to submit`);
        }
      } catch {
        setError("Submission failed. Please try again.");
      }
    }

    setSubmitting(false);
    setSelectedPostUrls(new Set());

    if (submitted > 0) {
      if (submitted === urls.length) {
        router.push(`/creator/applications/${applicationId}`);
      } else {
        setSuccess(`${submitted} of ${urls.length} posts submitted successfully.`);
      }
    }
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          postUrl,
          screenshotUrl: screenshotUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit");
        return;
      }
      router.push(`/creator/applications/${applicationId}`);
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const activeConnections = connections[activePlatform] ?? [];
  const allPlatforms: Platform[] = ["ig", "tt", "fb"];

  return (
    <div className="p-6 max-w-4xl">
      <SubmitHeader
        campaignName={campaign.name}
        requirements={campaign.requirements}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {error && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
        >
          {success}
        </div>
      )}

      {/* Rate limit banner */}
      {isRateLimited && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04" }}
        >
          Instagram is rate-limited — try again in ~1 minute.
        </div>
      )}

      {mode === "select" ? (
        <div
          className="rounded-lg border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Header row */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b gap-3"
            style={{ borderColor: "var(--border)" }}
          >
            <PlatformTabs
              platforms={allPlatforms}
              active={activePlatform}
              onChange={handlePlatformChange}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={submitSelected}
                disabled={selectedPostUrls.size === 0 || submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 cursor-pointer"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {submitting
                  ? "Submitting…"
                  : `Submit${selectedPostUrls.size > 0 ? ` (${selectedPostUrls.size})` : ""}`}
              </button>
              <button
                onClick={() => setMode("manual")}
                className="text-xs transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Manual →
              </button>
            </div>
          </div>

          {/* Account switcher + filters */}
          <div
            className="flex flex-wrap items-center gap-3 px-5 py-2 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <AccountSwitcher
              accounts={activeConnections}
              activeId={activeConnectionId}
              onChange={handleConnectionChange}
            />
            <div className="flex-1" />
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <DateFilterControl
              filter={dateFilter}
              campaignStartDate={campaign.startsAt}
              onChange={setDateFilter}
            />
          </div>

          {/* Selection hint */}
          <div className="px-5 pt-4 pb-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {selectedPostUrls.size > 0
                ? `${selectedPostUrls.size} post${selectedPostUrls.size !== 1 ? "s" : ""} selected`
                : "Select the posts you want to submit"}
            </p>
          </div>

          {/* Grid */}
          <div className="p-5">
            <PostGrid
              posts={filteredPosts}
              isLoading={isLoading}
              selectedUrls={selectedPostUrls}
              submittedUrls={submittedPostUrls}
              requiredHashtags={campaign.requiredHashtags}
              hasConnectedAccount={activeConnections.length > 0}
              platform={activePlatform}
              onToggle={togglePost}
            />

            {/* Pagination */}
            {!isLoading && activeConnections.length > 0 && currentPosts.length > 0 && (
              <PaginationControls
                pageIndex={currentPageIndex}
                hasMore={hasMore}
                isLoading={isLoading}
                isRateLimited={isRateLimited}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            )}
          </div>
        </div>
      ) : (
        /* Manual mode */
        <div
          className="rounded-lg border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {platforms.length > 0 && (
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Manual Submission
              </span>
              <button
                onClick={() => setMode("select")}
                className="text-xs transition-colors cursor-pointer"
                style={{ color: "var(--primary)" }}
              >
                ← Select from page
              </button>
            </div>
          )}

          {platforms.length === 0 && (
            <div
              className="m-5 mb-0 p-3 rounded-lg text-sm border"
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                borderColor: "rgba(99, 102, 241, 0.3)",
                color: "var(--text-secondary)",
              }}
            >
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                Submitting via link in bio
              </p>
              <p className="text-xs mt-1">
                Paste the public URL of your post. The clip&apos;s author handle must match one
                of your verified accounts. We&apos;ll track views automatically once approved.
              </p>
            </div>
          )}

          <form onSubmit={submitManual} className="p-5 space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Post URL
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@you/video/… or https://instagram.com/reel/…"
                required
                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Screenshot URL{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://example.com/screenshot.png"
                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !postUrl}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 cursor-pointer"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {submitting ? "Submitting…" : "Submit Post"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm border transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
