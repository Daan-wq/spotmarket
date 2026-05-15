import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { ProfileEditForm } from "./_components/profile-edit-form";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../_components/creator-journey";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      supabaseId: true,
      email: true,
      discordId: true,
      discordUsername: true,
      createdAt: true,
      creatorProfile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          tronsAddress: true,
          isVerified: true,
          createdAt: true,
        },
      },
    },
  });

  const profile = user?.creatorProfile;
  const displayName = profile?.displayName || "Creator";
  const joinedAt = profile?.createdAt ?? user?.createdAt;
  const joinedLabel = joinedAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(joinedAt)
    : "-";
  const authProvider = user?.discordId ? "Discord OAuth" : "OAuth";

  return (
    <div className="w-full space-y-6 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your profile and account preferences"
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <ProfileSummaryCard
          name={displayName}
          email={user?.email ?? "-"}
          imageUrl={profile?.avatarUrl ?? null}
        />
        <SoftStat
          label="Status"
          value={profile?.isVerified ? "Verified" : "Active"}
          detail={profile?.isVerified ? "Profile verified" : "Ready to clip"}
        />
        <SoftStat label="Joined" value={joinedLabel} detail="ClipProfit" />
        <SoftStat
          label="Auth"
          value={authProvider}
          detail={user?.discordUsername ?? "Connected"}
        />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <CreatorSectionHeader title="Profile" />
        <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase text-neutral-500 md:tracking-[0.14em]">
            About
          </p>
          <p className="mt-3 text-sm italic leading-6 text-neutral-600">
            {profile?.bio || "No bio yet. Add one to tell others about yourself."}
          </p>
        </div>
        <ProfileEditForm
          initialDisplayName={profile?.displayName ?? ""}
          initialBio={profile?.bio ?? ""}
          initialTronsAddress={profile?.tronsAddress ?? ""}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="px-4 py-4 md:px-5">
          <CreatorSectionHeader title="Account info" />
        </div>
        <div className="text-sm">
          <Row label="Email" value={user?.email ?? "-"} />
          <Row label="Joined" value={joinedLabel} />
          <Row label="Auth provider" value={authProvider} />
          <Row label="User ID" value={user?.supabaseId ?? "-"} />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold text-neutral-950">Danger zone</h2>
        <p className="mb-4 mt-1 text-xs text-neutral-500">
          These actions are irreversible.
        </p>

        <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-950">Delete account</p>
            <p className="mt-0.5 text-xs text-neutral-500">
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
    <div className="flex items-center justify-between gap-4 border-t border-neutral-100 px-4 py-3 md:px-5">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-neutral-950" title={value}>
        {value}
      </span>
    </div>
  );
}

function ProfileSummaryCard({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email: string;
  imageUrl: string | null;
}) {
  const initial = (name.trim().charAt(0) || "C").toUpperCase();

  return (
    <div className="col-span-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:col-span-1 md:p-5">
      <div className="flex items-center gap-3 md:flex-col md:items-start">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-base font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-950">{name}</p>
          <p className="truncate text-xs text-neutral-500">{email}</p>
        </div>
      </div>
    </div>
  );
}
