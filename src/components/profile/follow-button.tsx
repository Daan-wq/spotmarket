"use client";

import { useRef, useState } from "react";

interface Props {
  userId: string;
  initialFollowing: boolean;
  initialCount: number;
}

export function FollowButton({ userId, initialFollowing, initialCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const inFlight = useRef(false);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;

    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setCount((c) => (wasFollowing ? c - 1 : c + 1));

    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("follow request failed");
    } catch {
      setFollowing(wasFollowing);
      setCount((c) => (wasFollowing ? c + 1 : c - 1));
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <button
      onClick={toggle}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity cursor-pointer"
      style={
        following
          ? { background: "var(--muted)", color: "var(--text-primary)", border: "1px solid var(--border)" }
          : { background: "var(--text-primary)", color: "#fff" }
      }
    >
      {following ? "Following" : "Follow"}
      <span className="ml-1.5 text-xs opacity-60">{count}</span>
    </button>
  );
}
