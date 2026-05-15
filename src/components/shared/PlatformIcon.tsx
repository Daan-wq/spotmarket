interface PlatformIconProps {
  platform: string;
  size?: number;
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}

function TikTokIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path d="M16.5 6.5c-.7-.5-1.2-1.3-1.3-2.2h-2.4v10.4c0 1.3-1.1 2.3-2.4 2.3s-2.4-1-2.4-2.3 1.1-2.3 2.4-2.3c.3 0 .5 0 .7.1V10c-.2 0-.5-.1-.7-.1-2.6 0-4.8 2.1-4.8 4.8s2.1 4.8 4.8 4.8 4.8-2.1 4.8-4.8V9.8c.9.7 2 1 3.2 1V8.4c-1.2 0-2.2-.7-2.9-1.9z" fill="white" />
    </svg>
  );
}

function YouTubeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path d="M16.7 5h2.2l-4.8 5.5L19.7 19h-4.4l-3.5-4.5L7.7 19H5.5l5.1-5.9L5 5h4.5l3.1 4.1L16.7 5zm-.8 12.6h1.2L8.2 6.3H6.9l9 11.3z" fill="white" />
    </svg>
  );
}

export default function PlatformIcon({ platform, size = 24 }: PlatformIconProps) {
  if (platform === "INSTAGRAM") return <InstagramIcon size={size} />;
  if (platform === "TIKTOK") return <TikTokIcon size={size} />;
  if (platform === "YOUTUBE_SHORTS") return <YouTubeIcon size={size} />;
  if (platform === "FACEBOOK") return <FacebookIcon size={size} />;
  if (platform === "X") return <XIcon size={size} />;

  return null;
}
