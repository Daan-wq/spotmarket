"use client";

import { useState, useEffect, useCallback } from "react";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CONTENT_TYPES = ["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"];
const CONTENT_COLORS: Record<string, string> = {
  REEL: "#7c3aed",
  FEED_VIDEO: "#3b82f6",
  FEED_PHOTO: "#22c55e",
  STORY_VIDEO: "#f59e0b",
  STORY_PHOTO: "#ef4444",
  CAROUSEL: "#ec4899",
};

interface IgAccount { id: string; platformUsername: string }
interface Campaign { id: string; name: string; bannerUrl: string | null }
interface Schedule {
  id: string;
  dayOfWeek: string;
  time: string;
  timezone: string;
  contentType: string;
  campaignId: string | null;
  overlayPosition: string | null;
  overlaySize: string | null;
  captionTemplate: string | null;
  enabled: boolean;
  campaign: { id: string; name: string } | null;
}

export function ScheduleGrid({ igAccounts, campaigns }: { igAccounts: IgAccount[]; campaigns: Campaign[] }) {
  const [selectedAccount, setSelectedAccount] = useState(igAccounts[0]?.id || "");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSlot, setEditSlot] = useState<{ day: string; time: string; existing?: Schedule } | null>(null);

  const fetchSchedules = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules/list/${selectedAccount}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedAccount]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  // Group schedules into grid
  const timeRows = [...new Set(schedules.map(s => s.time))].sort();
  if (timeRows.length === 0) timeRows.push("09:00", "12:00", "18:00");

  const grid: Record<string, Record<string, Schedule | undefined>> = {};
  for (const time of timeRows) {
    grid[time] = {};
    for (const day of DAYS) {
      grid[time][day] = schedules.find(s => s.dayOfWeek === day && s.time === time);
    }
  }

  const handleSave = async (data: Record<string, unknown>) => {
    const method = editSlot?.existing ? "PATCH" : "POST";
    const url = editSlot?.existing ? `/api/schedules/${editSlot.existing.id}` : "/api/schedules";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        igAccountId: selectedAccount,
        dayOfWeek: editSlot?.day,
        time: editSlot?.time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...data,
      }),
    });

    if (res.ok) {
      setEditSlot(null);
      fetchSchedules();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setEditSlot(null);
    fetchSchedules();
  };

  const addTimeRow = () => {
    const time = prompt("Enter time (HH:MM, 24h format):", "15:00");
    if (time && /^\d{2}:\d{2}$/.test(time) && !timeRows.includes(time)) {
      timeRows.push(time);
      timeRows.sort();
      // Force re-render
      setSchedules([...schedules]);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 600 }}>Weekly Schedule</h2>
        <select
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px" }}
        >
          {igAccounts.map(a => <option key={a.id} value={a.id}>@{a.platformUsername}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading...</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr>
                  <th style={{ width: "70px", padding: "8px", fontSize: "12px", color: "var(--text-muted)", textAlign: "left" }}>Time</th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} style={{ padding: "8px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeRows.map(time => (
                  <tr key={time}>
                    <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)", fontFamily: "monospace" }}>{time}</td>
                    {DAYS.map(day => {
                      const slot = grid[time]?.[day];
                      return (
                        <td
                          key={day}
                          onClick={() => setEditSlot({ day, time, existing: slot })}
                          style={{
                            padding: "4px",
                            textAlign: "center",
                            cursor: "pointer",
                            borderRadius: "4px",
                          }}
                        >
                          {slot ? (
                            <div style={{
                              background: CONTENT_COLORS[slot.contentType] || "var(--bg-secondary)",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              fontSize: "11px",
                              fontWeight: 500,
                              opacity: slot.enabled ? 1 : 0.4,
                            }}>
                              {slot.contentType.replace("_", " ")}
                              {slot.campaign && (
                                <div style={{ fontSize: "9px", opacity: 0.8, marginTop: "2px" }}>
                                  {slot.campaign.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              color: "var(--text-muted)",
                              fontSize: "16px",
                              padding: "4px",
                              opacity: 0.3,
                            }}>+</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addTimeRow}
            style={{
              marginTop: "12px",
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px dashed var(--border)",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            + Add Time Row
          </button>
        </>
      )}

      {editSlot && (
        <SlotEditor
          day={editSlot.day}
          time={editSlot.time}
          existing={editSlot.existing}
          campaigns={campaigns}
          onSave={handleSave}
          onDelete={editSlot.existing ? () => handleDelete(editSlot.existing!.id) : undefined}
          onClose={() => setEditSlot(null)}
        />
      )}
    </div>
  );
}

function SlotEditor({
  day, time, existing, campaigns, onSave, onDelete, onClose,
}: {
  day: string;
  time: string;
  existing?: Schedule;
  campaigns: Campaign[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [contentType, setContentType] = useState(existing?.contentType || "REEL");
  const [campaignId, setCampaignId] = useState(existing?.campaignId || "");
  const [captionTemplate, setCaptionTemplate] = useState(existing?.captionTemplate || "");
  const [overlayPosition, setOverlayPosition] = useState(existing?.overlayPosition || "BOTTOM_RIGHT");
  const [overlaySize, setOverlaySize] = useState(existing?.overlaySize || "MEDIUM");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);

  const isStory = contentType === "STORY_VIDEO" || contentType === "STORY_PHOTO";

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "380px",
      background: "var(--bg-primary)", borderLeft: "1px solid var(--border)",
      padding: "24px", zIndex: 100, overflowY: "auto",
      boxShadow: "-4px 0 12px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 600 }}>
          {existing ? "Edit Slot" : "New Slot"} — {DAY_LABELS[DAYS.indexOf(day)]} {time}
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
      </div>

      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Content Type</span>
        <select value={contentType} onChange={e => setContentType(e.target.value)} style={{ width: "100%", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px" }}>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </label>

      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Campaign (optional)</span>
        <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{ width: "100%", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px" }}>
          <option value="">Organic (no campaign)</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {campaignId && (
        <>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Overlay Position</span>
            <select value={overlayPosition} onChange={e => setOverlayPosition(e.target.value)} style={{ width: "100%", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px" }}>
              {["TOP_LEFT","TOP_CENTER","TOP_RIGHT","MIDDLE_LEFT","CENTER","MIDDLE_RIGHT","BOTTOM_LEFT","BOTTOM_CENTER","BOTTOM_RIGHT"].map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Overlay Size</span>
            <select value={overlaySize} onChange={e => setOverlaySize(e.target.value)} style={{ width: "100%", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px" }}>
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
              <option value="LARGE">Large</option>
            </select>
          </label>
        </>
      )}

      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Caption Template</span>
        <textarea
          value={captionTemplate}
          onChange={e => setCaptionTemplate(e.target.value)}
          placeholder="Follow for daily content 🔥 {{required_hashtags}}"
          rows={3}
          style={{ width: "100%", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", resize: "vertical", fontSize: "13px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
          Tokens: {"{{required_hashtags}}"} {"{{page_name}}"} {"{{date}}"} {"{{day}}"} {"{{custom_1}}"}
        </div>
        {isStory && (
          <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
            Note: Captions are not supported for Stories posted via API.
          </div>
        )}
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>Enabled</span>
      </label>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => onSave({
            contentType,
            campaignId: campaignId || undefined,
            captionTemplate: captionTemplate || undefined,
            overlayPosition: campaignId ? overlayPosition : undefined,
            overlaySize: campaignId ? overlaySize : undefined,
            enabled,
          })}
          style={{
            flex: 1, background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
          }}
        >
          {existing ? "Update" : "Create"}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "6px", padding: "10px 16px", fontSize: "13px", cursor: "pointer",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
