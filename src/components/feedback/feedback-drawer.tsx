"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";

type Mode = "bug" | "feature";

interface FeedbackDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FEATURE_CATEGORIES = [
  "Campaigns",
  "Clips",
  "Payments",
  "Accounts",
  "Analytics",
  "Course",
  "Other",
];

export function FeedbackDrawer({ open, onClose }: FeedbackDrawerProps) {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("bug");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<string>(FEATURE_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset on open so a stale success state from a previous open doesn't show
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          description: description.trim(),
          title: mode === "feature" ? title.trim() : undefined,
          severity: mode === "bug" ? severity : undefined,
          category: mode === "feature" ? category : undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          viewport:
            typeof window !== "undefined"
              ? `${window.innerWidth}x${window.innerHeight}`
              : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submit failed");
      }
      setSuccess(true);
      setDescription("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Send feedback"
      description="We read every report. Page, browser and viewport are auto-attached."
      width="md"
    >
      <div className="space-y-4">
        <Tabs
          items={[
            { key: "bug", label: "Report a bug" },
            { key: "feature", label: "Suggest a feature" },
          ]}
          value={mode}
          onChange={(k) => {
            setMode(k as Mode);
            setSuccess(false);
            setError(null);
          }}
        />

        {error && <AlertBanner tone="error" title={error} />}
        {success && (
          <AlertBanner
            tone="success"
            title="Thanks — feedback received"
            description="We'll take a look. Feel free to send another."
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "feature" && (
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                placeholder="One sentence summary"
                className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
          )}

          <Field
            label={mode === "bug" ? "What went wrong?" : "Describe the feature"}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              required
              placeholder={
                mode === "bug"
                  ? "What did you do? What did you expect? What happened instead?"
                  : "What problem does this solve, and how would it work?"
              }
              className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
              style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
            />
            <p className="mt-1 text-xs text-right" style={{ color: "var(--text-muted)" }}>
              {description.length} / 2000
            </p>
          </Field>

          {mode === "bug" && (
            <Field label="Severity">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as "low" | "medium" | "high")}
                className="w-full px-3 py-2 rounded-md border text-sm cursor-pointer"
                style={inputStyle}
              >
                <option value="low">Low — minor annoyance</option>
                <option value="medium">Medium — affects my workflow</option>
                <option value="high">High — blocking me</option>
              </select>
            </Field>
          )}

          {mode === "feature" && (
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm cursor-pointer"
                style={inputStyle}
              >
                {FEATURE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" isPending={submitting}>
              Send {mode === "bug" ? "report" : "request"}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};
