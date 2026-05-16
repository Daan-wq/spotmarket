"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedPost } from "@/types/media";
import PlatformTabs from "@/components/shared/connections/PlatformTabs";
import AccountSwitcher from "@/components/shared/connections/AccountSwitcher";
import PostGrid from "./_components/PostGrid";
import PaginationControls from "./_components/PaginationControls";
import SearchBar from "./_components/SearchBar";
import DateFilterControl, { type DateFilter } from "./_components/DateFilterControl";
import SubmitHeader from "./_components/SubmitHeader";

type Platform = "ig" | "tt" | "yt" | "fb";

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
  /** When set, the client tries to find this post in the grid and pre-select it. */
  prefillUrl?: string | null;
  prefillPlatform?: Platform | null;
}

// Per-card identity. Two cards rendered in the grid can share a `url`
// (empty/missing permalink, upstream duplicates), so URL is not safe as
// the UI state key. Id is unique within a platform; prefix with platform
// to stay safe across platform tabs.
const keyOf = (p: { platform: Platform; id: string }) => `${p.platform}:${p.id}`;

const PLATFORM_NAMES: Record<Platform, string> = {
  ig: "Instagram",
  tt: "TikTok",
  yt: "YouTube",
  fb: "Facebook",
};

const PLATFORM_CONNECT_HREFS: Record<Platform, string> = {
  ig: "/api/auth/instagram",
  tt: "/api/auth/tiktok",
  yt: "/api/auth/youtube",
  fb: "/api/auth/facebook",
};

