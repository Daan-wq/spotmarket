"use client";

import { useEffect, useState } from "react";

interface WelcomeHeaderProps {
  displayName: string;
  /** Optional one-line status sentence shown under the greeting. */
  status?: string;
}

function greeting(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeHeader({ displayName, status }: WelcomeHeaderProps) {
  // Default to "Welcome" until we know the client's local hour to avoid SSR mismatch.
  const [prefix, setPrefix] = useState("Welcome");
  useEffect(() => {
    setPrefix(greeting(new Date().getHours()));
  }, []);

  const firstName = displayName.split(/\s+/)[0] || displayName;

  return (
    <header>
      <h1
        className="text-2xl md:text-3xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {prefix}, {firstName}
      </h1>
      {status && (
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {status}
        </p>
      )}
    </header>
  );
}
