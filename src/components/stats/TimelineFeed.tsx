"use client";

import type { TimelineEvent, TimelineContentType } from "@/lib/stats/timeline";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/stats/types";
import { DashboardPlatformGlyph } from "@/lib/stats/platform-icons";
import { LiftSparkline } from "./LiftSparkline";

interface TimelineFeedProps {
  events: TimelineEvent[];
  /** Map<submissionId, sparkline points>. Stories aren't keyed in this map. */
  lifts: Map<string, Array<{ date: string; views: number }>>;
}

const CONTENT_TYPE_LABEL: Record<TimelineContentType, string> = {
  reel: "Reel",
  post: "Post",
  story: "Story",
  video: "Video",
  short: "Short",
};

export function TimelineFeed({ events, lifts }: TimelineFeedProps) {
  if (events.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No posts in this range yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <Th>Posted</Th>
              <Th>Platform</Th>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th align="right">Views</Th>
              <Th align="right">Engagement</Th>
              <Th align="right">7-day lift</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={e.id}
                className="hover:bg-opacity-30"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <Td>
                  {e.permalink ? (
                    <a
                      href={e.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatPostedAt(e.postedAt)}
                    </a>
                  ) : (
                    formatPostedAt(e.postedAt)
                  )}
                </Td>
                <Td>
                  <span
                    aria-label={PLATFORM_LABEL[e.platform]}
                    className="inline-flex"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <DashboardPlatformGlyph platform={e.platform} size={28} />
                  </span>
                </Td>
                <Td>{CONTENT_TYPE_LABEL[e.contentType]}</Td>
                <Td>{truncate(e.title, 40)}</Td>
                <Td align="right">{e.views?.toLocaleString() ?? "—"}</Td>
                <Td align="right">{e.engagement?.toLocaleString() ?? "—"}</Td>
                <Td align="right">
                  <div className="flex justify-end">
                    {e.kind === "submission" && e.submissionId ? (
                      <LiftSparkline
                        data={lifts.get(e.submissionId) ?? []}
                        color={PLATFORM_COLOR[e.platform]}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        —
                      </span>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className="text-xs font-semibold uppercase tracking-wide py-3 px-3"
      style={{ color: "var(--text-muted)", textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className="py-2.5 px-3" style={{ color: "var(--text-primary)", textAlign: align }}>
      {children}
    </td>
  );
}

function formatPostedAt(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
