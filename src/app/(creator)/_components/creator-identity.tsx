import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { getCreatorHeader } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorIdentityMenu } from "./creator-identity-menu";

export async function CreatorIdentity({ supabaseId }: { supabaseId: string }) {
  const header = await getCreatorHeader(supabaseId);
  const name = header?.creatorProfile?.displayName ?? "Creator";
  const initial = name.charAt(0).toUpperCase() || "C";

  return <CreatorIdentityMenu name={name} initial={initial} />;
}

export function CreatorIdentitySkeleton() {
  return (
    <button
      type="button"
      disabled
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3 text-left"
    >
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <ChevronDown className="h-4 w-4 text-neutral-300" />
    </button>
  );
}
