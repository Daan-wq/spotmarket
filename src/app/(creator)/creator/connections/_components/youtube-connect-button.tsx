export function YoutubeConnectButton() {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "#FF0000" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon fill="#FF0000" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            YouTube
          </p>
        </div>
      </div>

      <a
        href="/api/auth/youtube"
        className="w-full px-3 py-2 rounded-md text-xs font-semibold text-center transition-all"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        Connect YouTube channel
      </a>
    </div>
  );
}
