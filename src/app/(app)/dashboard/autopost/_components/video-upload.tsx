"use client";

import { useState, useRef } from "react";

interface VideoUploadProps {
  onUploadComplete: (objectKey: string, videoUrl: string) => void;
  onError: (message: string) => void;
}

type UploadState = "idle" | "uploading" | "validating" | "ready" | "error";

export function VideoUpload({ onUploadComplete, onError }: VideoUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!["video/mp4", "video/quicktime"].includes(file.type)) {
      setErrorMessage("Only MP4 and MOV files are supported");
      setState("error");
      onError("Only MP4 and MOV files are supported");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMessage("File must be smaller than 500MB");
      setState("error");
      onError("File must be smaller than 500MB");
      return;
    }

    setFileName(file.name);
    setState("uploading");
    setProgress(0);

    try {
      const uploadResponse = await fetch("/api/autopost/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl: presignedUrl, objectKey: key, token } = await uploadResponse.json();

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status < 400) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        if (token) {
          xhr.setRequestHeader("x-amz-server-side-encryption", token);
        }
        xhr.send(file);
      });

      setState("validating");

      const validateResponse = await fetch("/api/autopost/validate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey: key }),
      });

      if (!validateResponse.ok) {
        throw new Error("Video validation failed");
      }

      const { valid } = await validateResponse.json();
      if (!valid) {
        throw new Error("Invalid video format");
      }

      const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-videos/${key}`;
      setVideoUrl(videoUrl);
      setState("ready");
      onUploadComplete(key, videoUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(message);
      setState("error");
      onError(message);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRetry = () => {
    setState("idle");
    setProgress(0);
    setFileName("");
    setErrorMessage("");
    setVideoUrl("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    handleRetry();
  };

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--text-secondary)" }}>
        Video Upload
      </label>

      {state === "idle" && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="rounded-lg border-2 border-dashed p-12 text-center cursor-pointer"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
            minHeight: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Drop video or click to upload
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            MP4 or MOV, up to 500MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
        </div>
      )}

      {state === "uploading" && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {fileName}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {progress}% uploaded
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs font-medium px-2 py-1 rounded"
              style={{
                color: "var(--error)",
                background: "var(--error-bg)",
              }}
            >
              Cancel
            </button>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>
      )}

      {state === "validating" && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 border-2 border-transparent rounded-full animate-spin"
              style={{
                borderTopColor: "var(--accent)",
                borderRightColor: "var(--accent)",
              }}
            />
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              Validating video...
            </p>
          </div>
        </div>
      )}

      {state === "ready" && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--success)",
            background: "var(--success-bg)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--success-text)" }}>
                {fileName}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--success-text)" }}>
                Ready to compose and post
              </p>
            </div>
            {videoUrl && (
              <video
                src={videoUrl}
                className="w-16 h-20 object-cover rounded"
                style={{ aspectRatio: "9/16" }}
              />
            )}
          </div>
        </div>
      )}

      {state === "error" && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--error)",
            background: "var(--error-bg)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--error)" }}>
              {errorMessage}
            </p>
            <button
              onClick={handleRetry}
              className="text-xs font-medium px-3 py-1 rounded"
              style={{
                color: "#fff",
                background: "var(--error)",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
