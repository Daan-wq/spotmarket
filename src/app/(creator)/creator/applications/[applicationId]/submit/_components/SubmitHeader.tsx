"use client";

interface Props {
  campaignName: string;
  requirements: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function SubmitHeader({ campaignName, requirements, isLoading, onRefresh }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Submit Content for {campaignName}
        </h1>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-default"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          title="Refresh posts"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isLoading ? "animate-spin" : ""}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{
          background: "rgba(99, 102, 241, 0.1)",
          borderColor: "rgba(99, 102, 241, 0.3)",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          Only views gained after submission count toward earnings.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Submit your post link as soon as you publish it. The earlier you submit, the more views will be counted.
        </p>
      </div>

      {/* Campaign requirements */}
      {requirements && (
        <div
          className="rounded-lg p-3 mb-4 border text-xs"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            Requirements:{" "}
          </span>
          {requirements}
        </div>
      )}
    </div>
  );
}
