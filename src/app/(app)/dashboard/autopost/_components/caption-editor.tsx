"use client";

import { useMemo } from "react";

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  requiredHashtags: string[];
}

export function CaptionEditor({
  caption,
  onChange,
  requiredHashtags,
}: CaptionEditorProps) {
  const missingHashtags = useMemo(() => {
    const captionLower = caption.toLowerCase();
    return requiredHashtags.filter((tag) => {
      const normalized = tag.toLowerCase().startsWith("#") ? tag.toLowerCase() : `#${tag}`.toLowerCase();
      return !captionLower.includes(normalized);
    });
  }, [caption, requiredHashtags]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>
        Caption
      </label>
      <div className="relative">
        <textarea
          value={caption}
          onChange={handleChange}
          placeholder="Write your caption here..."
          className="w-full px-3 py-2 rounded-lg border text-sm resize-vertical"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            minHeight: "80px",
          }}
        />
        <div
          className="text-xs mt-2 text-right"
          style={{ color: "var(--text-muted)" }}
        >
          {caption.length} characters
        </div>
      </div>

      {missingHashtags.length > 0 && (
        <div
          className="mt-2 p-2 rounded-md border text-xs"
          style={{
            borderColor: "#fde68a",
            background: "var(--warning-bg)",
            color: "var(--warning-text)",
          }}
        >
          Required hashtags removed:{" "}
          {missingHashtags.map((tag) => (
            <span key={tag} className="font-semibold ml-1">
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}{" "}
          — they will be re-appended on post.
        </div>
      )}
    </div>
  );
}
