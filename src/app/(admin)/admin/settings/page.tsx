import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import type { Locale } from "@/i18n/routing";
import { AdminLanguageSettings } from "./_components/admin-language-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSettings");
  return { title: t("metaTitle") };
}

export default async function AdminSettingsPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("adminSettings");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <AdminLanguageSettings
        currentLocale={locale}
        title={t("language.title")}
        description={t("language.description")}
        ariaLabel={t("language.ariaLabel")}
        savedLabel={t("language.saved")}
        errorLabel={t("language.error")}
      />
    </div>
  );
}
