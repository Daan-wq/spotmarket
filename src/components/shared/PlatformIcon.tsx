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

export default function PlatformIcon({ platform, size = 24 }: PlatformIconProps) {
  if (platform === "BOTH") {
    return (
      <div className="flex items-center gap-1">
        <PlatformIcon platform="INSTAGRAM" size={size} />
        <PlatformIcon platform="TIKTOK" size={size} />
      </div>
    );
  }

  if (platform === "INSTAGRAM") return <InstagramIcon size={size} />;
  if (platform === "TIKTOK") return <TikTokIcon size={size} />;

  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ width: size, height: size, background: "#6366F1" }}
    >
      {platform.charAt(0)}
    </span>
  );
}
