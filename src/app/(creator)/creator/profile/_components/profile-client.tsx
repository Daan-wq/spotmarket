"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  BarChart3,
  CalendarDays,
  Globe2,
  LogOut,
  Mail,
  Target,
  User,
  Wallet,
} from "lucide-react";
import { ActivityHeatmap, type ActivityDay } from "./activity-heatmap";
import { ProfileEditForm } from "../../settings/_components/profile-edit-form";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface ProfileData {
  displayName: string;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  primaryGeo: string;
  experienceLevel: string | null;
  memberSince: string;
}

interface BalanceData {
  available: number;
  pending: number;
  withdrawalHistory: {
    id: string;
    date: string;
    grossAmount: number;
    status: string;
    method: string;
  }[];
}

interface ProfileClientProps {
  initialTab: string;
  profileData: ProfileData;
  balanceData: BalanceData;
  activityDays: ActivityDay[];
}

type TabKey = "general" | "activity" | "balance" | "community";

const TABS: Array<{
  key: TabKey;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "general", icon: User },
  { key: "activity", icon: BarChart3 },
  { key: "balance", icon: Wallet },
  { key: "community", icon: Globe2 },
];

export function ProfileClient({
  initialTab,
  profileData,
  balanceData,
  activityDays,
}: ProfileClientProps) {
  const t = useTranslations("creator.profile");
  const sharedT = useTranslations("creator.shared");
  const safeInitialTab = TABS.some((tab) => tab.key === initialTab)
    ? (initialTab as TabKey)
    : "general";
  const [activeTab, setActiveTab] = useState<TabKey>(safeInitialTab);
  const router = useRouter();
  const initial = profileData.displayName.charAt(0).toUpperCase() || "C";

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    router.replace(`/creator/profile?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="w-full space-y-5 md:px-6 md:py-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {profileData.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileData.avatarUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-lg font-semibold text-white">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-neutral-400 md:tracking-[0.14em]">
                {t("header.eyebrow")}
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-neutral-950">
                {profileData.displayName}
              </h1>
              {profileData.username ? (
                <p className="truncate text-sm font-semibold text-neutral-700">
                  @{profileData.username}
                </p>
              ) : null}
              <p className="truncate text-sm text-neutral-500">{profileData.email}</p>
            </div>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 md:w-auto"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {sharedT("actions.signOut")}
            </button>
          </form>
        </div>
      </section>

      <nav
        aria-label={t("header.eyebrow")}
        className="flex gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t(`tabs.${tab.key}`)}
            </button>
          );
        })}
      </nav>

      {activeTab === "general" ? <GeneralTab data={profileData} /> : null}
      {activeTab === "activity" ? <ActivityHeatmap days={activityDays} /> : null}
      {activeTab === "balance" ? <BalanceTab data={balanceData} /> : null}
      {activeTab === "community" ? <CommunityTab /> : null}
    </div>
  );
}

function GeneralTab({ data }: { data: ProfileData }) {
  const locale = useLocale();
  const t = useTranslations("creator.profile.general");
  const memberDate = formatDate(data.memberSince, locale, {
    month: "long",
    year: "numeric",
  });

  const info = [
    { label: t("fullName"), value: data.displayName, icon: User },
    {
      label: t("username"),
      value: data.username ? `@${data.username}` : t("notSet"),
      icon: AtSign,
    },
    { label: t("email"), value: data.email, icon: Mail, note: t("emailNote") },
    { label: t("country"), value: data.primaryGeo, icon: Globe2 },
    { label: t("memberSince"), value: memberDate, icon: CalendarDays },
    {
      label: t("industry"),
      value: data.experienceLevel || t("notSet"),
      icon: BarChart3,
    },
    { label: t("objective"), value: data.bio || t("noBio"), icon: Target },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-neutral-500" aria-hidden />
          <h2 className="text-base font-semibold text-neutral-950">
            {t("title")}
          </h2>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {info.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-neutral-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </div>
                <p className="mt-2 break-words text-sm font-semibold leading-5 text-neutral-950">
                  {item.value}
                </p>
                {item.note ? (
                  <p className="mt-1 text-xs text-red-500">{item.note}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="mt-6 border-t border-neutral-100 pt-5">
          <ProfileEditForm
            initialDisplayName={data.displayName}
            initialUsername={data.username ?? ""}
            initialBio={data.bio ?? ""}
          />
        </div>
      </div>
    </section>
  );
}

function BalanceTab({ data }: { data: BalanceData }) {
  const locale = useLocale();
  const t = useTranslations("creator.profile.balance");
  const sharedT = useTranslations("creator.shared");
  const statusT = useTranslations("creator.shared.statuses.payout");
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <BalanceCard
          label={t("available")}
          value={formatCurrency(data.available, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          detail={t("readyToWithdraw")}
          tone="success"
        />
        <BalanceCard
          label={t("pending")}
          value={formatCurrency(data.pending, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          detail={t("businessDays")}
        />
      </div>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition hover:bg-neutral-800"
      >
        <Wallet className="h-4 w-4" aria-hidden />
        {sharedT("actions.withdrawFunds")}
      </button>
      <p className="text-center text-xs text-neutral-500">
        {t("minWithdrawal", {
          amount: formatCurrency(data.available, locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
        })}
      </p>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-neutral-500" aria-hidden />
          <h2 className="text-base font-semibold text-neutral-950">
            {t("history")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {t("historyDescription")}
        </p>

        {data.withdrawalHistory.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-neutral-950">
              {t("noWithdrawalsTitle")}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {t("noWithdrawalsDescription")}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {data.withdrawalHistory.map((withdrawal) => (
              <article
                key={withdrawal.id}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-neutral-500">
                      {formatShortDate(withdrawal.date, locale)}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-neutral-950">
                      {formatCurrency(withdrawal.grossAmount, locale)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-neutral-700 ring-1 ring-neutral-200">
                    {statusT(withdrawal.status.toLowerCase())}
                  </span>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  {t("method", { method: withdrawal.method })}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BalanceCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "success";
}) {
  const t = useTranslations("creator.profile.balance");
  return (
    <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
        {tone === "success" ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {t("ready")}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-neutral-950 md:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </article>
  );
}

function CommunityTab() {
  const t = useTranslations("creator.profile.community");
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2] text-white">
          <Globe2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            {t("title")}
          </h2>
          <p className="text-sm text-neutral-500">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
        <iframe
          src="https://discord.com/widget?id=1486482870272000102&theme=dark"
          width="100%"
          height="420"
          allowTransparency={true}
          frameBorder="0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          title={t("iframeTitle")}
          className="block min-h-[360px] w-full"
        />
      </div>
    </section>
  );
}
