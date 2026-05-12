"use client";

import type { ComponentType } from "react";
import { CreditCard } from "@/components/animate-ui/icons/credit-card";
import { GraduationCap } from "@/components/animate-ui/icons/graduation-cap";
import { Megaphone } from "@/components/animate-ui/icons/megaphone";
import { Video } from "@/components/animate-ui/icons/video";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { Users } from "@/components/animate-ui/icons/users";

export type CreatorNavIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

export const CREATOR_NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: CreatorNavIcon;
}> = [
  { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/creator/connections", label: "Accounts", icon: ChartSpline },
  { href: "/creator/videos", label: "My Clips", icon: Video },
  { href: "/creator/payouts", label: "Payments", icon: CreditCard },
  { href: "/creator/course", label: "Course", icon: GraduationCap },
  { href: "/creator/referral", label: "Referral", icon: Users },
];

export const CREATOR_BOTTOM_NAV_ITEMS = CREATOR_NAV_ITEMS.filter((item) =>
  ["/creator/campaigns", "/creator/connections", "/creator/videos"].includes(
    item.href,
  ),
);
