export type ClipMediaType = "video" | "image" | "carousel";

export function normalizeIgMediaType(
  mediaType: string | null | undefined,
  mediaProductType: string | null | undefined,
): ClipMediaType {
  const product = (mediaProductType ?? "").toUpperCase();
  const type = (mediaType ?? "").toUpperCase();
  if (product === "REELS" || product === "REEL") return "video";
  if (type === "CAROUSEL_ALBUM") return "carousel";
  if (type === "VIDEO") return "video";
  return "image";
}
