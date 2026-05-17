import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { LanguageSettings } from "./_components/language-settings";
import { ProfileEditForm } from "./_components/profile-edit-form";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../_components/creator-journey";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creatorSettings.metadata");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creatorSettings");

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
          createdAt: true,
          igConnections: {
            where: { isVerified: true },
            select: { id: true },
            take: 1,
          },
          ttConnections: {
            where: { isVerified: true },
            select: { id: true },
            take: 1,
          },
          ytConnections: {
            where: { isVerified: true },
            select: { id: true },
            take: 1,
          },
          fbConnections: {
            where: { isVerified: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const profile = user?.creatorProfile;
  const displayName = profile?.displayName || t("fallbackCreator");
  const joinedAt = profile?.createdAt ?? user?.createdAt;
  const verifiedPlatforms = getVerifiedPlatformLabels({
    instagram: Boolean(profile?.igConnections.length),
    tiktok: Boolean(profile?.ttConnections.length),
    youtube: Boolean(profile?.ytConnections.length),
    facebook: Boolean(profile?.fbConnections.length),
  });
  const accountStatus =
    verifiedPlatforms.length === 0
      ? {
          value: t("stats.accounts.noneValue"),
          detail: t("stats.accounts.noneDetail"),
        }
      : {
          value: t("stats.accounts.connectedValue", {
            count: verifiedPlatforms.length,
          }),
          detail: t("stats.accounts.connectedDetail", {
            platforms: new Intl.ListFormat(locale, {
              style: "long",
              type: "conjunction",
            }).format(verifiedPlatforms),
          }),
        };
  const joinedLabel = joinedAt
    ? new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(joinedAt)
    : "-";
  const authProvider = user?.discordId ? "Discord" : t("stats.login.connectedAccount");

  return (
    <div className="w-full space-y-6 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <ProfileSummaryCard
          name={displayName}
          email={user?.email ?? "-"}
          imageUrl={profile?.avatarUrl ?? null}
        />
        <SoftStat
          label={t("stats.accounts.label")}
          value={accountStatus.value}
          detail={accountStatus.detail}
        />
        <SoftStat label={t("stats.joined.label")} value={joinedLabel} detail="ClipProfit" />
        <SoftStat
          label={t("stats.login.label")}
          value={authProvider}
          detail={user?.discordUsername ?? t("stats.login.connected")}
        />
      </section>

      <LanguageSettings
        currentLocale={locale}
        title={t("language.title")}
        description={t("language.description")}
        ariaLabel={t("language.ariaLabel")}
        savedLabel={t("language.saved")}
        errorLabel={t("language.error")}
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <CreatorSectionHeader title={t("profile.title")} />
        <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase text-neutral-500 md:tracking-[0.14em]">
            {t("profile.about")}
          </p>
          <p className="mt-3 text-sm italic leading-6 text-neutral-600">
            {profile?.bio || t("profile.emptyBio")}
          </p>
        </div>
        <ProfileEditForm
          initialDisplayName={profile?.displayName ?? ""}
          initialBio={profile?.bio ?? ""}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="px-4 py-4 md:px-5">
          <CreatorSectionHeader title={t("account.title")} />
        </div>
        <div className="text-sm">
          <Row label={t("account.email")} value={user?.email ?? "-"} />
          <Row label={t("account.joined")} value={joinedLabel} />
          <Row label={t("account.loginMethod")} value={authProvider} />
          <Row label={t("account.userId")} value={user?.supabaseId ?? "-"} />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{t("danger.title")}</h2>
        <p className="mb-4 mt-1 text-xs text-neutral-500">
          {t("danger.description")}
        </p>

        <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-950">{t("danger.deleteTitle")}</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t("danger.deleteDescription")}
            </p>
          </div>
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}

function getVerifiedPlatformLabels(state: {
  instagram: boolean;
  tiktok: boolean;
  youtube: boolean;
  facebook: boolean;
}) {
  return [
    state.instagram ? "Instagram" : null,
    state.tiktok ? "TikTok" : null,
    state.youtube ? "YouTube" : null,
    state.facebook ? "Facebook" : null,
  ].filter((label): label is string => Boolean(label));
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
