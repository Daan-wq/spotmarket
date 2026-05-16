import type { CSSProperties, ImgHTMLAttributes } from "react";
import type { StaticImageData } from "next/image";

import facebookLogo from "./svg/Facebook.svg";
import instagramLogo from "./svg/Instagram.svg";
import tiktokLogo from "./svg/Tiktok.svg";
import xLogo from "./svg/X.svg";
import youtubeShortsLogo from "./svg/YoutubeShorts.svg";

export type PlatformIconKey = "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS" | "FACEBOOK" | "X";

type SvgAsset = StaticImageData | string;

export const PLATFORM_ICON_LABELS: Record<PlatformIconKey, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YouTube Shorts",
  FACEBOOK: "Facebook",
  X: "X",
};

const PLATFORM_LOGOS: Record<PlatformIconKey, SvgAsset> = {
  INSTAGRAM: instagramLogo,
  TIKTOK: tiktokLogo,
  YOUTUBE_SHORTS: youtubeShortsLogo,
  FACEBOOK: facebookLogo,
  X: xLogo,
};

const PLATFORM_ALIASES: Record<string, PlatformIconKey> = {
  IG: "INSTAGRAM",
  INSTAGRAM: "INSTAGRAM",
  TT: "TIKTOK",
  TIKTOK: "TIKTOK",
  YT: "YOUTUBE_SHORTS",
  YOUTUBE: "YOUTUBE_SHORTS",
  YOUTUBE_SHORTS: "YOUTUBE_SHORTS",
  YOUTUBESHORTS: "YOUTUBE_SHORTS",
  FB: "FACEBOOK",
  FACEBOOK: "FACEBOOK",
  X: "X",
  TWITTER: "X",
};

export function normalizePlatformIconKey(platform: string | null | undefined): PlatformIconKey | null {
  if (!platform) return null;

  const normalized = platform.trim().replace(/[\s-]+/g, "_").toUpperCase();
  return PLATFORM_ALIASES[normalized] ?? null;
}

export function getPlatformLogoSrc(platform: PlatformIconKey): string {
  const logo = PLATFORM_LOGOS[platform];
  return typeof logo === "string" ? logo : logo.src;
}

export interface PlatformLogoProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> {
  platform: string | null | undefined;
  size?: number;
  alt?: string;
  decorative?: boolean;
}

export function PlatformLogo({
  platform,
  size = 24,
  alt,
  decorative = false,
  style,
  title,
  ...props
}: PlatformLogoProps) {
  const key = normalizePlatformIconKey(platform);
  if (!key) return null;

  const label = PLATFORM_ICON_LABELS[key];
  const imageStyle: CSSProperties = {
    width: size,
    height: size,
    objectFit: "contain",
    ...style,
  };

  return (
    <img
      {...props}
      src={getPlatformLogoSrc(key)}
      width={size}
      height={size}
      alt={decorative ? "" : alt ?? title ?? label}
      title={title}
      style={imageStyle}
    />
  );
}
