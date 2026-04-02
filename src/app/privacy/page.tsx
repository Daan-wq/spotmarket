export const metadata = { title: "Privacy Policy – ClipProfit" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-8">Last updated: March 2025</p>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">1. What we collect</h2>
        <p>When you connect your Instagram account, we collect your Instagram username, follower count, engagement rate, and public profile data via the Instagram Basic Display API. We also collect your email address and any profile information you provide during sign-up.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">2. How we use it</h2>
        <p>We use your data solely to operate the ClipProfit platform — matching creators with brand campaigns, calculating earnings, and processing payouts. We do not sell your data to third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">3. Instagram data</h2>
        <p>We access your Instagram account data only with your explicit permission. You can revoke access at any time from your Instagram settings. We store only the data necessary to display your profile and calculate campaign performance.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">4. Data retention</h2>
        <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">5. Cookies</h2>
        <p>We use cookies for authentication and session management only. We do not use tracking or advertising cookies.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">6. Contact</h2>
        <p>For privacy-related questions, contact us at <a href="mailto:hello@clipprofit.com" className="text-indigo-600 hover:underline">hello@clipprofit.com</a>.</p>
      </section>
    </main>
  );
}
