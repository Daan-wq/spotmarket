import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { LanguageSettings } from "./_components/language-settings";
import { CreatorPageHeader } from "../_components/creator-journey";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creatorSettings");
  return { title: t("metaTitle") };
}

export default async function SettingsPage() {
  await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creatorSettings");

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
        savedLabel={t("language.saved")}
        savingLabel={t("language.saving")}
        errorLabel={t("language.error")}
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{t("danger.title")}</h2>
        <p className="mb-4 mt-1 text-xs text-neutral-500">
          {t("danger.description")}
        </p>
        <DeleteAccountButton
          label={t("danger.deleteButton")}
          confirmTitle={t("danger.confirmTitle")}
          confirmDescription={t("danger.confirmDescription")}
          confirmLabel={t("danger.confirmButton")}
          cancelLabel={t("danger.cancelButton")}
        />
      </section>
    </div>
  );
}
