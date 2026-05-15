import PlatformIcon from "@/components/shared/PlatformIcon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { Clock } from "lucide-react";

type CampaignStatus =
  | "draft"
  | "pending_payment"
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | string;

export function CampaignAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initial = (name.trim().charAt(0) || "C").toUpperCase();
  const sizeClass = {
    sm: "h-10 w-10 rounded-xl text-sm",
    md: "h-12 w-12 rounded-xl text-base",
    lg: "h-16 w-16 rounded-2xl text-xl",
    xl: "h-24 w-24 rounded-2xl text-3xl",
  }[size];

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn("shrink-0 object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-neutral-950 font-bold text-white",
        sizeClass,
        className,
      )}
    >
      {initial}
    </div>
  );
}

export function campaignStatusDisplay(status: CampaignStatus, deadline?: Date | string | null) {
  const normalized = status.toLowerCase();
  const isExpired = deadline ? getDeadlineState(deadline).state === "ended" : false;

  if (normalized === "active" && !isExpired) {
    return { label: "Active", variant: "active" as BadgeVariant };
  }
  if (normalized === "paused") {
    return { label: "Paused", variant: "paused" as BadgeVariant };
  }
  if (
    normalized === "draft" ||
    normalized === "pending_payment" ||
    normalized === "pending_review"
  ) {
    return { label: "Private", variant: "private" as BadgeVariant };
  }
  return { label: "Ended", variant: "neutral" as BadgeVariant };
}

export function CampaignStatusBadge({
  status,
  deadline,
  className,
}: {
  status: CampaignStatus;
  deadline?: Date | string | null;
  className?: string;
}) {
  const display = campaignStatusDisplay(status, deadline);
  return (
    <Badge variant={display.variant} className={className}>
      {display.label}
    </Badge>
  );
}

export function getDeadlineState(deadline: Date | string | null | undefined) {
  if (!deadline) return { state: "none" as const, label: "No deadline", days: null };
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) {
    return { state: "none" as const, label: "No deadline", days: null };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const days = Math.ceil(
    (startOfDeadline.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) return { state: "ended" as const, label: "Ended", days };
  if (days === 0) return { state: "today" as const, label: "Ends today", days };
  if (days === 1) return { state: "soon" as const, label: "1 day left", days };
  return { state: days <= 7 ? "soon" as const : "open" as const, label: `${days} days left`, days };
}

export function CampaignDeadlineBadge({
  deadline,
  className,
}: {
  deadline?: Date | string | null;
  className?: string;
}) {
  const state = getDeadlineState(deadline);
  const variant: BadgeVariant =
    state.state === "ended"
      ? "neutral"
      : state.state === "today" || state.state === "soon"
        ? "ending-soon"
        : "neutral";

  return (
    <Badge
      variant={variant}
      icon={<Clock className="h-3 w-3" aria-hidden />}
      className={className}
    >
      {state.label}
    </Badge>
  );
}

export function CampaignPlatformRow({
  platforms,
  size = 24,
  limit = 4,
  className,
}: {
  platforms: string[];
  size?: number;
  limit?: number;
  className?: string;
}) {
  const visible = platforms.slice(0, limit);
  const extra = Math.max(platforms.length - visible.length, 0);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {visible.map((platform) => (
        <PlatformIcon key={platform} platform={platform} size={size} />
      ))}
      {extra > 0 ? (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function CampaignBudgetProgress({
  totalPaid,
  totalBudget,
  compact = false,
}: {
  totalPaid: number;
  totalBudget: number;
  compact?: boolean;
}) {
  const progress =
    totalBudget > 0 ? Math.min((totalPaid / totalBudget) * 100, 100) : 0;

  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>
          ${totalPaid.toFixed(compact ? 0 : 2)} of ${totalBudget.toFixed(compact ? 0 : 2)} paid
        </span>
        <span>{progress.toFixed(0)}%</span>
      </div>
    </div>
  );
}
