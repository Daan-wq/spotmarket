import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { ProfileEditForm } from "./_components/profile-edit-form";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      email: true,
      creatorProfile: {
        select: {
          displayName: true,
          bio: true,
          tronsAddress: true,
        },
      },
    },
  });

  return (
    <div className="p-6 w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Edit your profile, payment method, and account preferences.
        </p>
      </div>

      {/* Profile (editable) */}
      <section
        className="rounded-xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Profile
        </h2>
        <ProfileEditForm
          initialDisplayName={user?.creatorProfile?.displayName ?? ""}
          initialBio={user?.creatorProfile?.bio ?? ""}
          initialTronsAddress={user?.creatorProfile?.tronsAddress ?? ""}
        />
      </section>

      {/* Account info (read-only) */}
      <section
        className="rounded-xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Account
        </h2>
        <div className="space-y-3 text-sm">
          <Row label="Email" value={user?.email ?? "—"} />
        </div>
      </section>

      {/* Danger zone */}
      <section
        className="rounded-xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Danger zone
        </h2>
        <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
          These actions are irreversible.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Delete account
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Permanently delete your account and all associated data.
            </p>
          </div>
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
