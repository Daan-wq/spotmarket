"use client";

import type { ComponentType } from "react";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { CreditCard } from "@/components/animate-ui/icons/credit-card";
import { Megaphone } from "@/components/animate-ui/icons/megaphone";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { Users } from "@/components/animate-ui/icons/users";

export type CreatorNavIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

export const CREATOR_NAV_ITEMS: Array<{
  href: string;
  label: string;
  labelKey: "campaigns" | "connections" | "videos" | "payouts" | "referral";
  firstClipTarget: string;
  icon: CreatorNavIcon;
}> = [
  { href: "/creator/campaigns", label: "Campaigns", labelKey: "campaigns", firstClipTarget: "creator-nav-campaigns", icon: Megaphone },
  { href: "/creator/connections", label: "Accounts", labelKey: "connections", firstClipTarget: "creator-nav-connections", icon: ChartSpline },
  { href: "/creator/videos", label: "My Clips", labelKey: "videos", firstClipTarget: "creator-nav-videos", icon: Clapperboard },
  { href: "/creator/payouts", label: "Payments", labelKey: "payouts", firstClipTarget: "creator-nav-payouts", icon: CreditCard },
  { href: "/creator/referral", label: "Referral", labelKey: "referral", firstClipTarget: "creator-nav-referral", icon: Users },
];

export const CREATOR_BOTTOM_NAV_ITEMS = CREATOR_NAV_ITEMS.filter((item) =>
  [
    "/creator/campaigns",
    "/creator/connections",
    "/creator/videos",
    "/creator/payouts",
  ].includes(item.href),
);
