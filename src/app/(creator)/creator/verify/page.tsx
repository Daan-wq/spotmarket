import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VerifyForm } from "./_components/verify-form";

export default async function VerifyPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  // Check if user already has a connected IG account via OAuth
  const igConnection = await prisma.creatorIgConnection.findFirst({
    where: { creatorProfileId: profile.id, isVerified: true, accessToken: { not: null } },
    select: { igUsername: true },
  });

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Add Instagram Page
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Connect your Instagram account to unlock analytics and campaign features
      </p>

      {/* OAuth Connect — preferred method */}
      <div
        className="rounded-lg p-6 border mb-6"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Connect with Instagram
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Sign in with your Instagram account to instantly verify and enable insights.
        </p>
        {igConnection ? (
          <div
            className="p-3 rounded-lg text-sm"
            style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
          >
            Connected as @{igConnection.igUsername}
          </div>
        ) : (
          <a
            href="/api/auth/instagram?return_to=/creator/pages"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Connect Instagram Account
          </a>
        )}
      </div>

      {/* Bio verification — fallback method */}
      <details className="group">
        <summary
          className="cursor-pointer text-sm font-medium mb-4 list-none"
          style={{ color: "var(--text-secondary)" }}
        >
          Or verify manually via bio code &darr;
        </summary>
        <VerifyForm creatorProfileId={profile.id} />
      </details>
    </div>
  );
}
