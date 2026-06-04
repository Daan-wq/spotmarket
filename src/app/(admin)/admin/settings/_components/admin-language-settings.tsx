"use client";

import { DashboardLanguageSettings } from "@/components/settings/dashboard-language-settings";
import type { Locale } from "@/i18n/routing";
import { updateAdminLocale } from "../actions";

interface AdminLanguageSettingsProps {
  currentLocale: Locale;
  title: string;
  description: string;
  ariaLabel: string;
  savedLabel: string;
  errorLabel: string;
}

export function AdminLanguageSettings(props: AdminLanguageSettingsProps) {
  return <DashboardLanguageSettings {...props} updateLocale={updateAdminLocale} />;
}
