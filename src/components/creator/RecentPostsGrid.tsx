import type { IgMediaItem } from "@/types/instagram";

export function RecentPostsGrid({ mediaCache }: { mediaCache: IgMediaItem[] | null }) {
  if (!mediaCache || mediaCache.length === 0) {
    return (
      <div className="rounded-xl px-5 py-6 text-center" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-secondary)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recent posts — click Refresh to fetch</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Posts</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {mediaCache.slice(0, 12).map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square rounded-lg overflow-hidden group block"
            style={{ backgroundColor: "var(--muted)" }}
          >
            {(post.thumbnail_url ?? post.media_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(post.thumbnail_url ?? post.media_url)!}
                alt={post.caption?.slice(0, 40) ?? "Post"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                {post.media_type}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs">♥ {post.like_count.toLocaleString()}</span>
              <span className="text-white text-xs">💬 {post.comments_count.toLocaleString()}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
