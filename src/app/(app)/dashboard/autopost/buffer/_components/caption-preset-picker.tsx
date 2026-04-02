"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface Preset {
  id: string;
  title: string;
  body: string;
  language: string | null;
  category: string | null;
  isSystem: boolean;
}

interface CaptionPresetPickerProps {
  onSelect: (body: string) => void;
  onClose: () => void;
}

const LANG_COLORS: Record<string, string> = {
  en: "#3b82f6",
  zh: "#ef4444",
  ko: "#22c55e",
  ja: "#f59e0b",
};

const LANG_LABELS: Record<string, string> = {
  en: "EN",
  zh: "ZH",
  ko: "KO",
  ja: "JA",
};

export function CaptionPresetPicker({
  onSelect,
  onClose,
}: CaptionPresetPickerProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<"all" | string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/caption-presets");
        const data = await response.json();
        setPresets(data.presets || []);
      } catch (error) {
        console.error("Failed to fetch presets:", error);
        setPresets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPresets();
  }, []);

  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const matchesLang =
        langFilter === "all" || preset.language === langFilter;
      const matchesSearch =
        searchQuery === "" ||
        preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.body.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesLang && matchesSearch;
    });
  }, [presets, langFilter, searchQuery]);

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      onSelect(preset.body);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: "var(--bg-primary, #ffffff)",
          borderRadius: "8px",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid var(--border, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--bg-card, #f9fafb)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-primary, #111827)",
              margin: 0,
            }}
          >
            Caption Presets
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "var(--text-secondary, #6b7280)",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-primary, #111827)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-secondary, #6b7280)";
            }}
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #e5e7eb)",
            backgroundColor: "var(--bg-primary, #ffffff)",
          }}
        >
          {/* Language Filter */}
          <div style={{ marginBottom: "12px" }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: "0 0 8px 0",
              }}
            >
              Language
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["all", "en", "zh", "ko", "ja"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border:
                      langFilter === lang
                        ? "1px solid var(--accent, #3b82f6)"
                        : "1px solid var(--border, #e5e7eb)",
                    backgroundColor:
                      langFilter === lang
                        ? "var(--accent, #3b82f6)"
                        : "var(--bg-card, #f9fafb)",
                    color:
                      langFilter === lang
                        ? "#ffffff"
                        : "var(--text-primary, #111827)",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {lang === "all" ? "All" : LANG_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: "0 0 8px 0",
              }}
            >
              Search
            </p>
            <input
              type="text"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border, #e5e7eb)",
                backgroundColor: "var(--bg-primary, #ffffff)",
                fontSize: "13px",
                color: "var(--text-primary, #111827)",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  "var(--accent, #3b82f6)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  "var(--border, #e5e7eb)";
              }}
            />
          </div>
        </div>

        {/* Presets List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "var(--text-secondary, #6b7280)",
              }}
            >
              Loading presets...
            </div>
          ) : filteredPresets.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "var(--text-muted, #9ca3af)",
                fontSize: "14px",
              }}
            >
              No presets found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #e5e7eb)",
                    backgroundColor: "var(--bg-card, #f9fafb)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "var(--bg-primary, #ffffff)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--accent, #3b82f6)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "var(--bg-card, #f9fafb)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border, #e5e7eb)";
                  }}
                >
                  {/* Title + Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      justifyContent: "space-between",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text-primary, #111827)",
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {preset.title}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      {preset.language && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "20px",
                            height: "20px",
                            borderRadius: "3px",
                            backgroundColor:
                              LANG_COLORS[preset.language] || "#d1d5db",
                            color: "#ffffff",
                            fontSize: "10px",
                            fontWeight: "700",
                          }}
                        >
                          {LANG_LABELS[preset.language] || preset.language}
                        </span>
                      )}
                      {preset.isSystem && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            backgroundColor: "var(--accent, #3b82f6)",
                            color: "#ffffff",
                            fontSize: "10px",
                            fontWeight: "600",
                          }}
                        >
                          System
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Preview */}
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary, #6b7280)",
                      margin: 0,
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {preset.body.substring(0, 100)}
                    {preset.body.length > 100 ? "..." : ""}
                  </p>

                  {/* Category */}
                  {preset.category && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted, #9ca3af)",
                        margin: 0,
                      }}
                    >
                      {preset.category}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
