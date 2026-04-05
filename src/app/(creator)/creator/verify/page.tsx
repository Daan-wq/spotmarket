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

  const igConnection = await prisma.creatorIgConnection.findUnique({
    where: { creatorProfileId: profile.id },
  });

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Verify Your Instagram
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Verify your Instagram account to unlock campaign opportunities
      </p>

      {igConnection?.isVerified ? (
        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--success-bg)",
            borderColor: "var(--success)",
          }}
        >
          <p
            style={{ color: "var(--success-text)" }}
            className="text-lg font-semibold"
          >
            ✓ Instagram Verified
          </p>
          <p style={{ color: "var(--success-text)" }} className="text-sm mt-2">
            Your account @{igConnection.igUsername} is verified
          </p>
        </div>
      ) : (
        <VerifyForm creatorProfileId={profile.id} />
      )}
    </div>
  );
}
