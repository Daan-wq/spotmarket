import { BioVerifyCard } from "./bio-verify-card";

export function YoutubeConnectButton() {
  return (
    <BioVerifyCard
      brand={{ name: "YouTube", platform: "YOUTUBE_SHORTS" }}
      oauthHref="/api/auth/youtube"
      oauthAvailable={true}
      buttonLabel="Connect YouTube channel"
    />
  );
}
