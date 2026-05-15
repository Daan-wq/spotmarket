"use client";

interface WelcomeHeaderProps {
  displayName: string;
  /** Optional one-line status sentence shown under the greeting. */
  status?: string;
}

export function WelcomeHeader({ displayName, status }: WelcomeHeaderProps) {
  const prefix = "Welcome";
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
