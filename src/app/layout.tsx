import type { Metadata } from "next";
import { Geist, Lexend } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AuthErrorHandler } from "./auth-error-handler";
import { QueryProvider } from "@/components/providers/query-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { Toaster } from "@/components/ui/toaster";
import { getAppUrlForLocale } from "@/lib/app-url";
import type { Locale } from "@/i18n/routing";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const reportFont = Geist({
  variable: "--font-report",
  subsets: ["latin"],
});

export const preferredRegion = "fra1";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("metadata");
  const appUrl = getAppUrlForLocale(locale);

  return {
    metadataBase: new URL(appUrl),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: appUrl,
      languages: {
        en: getAppUrlForLocale("en"),
        nl: getAppUrlForLocale("nl"),
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: appUrl,
      siteName: "ClipProfit",
      type: "website",
      locale: locale === "nl" ? "nl_NL" : "en_US",
      alternateLocale: locale === "nl" ? ["en_US"] : ["nl_NL"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${lexend.variable} ${reportFont.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthErrorHandler />
          <PostHogProvider>
            <QueryProvider>{children}</QueryProvider>
          </PostHogProvider>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
