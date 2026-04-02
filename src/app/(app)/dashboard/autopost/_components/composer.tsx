"use client";

import { useState } from "react";
import { CampaignBrief } from "./campaign-brief";
import { VideoUpload } from "./video-upload";
import { OverlayPicker } from "./overlay-picker";
import { CanvasPreview } from "./canvas-preview";
import { CaptionEditor } from "./caption-editor";
import { SchedulePicker } from "./schedule-picker";
import { PostStatusCard } from "@/components/dashboard/autopost/_components/post-status-card";

const POSITION_MAP: Record<string, string> = {
  "top-left": "TOP_LEFT",
  "top-center": "TOP_CENTER",
  "top-right": "TOP_RIGHT",
  "middle-left": "MIDDLE_LEFT",
  "middle-center": "CENTER",
  "middle-right": "MIDDLE_RIGHT",
  "bottom-left": "BOTTOM_LEFT",
  "bottom-center": "BOTTOM_CENTER",
  "bottom-right": "BOTTOM_RIGHT",
};

const SIZE_MAP: Record<string, string> = {
  "small": "SMALL",
  "medium": "MEDIUM",
  "large": "LARGE",
};

interface ComposerProps {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    bannerUrl: string | null;
    bannerVideoUrl: string | null;
    contentGuidelines: string | null;
    requirements: string | null;
    contentAssetUrls: string[];
    deadline: string;
    creatorCpv: string;
    contentType: string | null;
  };
  igAccounts: { id: string; platformUsername: string; platformUserId: string; followerCount: number }[];
  userId: string;
}

export function Composer({ campaign, igAccounts }: ComposerProps) {
  const [videoObjectKey, setVideoObjectKey] = useState<string>("");
  const [position, setPosition] = useState("bottom-right");
  const [size, setSize] = useState("medium");
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState("REEL");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [selectedIgAccountId, setSelectedIgAccountId] = useState(igAccounts[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedPostId, setSubmittedPostId] = useState<string | null>(null);

  const requiredHashtags = (campaign.contentGuidelines ?? "").match(/#\w+/g) ?? [];
  const overlayUrl = campaign.contentAssetUrls[0] || null;

  const isReadyToSubmit = !!videoObjectKey && caption.trim().length > 0 && !submittedPostId;

  const handleSubmit = async () => {
    if (!isReadyToSubmit) return;
    if (!selectedIgAccountId) {
      setSubmitError("Please select an Instagram account");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/autopost/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          rawVideoKey: videoObjectKey,
          overlayPosition: POSITION_MAP[position] || "BOTTOM_RIGHT",
          overlaySize: SIZE_MAP[size] || "MEDIUM",
          caption,
          postType,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          igAccountId: selectedIgAccountId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Submit failed");
      }

      const result = await response.json();
      setSubmittedPostId(result.scheduledPostId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="p-6 max-w-2xl"
      style={{ background: "var(--bg-primary)" }}
    >
      <CampaignBrief campaign={campaign} />

      <VideoUpload
        onUploadComplete={(key) => {
          setVideoObjectKey(key);
        }}
        onError={(msg) => setSubmitError(msg)}
      />

      <OverlayPicker
        position={position}
        size={size}
        onPositionChange={setPosition}
        onSizeChange={setSize}
      />

      <CanvasPreview
        videoObjectKey={videoObjectKey}
        overlayUrl={overlayUrl}
        position={position}
        size={size}
      />

      <CaptionEditor
        caption={caption}
        onChange={setCaption}
        requiredHashtags={requiredHashtags}
      />

      <div className="mb-6">
        <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>
          Post Type
        </label>
        <div className="flex gap-2">
          {["FEED", "REEL", "STORY"].map((type) => (
            <button
              key={type}
              onClick={() => setPostType(type)}
              className="flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors"
              style={{
                borderColor: postType === type ? "var(--accent)" : "var(--border)",
                background: postType === type ? "var(--accent)" : "var(--bg-elevated)",
                color: postType === type ? "#fff" : "var(--text-primary)",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {igAccounts.length > 1 && (
        <div className="mb-6">
          <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>
            Instagram Account
          </label>
          <select
            value={selectedIgAccountId}
            onChange={(e) => setSelectedIgAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            {igAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                @{acc.platformUsername} ({acc.followerCount.toLocaleString()} followers)
              </option>
            ))}
          </select>
        </div>
      )}

      <SchedulePicker scheduledAt={scheduledAt} onChange={setScheduledAt} />

      {submitError && (
        <div
          className="mb-6 p-3 rounded-lg border text-sm"
          style={{
            borderColor: "var(--error)",
            background: "var(--error-bg)",
            color: "var(--error)",
          }}
        >
          {submitError}
        </div>
      )}

      {submittedPostId && (
        <div className="mb-6">
          <PostStatusCard
            scheduledPostId={submittedPostId}
            campaignName={campaign.name}
            onDismiss={() => {
              setSubmittedPostId(null);
              setVideoObjectKey("");
            }}
          />
        </div>
      )}

      {!submittedPostId && (
        <button
          onClick={handleSubmit}
          disabled={!isReadyToSubmit || isSubmitting}
          className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{
            background: isReadyToSubmit && !isSubmitting ? "var(--accent)" : "var(--border)",
            opacity: isReadyToSubmit && !isSubmitting ? 1 : 0.5,
            cursor: isReadyToSubmit && !isSubmitting ? "pointer" : "not-allowed",
          }}
        >
          {isSubmitting ? "Compositing..." : scheduledAt ? "Composite & Schedule" : "Composite & Post"}
        </button>
      )}
    </div>
  );
}
