import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VerifyForm, type VerifyPlatform } from "./_components/verify-form";

const PLATFORMS: ReadonlyArray<VerifyPlatform> = ["instagram", "tiktok", "facebook"];

const COPY: Record<VerifyPlatform, { title: string; subtitle: string; oauthHref: string; oauthLabel: string; oauthAvailable: boolean }> = {
  instagram: {
    title: "Verify Instagram",
    subtitle: "Add a one-time code to your Instagram bio so we know the account is yours.",
    oauthHref: "/api/auth/instagram?return_to=/creator/pages",
    oauthLabel: "Connect Instagram Account",
    oauthAvailable: true,
  },
  tiktok: {
    title: "Verify TikTok",
    subtitle: "Add a one-time code to your TikTok bio so we know the account is yours.",
    oauthHref: "/api/auth/tiktok?return_to=/creator/pages",
    oauthLabel: "Connect TikTok Account",
    oauthAvailable: false,
  },
  facebook: {
    title: "Verify Facebook Page",
    subtitle: "Add a one-time code to your Facebook Page bio so we know the page is yours.",
    oauthHref: "/api/auth/facebook?return_to=/creator/pages",
    oauthLabel: "Connect Facebook Page",
    oauthAvailable: false,
  },
};

interface PageProps {
  searchParams: Promise<{ platform?: string }>;
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const { userId } = await requireAuth("creator");
  const sp = await searchParams;
  const platform: VerifyPlatform = PLATFORMS.includes(sp.platform as VerifyPlatform)
    ? (sp.platform as VerifyPlatform)
    : "instagram";

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const copy = COPY[platform];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {copy.title}
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        {copy.subtitle}
      </p>

      {copy.oauthAvailable && (
        <a
          href={copy.oauthHref}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold mb-6 transition-all"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          {copy.oauthLabel}
        </a>
      )}

      <VerifyForm platform={platform} creatorProfileId={profile.id} />

      {/* Platform switcher */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PLATFORMS.filter((p) => p !== platform).map((p) => (
          <a
            key={p}
            href={`/creator/verify?platform=${p}`}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Verify {COPY[p].title.replace("Verify ", "")} instead &rarr;
          </a>
        ))}
      </div>
    </div>
  );
}
