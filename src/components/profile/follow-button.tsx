"use client";

import { useState } from "react";

interface Props {
  userId: string;
  initialFollowing: boolean;
  initialCount: number;
}

export function FollowButton({ userId, initialFollowing, initialCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      setFollowing(!following);
      setCount(c => following ? c - 1 : c + 1);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 cursor-pointer"
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
