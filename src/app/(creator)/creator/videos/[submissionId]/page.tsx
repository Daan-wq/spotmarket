import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true,
          creatorCpv: true,
          advertiser: { select: { brandName: true } },
        },
      },
    },
  });

  if (!submission || submission.creatorId !== user.id) notFound();

  const views = submission.viewCount ?? submission.claimedViews;
  const likes = submission.likeCount ?? 0;
  const comments = submission.commentCount ?? 0;
  const shares = submission.shareCount ?? 0;
  const totalEngagement = views > 0 ? (((likes + comments + shares) / views) * 100) : 0;
  const rewardRate = Number(submission.campaign.creatorCpv) * 1000;
  const platformLabel = submission.campaign.platform === "INSTAGRAM" ? "Instagram" : submission.campaign.platform === "TIKTOK" ? "TikTok" : "Multi-platform";

  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending" },
    FLAGGED: { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6", label: "Flagged" },
    REJECTED: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Rejected" },
    APPROVED: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Approved" },
  };
  const statusStyle = statusStyles[submission.status] ?? statusStyles.PENDING;

  return (
    <div className="flex h-full">
      {/* Left: Post Embed */}
      <div className="w-[50%] flex items-center justify-center p-8" style={{ background: "var(--bg-primary)" }}>
        {submission.postUrl ? (
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)", background: "var(--bg-card)" }}>
            <iframe
              src={`${submission.postUrl}embed`}
              width="100%"
              height="500"
              frameBorder="0"
              scrolling="no"
              allowTransparency
              allow="encrypted-media"
              style={{ border: "none", borderRadius: "12px" }}
            />
          </div>
        ) : (
          <div className="text-center" style={{ color: "var(--text-muted)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
              <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" />
            </svg>
            <p className="text-sm">No post preview available</p>
          </div>
        )}
      </div>

      {/* Right: Detail Panel */}
      <div className="w-[50%] overflow-y-auto p-6 space-y-5" style={{ background: "var(--bg-primary)" }}>
        {/* Back + Title */}
        <Link href="/creator/videos" className="flex items-center gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back
        </Link>

        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{submission.campaign.name}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{submission.campaign.advertiser?.brandName}</p>
        </div>

        {/* Status Badge */}
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {statusStyle.label}
        </span>

        {/* Earnings Card */}
        <div className="p-4 rounded-xl" style={{ background: "var(--success-bg)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success-text)" }}>
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span className="text-sm font-medium" style={{ color: "var(--success-text)" }}>Earned</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: "var(--success-text)" }}>
                ${Number(submission.earnedAmount).toFixed(2)}
              </div>
              <div className="text-xs" style={{ color: "var(--success-text)" }}>
                {submission.status === "PENDING" ? "Pending approval" : submission.status === "APPROVED" ? "Approved" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Views", value: views.toLocaleString(), icon: "eye" },
            { label: "Likes", value: likes.toLocaleString(), icon: "heart" },
            { label: "Comments", value: comments.toLocaleString(), icon: "message" },
            { label: "Shares", value: shares.toLocaleString(), icon: "share" },
          ].map((m) => (
            <div key={m.label} className="p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{m.label}</div>
              <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Engagement</div>
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{totalEngagement.toFixed(2)}%</div>
        </div>

        {/* Campaign Info */}
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "var(--text-muted)" }}>CAMPAIGN</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{submission.campaign.name}</div>
          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs" style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
            ${rewardRate.toFixed(1)} per 1K views
          </span>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            {submission.campaign.advertiser?.brandName}
          </div>
        </div>

        {/* Platform Info */}
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "var(--text-muted)" }}>PLATFORM</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={submission.campaign.platform} size={24} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{platformLabel}</span>
            </div>
            {submission.postUrl && (
              <a href={submission.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: "var(--primary)" }}>
                Original post
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "var(--text-muted)" }}>DATES</div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
              </svg>
              Uploaded
            </div>
            <span style={{ color: "var(--text-primary)" }}>
              {new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Link
            href={`/creator/campaigns/${submission.campaign.id}`}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
            </svg>
            View Campaign
          </Link>
{submission.postUrl && (
            <a
              href={submission.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View Original Post
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
