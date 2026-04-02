"use client";

import { useState } from "react";

interface SchedulePickerProps {
  scheduledAt: string | null;
  onChange: (scheduledAt: string | null) => void;
}

export function SchedulePicker({ scheduledAt, onChange }: SchedulePickerProps) {
  const [isScheduled, setIsScheduled] = useState(!!scheduledAt);

  const handleToggle = (scheduled: boolean) => {
    setIsScheduled(scheduled);
    if (!scheduled) {
      onChange(null);
    } else if (scheduledAt) {
      onChange(scheduledAt);
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      const iso = now.toISOString().slice(0, 16);
      onChange(iso);
    }
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onChange(value);
    }
  };

  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);
  const defaultDateTime = scheduledAt || now.toISOString().slice(0, 16);

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>
        Post Timing
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleToggle(false)}
          className="flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors"
          style={{
            borderColor: !isScheduled ? "var(--accent)" : "var(--border)",
            background: !isScheduled ? "var(--accent)" : "var(--bg-elevated)",
            color: !isScheduled ? "#fff" : "var(--text-primary)",
          }}
        >
          Post Now
        </button>
        <button
          onClick={() => handleToggle(true)}
          className="flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors"
          style={{
            borderColor: isScheduled ? "var(--accent)" : "var(--border)",
            background: isScheduled ? "var(--accent)" : "var(--bg-elevated)",
            color: isScheduled ? "#fff" : "var(--text-primary)",
          }}
        >
          Schedule
        </button>
      </div>

      {isScheduled && (
        <div className="mt-3">
          <input
            type="datetime-local"
            value={scheduledAt || defaultDateTime}
            onChange={handleDateTimeChange}
            min={minDateTime}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}
