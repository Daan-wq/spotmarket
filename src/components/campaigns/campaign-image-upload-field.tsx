"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CampaignAvatar } from "@/components/campaigns/campaign-display";
import { ImageIcon, Trash2, Upload } from "lucide-react";

interface CampaignImageUploadFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  campaignName?: string;
  disabled?: boolean;
}

const MAX_SIZE_MB = 5;

export function CampaignImageUploadField({
  value,
  onChange,
  label,
  campaignName = "Campaign",
  disabled = false,
}: CampaignImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_SIZE_MB}MB or smaller.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/campaign-assets", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.secureUrl) {
        throw new Error(body.error ?? "Upload failed");
      }
      onChange(body.secureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start gap-4">
        <CampaignAvatar name={campaignName} imageUrl={value} size="lg" />
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-semibold text-neutral-950">
            {label}
          </label>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Upload a square campaign image. It will appear on admin and creator campaign cards.
          </p>
          {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || uploading}
              isPending={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {value ? <ImageIcon className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {value ? "Replace image" : "Upload image"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={() => onChange(null)}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
