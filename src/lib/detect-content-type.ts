"use client";

export type ContentTypeName =
  | "REEL"
  | "FEED_VIDEO"
  | "FEED_PHOTO"
  | "STORY_VIDEO"
  | "STORY_PHOTO"
  | "CAROUSEL";

/**
 * Detect the most appropriate content type for a file.
 * Uses MIME type + aspect ratio (via in-memory media element).
 * fileCount: total number of files in the same selection — used to suggest CAROUSEL.
 */
export async function detectContentType(
  file: File,
  fileCount: number = 1,
): Promise<ContentTypeName> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  // Multiple images in one selection → CAROUSEL
  if (fileCount > 1 && isImage) return "CAROUSEL";

  if (isVideo) {
    const ratio = await getVideoAspectRatio(file);
    if (ratio !== null && ratio >= 1) return "FEED_VIDEO"; // landscape
    return "REEL"; // portrait or unknown
  }

  if (isImage) {
    const ratio = await getImageAspectRatio(file);
    if (ratio !== null && ratio < 0.7) return "STORY_PHOTO"; // very tall (story)
    return "FEED_PHOTO";
  }

  return "REEL";
}

function getVideoAspectRatio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const ratio = video.videoWidth / video.videoHeight;
      URL.revokeObjectURL(url);
      resolve(ratio);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

function getImageAspectRatio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve(ratio);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
