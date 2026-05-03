export type UpdateCategory = "New" | "Improved" | "Fixed";

export interface UpdateEntry {
  /** ISO date — used as the unique key and for read-state tracking. */
  date: string;
  title: string;
  category: UpdateCategory;
  description: string;
}

/**
 * Authored updates, newest first. Add a new entry at the top whenever a
 * user-visible change ships. Keep descriptions short — one or two sentences.
 */
export const UPDATES: UpdateEntry[] = [
  {
    date: "2026-05-03",
    title: "Cleaner dashboard with an activation checklist",
    category: "New",
    description:
      "Your dashboard now greets you by name, alerts you when something needs attention, and shows a step-by-step checklist until you've made your first payout.",
  },
  {
    date: "2026-05-03",
    title: "Wallet and Payouts are now one Payments page",
    category: "Improved",
    description:
      "Overview, withdrawals, and history live in three tabs. The old /creator/wallet link still works.",
  },
  {
    date: "2026-05-03",
    title: "Campaign cards show whether you qualify",
    category: "New",
    description:
      "Each card now tells you instantly whether you meet the platform and follower requirements, plus highlights campaigns ending in the next 7 days.",
  },
  {
    date: "2026-05-03",
    title: "We now ask before redirecting you to OAuth",
    category: "Improved",
    description:
      "Connecting an account opens a short panel explaining exactly what we'll access and what we won't do — before sending you to the platform.",
  },
  {
    date: "2026-05-03",
    title: "In-app feedback drawer",
    category: "New",
    description:
      "Hit the Feedback button at the top to send a bug report or feature request. Page, browser, and viewport are auto-attached.",
  },
];