export default function SubmitPageClient({
  applicationId,
  connections,
  campaign,
  initialSubmittedUrls,
  prefillUrl,
  prefillPlatform,
}: Props) {
  const router = useRouter();

  const platforms = useMemo<Platform[]>(() => {
    const p: Platform[] = [];
    if (connections.ig.length > 0) p.push("ig");
    if (connections.tt.length > 0) p.push("tt");
    if (connections.yt.length > 0) p.push("yt");
    if (connections.fb.length > 0) p.push("fb");
    return p;
  }, [connections]);

  // If we got a prefill platform that the creator has connected, start there.
  const initialPlatform: Platform =
    prefillPlatform && platforms.includes(prefillPlatform)
      ? prefillPlatform
      : platforms[0] ?? "ig";
  const defaultPlatform = initialPlatform;
  const defaultConnectionId = connections[defaultPlatform]?.[0]?.id ?? "";

  const [activePlatform, setActivePlatform] = useState<Platform>(defaultPlatform);
  const [activeConnectionId, setActiveConnectionId] = useState<string>(defaultConnectionId);
  // One-shot flag: once we've handled a prefillUrl, don't keep trying.
  const prefillHandledRef = useRef(false);
  const [prefillNotFound, setPrefillNotFound] = useState(false);

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

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [submittingKeys, setSubmittingKeys] = useState<Set<string>>(new Set());
  // URLs known to be in the DB on initial page load (frozen). For these, URL
  // match marks the matching card(s) as submitted on first render.
  const initialSubmittedUrlSet = useMemo(
    () => new Set(initialSubmittedUrls),
    [initialSubmittedUrls]
  );
  // Cards submitted during this session — tracked by id-key so a URL collision
  // can't cascade the "Submitted" overlay onto an unrelated card.
  const [sessionSubmittedKeys, setSessionSubmittedKeys] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectPromptPlatform, setConnectPromptPlatform] = useState<Platform | null>(null);

  // Synchronous single-flight lock across submitOne + submitSelected. Two
  // rapid clicks on different per-card Submit buttons (or per-card + bulk)
  // would otherwise both pass the per-key submitting guard because
  // setState is async, leading to two unintended submissions.
  const submitInFlightRef = useRef(false);

  const submittedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of currentPosts) {
      const k = keyOf(p);
      if (sessionSubmittedKeys.has(k) || initialSubmittedUrlSet.has(p.url)) {
        s.add(k);
      }
    }
    return s;
  }, [currentPosts, sessionSubmittedKeys, initialSubmittedUrlSet]);

  const fetchPage = useCallback(
    async (
      platform: Platform,
      connectionId: string,
      pageIndex: number,
      refresh = false
    ) => {
      if (!connectionId) {
        setCurrentPosts([]);
        setError(null);
        setIsLoading(false);
        return;
      }

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
        if (refresh) params.set("refresh", "1");

        const res = await fetch(`/api/creator/media?${params}`);

        if (res.status === 429) {
          setRateLimitedUntil(Date.now() + 60_000);
          setCurrentPosts([]);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const apiError = typeof body?.error === "string" ? body.error : null;
          throw new Error(apiError || "Failed to load posts");
        }

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
      } catch (err) {
        setCurrentPosts([]);
        const fallback = `Could not load your ${PLATFORM_NAMES[platform]} posts. Please try again.`;
        setError(err instanceof Error && err.message ? err.message : fallback);
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

  // Prefill: when the page was opened via "Submit for Campaign" on Accounts → Content,
  // try to find the matching post in the freshly-fetched grid and pre-select it.
  useEffect(() => {
    if (prefillHandledRef.current) return;
    if (!prefillUrl) return;
    if (currentPosts.length === 0) return;
    const match = currentPosts.find((p) => p.url === prefillUrl);
    if (!match) {
      // Don't latch — user can still flip platform tabs to find it.
      setPrefillNotFound(true);
      return;
    }
    prefillHandledRef.current = true;
    setPrefillNotFound(false);
    setSelectedKeys((prev) => new Set(prev).add(keyOf(match)));
    // Defer scroll until DOM has the new card.
    const id = `submit-card-${keyOf(match)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [prefillUrl, currentPosts]);

  const handlePlatformChange = (platform: Platform) => {
    const firstConn = connections[platform][0];
    setActivePlatform(platform);
    setActiveConnectionId(firstConn?.id ?? "");
    setCurrentPageIndex(0);
    setCurrentPosts([]);
    setSelectedKeys(new Set());
    setSearchQuery("");
    setError(null);
    setSuccess(null);

    if (!firstConn) {
      setConnectPromptPlatform(platform);
      return;
    }

    setConnectPromptPlatform(null);
    fetchPage(platform, firstConn.id, 0);
  };

  const handleConnectionChange = (connectionId: string) => {
    setActiveConnectionId(connectionId);
    setCurrentPageIndex(0);
    setSelectedKeys(new Set());
    setConnectPromptPlatform(null);
    fetchPage(activePlatform, connectionId, 0);
  };

  const handleRefresh = () => {
    setCurrentPageIndex(0);
    setSelectedKeys(new Set());
    if (!activeConnectionId) {
      setCurrentPosts([]);
      setError(null);
      setConnectPromptPlatform(activePlatform);
      return;
    }
    fetchPage(activePlatform, activeConnectionId, 0, true);
  };

  const handleNext = () => {
    if (!activeConnectionId) return;
    const nextIndex = currentPageIndex + 1;
    setCurrentPageIndex(nextIndex);
    setSelectedKeys(new Set());
    fetchPage(activePlatform, activeConnectionId, nextIndex);
  };

  const handlePrev = () => {
    if (!activeConnectionId) return;
    const prevIndex = currentPageIndex - 1;
    if (prevIndex < 0) return;
    setCurrentPageIndex(prevIndex);
    setSelectedKeys(new Set());
    fetchPage(activePlatform, activeConnectionId, prevIndex);
  };

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

  const togglePost = (post: NormalizedPost) => {
    const k = keyOf(post);
    if (submittedKeys.has(k)) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const submitOne = async (post: NormalizedPost) => {
    const k = keyOf(post);
    if (submittedKeys.has(k)) return;
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setError(null);
    setSuccess(null);
    setSubmittingKeys((prev) => new Set(prev).add(k));
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          postUrl: post.url,
          thumbnailUrl: post.thumbnail ?? undefined,
          mediaType: post.mediaType,
        }),
      });
      if (res.ok) {
        setSessionSubmittedKeys((prev) => new Set(prev).add(k));
        setSelectedKeys((prev) => {
          if (!prev.has(k)) return prev;
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
        setSuccess("Clip submitted.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmittingKeys((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      submitInFlightRef.current = false;
    }
  };

  const submitSelected = async () => {
    if (selectedKeys.size === 0) return;
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const keys = Array.from(selectedKeys);
    const postsByKey = new Map(currentPosts.map((p) => [keyOf(p), p]));
    let submitted = 0;

    for (const k of keys) {
      const post = postsByKey.get(k);
      if (!post) continue;
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            postUrl: post.url,
            thumbnailUrl: post.thumbnail ?? undefined,
            mediaType: post.mediaType,
          }),
        });
        if (res.ok) {
          submitted++;
          setSessionSubmittedKeys((prev) => new Set(prev).add(k));
        } else {
          const data = await res.json();
          setError(data.error || `Failed to submit`);
        }
      } catch {
        setError("Submission failed. Please try again.");
      }
    }

    setSubmitting(false);
    setSelectedKeys(new Set());
    submitInFlightRef.current = false;

    if (submitted > 0) {
      if (submitted === keys.length) {
        router.push(`/creator/applications/${applicationId}`);
      } else {
        setSuccess(`${submitted} of ${keys.length} posts submitted successfully.`);
      }
    }
  };

  const activeConnections = connections[activePlatform] ?? [];
  const allPlatforms: Platform[] = ["ig", "tt", "yt", "fb"];
  const connectPromptName = connectPromptPlatform
    ? PLATFORM_NAMES[connectPromptPlatform]
    : null;

  return (
    <div className="w-full md:p-6">
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

      {isRateLimited && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04" }}
        >
          Instagram is rate-limited — try again in ~1 minute.
        </div>
      )}

      {prefillNotFound && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04" }}
        >
          We couldn&apos;t auto-select that post on this page. Try switching the platform tab or paging back to find it.
        </div>
      )}

      {connectPromptPlatform && connectPromptName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-connect-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close connect prompt"
            onClick={() => setConnectPromptPlatform(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-lg border p-5 shadow-xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="mb-5">
              <h2
                id="submit-connect-title"
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                You do not have a {connectPromptName} account yet
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Connect it now to load posts and submit clips.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                onClick={() => setConnectPromptPlatform(null)}
              >
                Close
              </button>
              <a
                href={PLATFORM_CONNECT_HREFS[connectPromptPlatform]}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                Connect it now
              </a>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-lg border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Platform tabs + submit button */}
        <div
          className="flex flex-col items-stretch justify-between gap-3 border-b px-4 py-3 sm:flex-row sm:items-center md:px-5"
          style={{ borderColor: "var(--border)" }}
        >
          <PlatformTabs
            platforms={allPlatforms}
            active={activePlatform}
            onChange={handlePlatformChange}
          />
          <button
            onClick={submitSelected}
            disabled={selectedKeys.size === 0 || submitting}
            className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30 cursor-pointer"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {submitting
              ? "Submitting…"
              : `Submit${selectedKeys.size > 0 ? ` (${selectedKeys.size})` : ""}`}
          </button>
        </div>

        {/* Account tabs + filters */}
        <div
          className="flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-5"
          style={{ borderColor: "var(--border)" }}
        >
          <AccountSwitcher
            accounts={activeConnections}
            activeId={activeConnectionId}
            onChange={handleConnectionChange}
          />
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
            {selectedKeys.size > 0
              ? `${selectedKeys.size} post${selectedKeys.size !== 1 ? "s" : ""} selected`
              : "Select the posts you want to submit"}
          </p>
        </div>

        {/* Grid */}
        <div className="p-5">
          <PostGrid
            posts={filteredPosts}
            isLoading={isLoading}
            selectedKeys={selectedKeys}
            submittedKeys={submittedKeys}
            submittingKeys={submittingKeys}
            requiredHashtags={campaign.requiredHashtags}
            hasConnectedAccount={activeConnections.length > 0}
            platform={activePlatform}
            onToggle={togglePost}
            onSubmitOne={submitOne}
          />

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
    </div>
  );
}
