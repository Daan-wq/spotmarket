"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface PostHogIdentifyProps {
  userId: string;
  role: "admin" | "creator";
}

export function PostHogIdentify({ userId, role }: PostHogIdentifyProps) {
  useEffect(() => {
    if (!userId) return;

    posthog.identify(userId, { role });
    posthog.register({ role });
  }, [userId, role]);

  return null;
}
