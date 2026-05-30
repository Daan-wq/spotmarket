import { getCreatorHeader } from "@/lib/auth";
import { getFirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";
import { FirstClipCoachClient } from "./first-clip-coach-client";

export async function FirstClipCoach({ supabaseId }: { supabaseId: string }) {
  const header = await getCreatorHeader(supabaseId);
  if (!header?.creatorProfile) return null;

  const status = await getFirstClipOnboardingStatus(header.id);
  if (status.nextStep === "done") return null;

  return <FirstClipCoachClient status={status} storageScope={supabaseId} />;
}
