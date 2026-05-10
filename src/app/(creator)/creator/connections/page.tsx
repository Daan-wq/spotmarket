import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { AccountsAnalyticsWorkspace } from "@/components/creator-analytics/accounts-analytics-workspace";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    platform?: string;
    account?: string;
    tab?: string;
  }>;
}

export default async function CreatorConnectionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  return (
    <div className="w-full px-6 py-8">
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
