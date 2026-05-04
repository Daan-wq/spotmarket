export type OAuthPlatform = "instagram" | "tiktok" | "facebook" | "youtube";

export interface OAuthDisclosure {
  platform: OAuthPlatform;
  brandName: string;
  /** What we will read. Bullet list shown to the user before OAuth. */
  willAccess: string[];
  /** What we will not do — explicit reassurance. */
  willNotDo: string[];
  /** Where the user can revoke access on the platform. */
  revokeUrl: string;
  /** Friendly link label for the revoke URL. */
  revokeLabel: string;
}

export const OAUTH_DISCLOSURES: Record<OAuthPlatform, OAuthDisclosure> = {
  instagram: {
    platform: "instagram",
    brandName: "Instagram",
    willAccess: [
      "Your username, profile photo, and follower count",
      "Public videos and Reels you post (views, likes, comments)",
      "Insights for clips you submit to campaigns",
    ],
    willNotDo: [
      "Post, comment, or send messages on your behalf",
      "Access private DMs",
    ],
    revokeUrl: "https://www.instagram.com/accounts/manage_access/",
    revokeLabel: "Instagram → Apps and Websites",
  },
  facebook: {
    platform: "facebook",
    brandName: "Facebook",
    willAccess: [
      "Pages you manage (name, follower count, photo)",
      "Public videos posted on those pages",
      "Insights for clips you submit to campaigns",
    ],
    willNotDo: [
      "Post or comment as you or any of your pages",
      "Access your personal timeline or friends list",
    ],
    revokeUrl: "https://www.facebook.com/settings?tab=business_tools",
    revokeLabel: "Facebook → Business Integrations",
  },
  tiktok: {
    platform: "tiktok",
    brandName: "TikTok",
    willAccess: [
      "Your display name, username, and avatar",
      "Public videos you post (views, likes, comments, shares)",
      "Insights for clips you submit to campaigns",
    ],
    willNotDo: [
      "Post videos or comments on your behalf",
      "Read direct messages",
    ],
    revokeUrl: "https://www.tiktok.com/setting/apps-and-services",
    revokeLabel: "TikTok → Apps and Services",
  },
  youtube: {
    platform: "youtube",
    brandName: "YouTube",
    willAccess: [
      "Your channel name, avatar, and subscriber count",
      "Public videos and Shorts on your channel",
      "Analytics for clips you submit to campaigns",
    ],
    willNotDo: [
      "Upload, edit, or delete videos",
      "Comment, subscribe, or like on your behalf",
    ],
    revokeUrl: "https://myaccount.google.com/permissions",
    revokeLabel: "Google Account → Third-party access",
  },
};
