import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { LanguageSettings } from "./_components/language-settings";
import { PayoutSettingsForm } from "./_components/payout-settings-form";
import { CreatorPageHeader } from "../_components/creator-journey";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creatorSettings");
  return { title: t("metaTitle") };
}

export default async function SettingsPage() {
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creatorSettings");
  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      creatorProfile: {
        select: {
          payoutIban: true,
          payoutAccountName: true,
          payoutSolanaAddress: true,
        },
      },
    },
  });

  return (
    <div className="w-full space-y-6 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <LanguageSettings
        currentLocale={locale}
        title={t("language.title")}
        description={t("language.description")}
        ariaLabel={t("language.ariaLabel")}
        savedLabel={t("language.saved")}
        errorLabel={t("language.error")}
      />

      <PayoutSettingsForm
        initialIban={user?.creatorProfile?.payoutIban ?? null}
        initialAccountName={user?.creatorProfile?.payoutAccountName ?? null}
        initialSolanaAddress={user?.creatorProfile?.payoutSolanaAddress ?? null}
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{t("danger.title")}</h2>
        <p className="mb-4 mt-1 text-xs text-neutral-500">
          {t("danger.description")}
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
