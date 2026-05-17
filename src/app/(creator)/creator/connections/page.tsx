import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { AccountsAnalyticsWorkspace } from "@/components/creator-analytics/accounts-analytics-workspace";
import { AlertBanner } from "@/components/ui/alert-banner";
import { getFacebookConnectionStatus } from "@/lib/facebook-connection-status";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    platform?: string;
    account?: string;
    tab?: string;
    error?: string;
    detail?: string;
    facebook?: string;
  }>;
}

export default async function CreatorConnectionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const status = getFacebookConnectionStatus(sp);
  const t = await getTranslations("creator.connections.status");

  return (
    <div className="w-full md:px-6 md:py-8">
      {status ? (
        <AlertBanner
          tone={status.tone}
          title={t(`${status.key}.title`)}
          description={t(`${status.key}.description`)}
          className="mb-6"
        />
      ) : null}
      <AccountsAnalyticsWorkspace
        mode="creator"
        basePath="/creator/connections"
        profileScope={{
          userId: header.id,
          creatorProfileId: header.creatorProfile.id,
        }}
        searchParams={sp}
      />
    </div>
  );
}
