type CampaignSubmissionStatus = string | null | undefined;

export const CAMPAIGN_CLOSED_FOR_SUBMISSIONS_MESSAGE =
  "This campaign has ended and no longer accepts submissions.";

export function getCampaignDeadlineState(
  deadline: Date | string | null | undefined,
  now = new Date(),
) {
  if (!deadline) return { state: "none" as const, label: "No deadline", days: null };

  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) {
    return { state: "none" as const, label: "No deadline", days: null };
  }

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
  return {
    state: days <= 7 ? "soon" as const : "open" as const,
    label: `${days} days left`,
    days,
  };
}

export function isCampaignClosedForSubmissions({
  status,
  deadline,
  now,
}: {
  status: CampaignSubmissionStatus;
  deadline: Date | string | null | undefined;
  now?: Date;
}) {
  if ((status ?? "").toLowerCase() !== "active") return true;
  return getCampaignDeadlineState(deadline, now).state === "ended";
}

export function campaignCanAcceptSubmissions(args: {
  status: CampaignSubmissionStatus;
  deadline: Date | string | null | undefined;
  now?: Date;
}) {
  return !isCampaignClosedForSubmissions(args);
}
