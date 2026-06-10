import { getLocale, getTranslations } from "next-intl/server";

export const metadata = { title: "Privacy Policy - ClipProfit" };

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");

  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-8">Last updated: June 10, 2026</p>
      {locale === "nl" ? (
        <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          {t("englishOnlyNotice")}
        </p>
      ) : null}

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">1. What we collect</h2>
        <p>When you connect a social account, we collect account identifiers, usernames, audience and performance data, and public profile information made available by that platform. We also collect your email address, profile information, payout details, and security data such as your IP address and a random first-party device identifier.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">2. How we use it</h2>
        <p>We use your data to operate ClipProfit, match creators with campaigns, calculate earnings, process payouts, secure accounts, prevent viewbotting, and enforce platform bans. Security identifiers are compared using keyed cryptographic hashes. We do not sell your data to third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">3. Instagram data</h2>
        <p>We access your Instagram account data only with your explicit permission. You can revoke access at any time from your Instagram settings. We store only the data necessary to display your profile and calculate campaign performance.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">4. Data retention</h2>
        <p>We retain normal IP and device observations on a rolling basis for up to 90 days. A selected security indicator is retained only while the related account ban remains active and is removed when the ban is lifted. Non-sensitive enforcement audit records may be retained for security and accountability. Other account data is retained while your account is active or as required for legal and financial obligations.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">5. Cookies</h2>
        <p>We use authentication and session cookies and a random security device cookie to detect repeat abuse. The security cookie is first-party, HttpOnly, Secure, SameSite=Lax, and has a rolling lifetime of up to 12 months. It is not used for advertising or cross-site tracking.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">6. Fraud prevention decisions</h2>
        <p>Creator registrations, sign-ins, and protected requests may be automatically allowed, challenged, or blocked based on an active account ban and selected security indicators. An IP match by itself normally requires additional verification rather than an automatic ban. You may request human review of a blocked account by contacting us.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">7. Your rights and contact</h2>
        <p>You may request access, correction, deletion, restriction, objection, or human review where applicable. For privacy questions or an appeal, contact <a href="mailto:hello@clipprofit.com" className="text-indigo-600 hover:underline">hello@clipprofit.com</a>.</p>
      </section>
    </main>
  );
}
