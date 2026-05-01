import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountButton } from "./_components/delete-account-button";

export default async function SettingsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      email: true,
      creatorProfile: { select: { displayName: true } },
    },
  });

  return (
    <div className="p-6 w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage your account preferences
        </p>
      </div>

      {/* Account Info */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Display name</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.creatorProfile?.displayName ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Email</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.email ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Advanced</h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Danger zone — these actions are irreversible
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Delete account</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Permanently delete your account and all associated data
            </p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
