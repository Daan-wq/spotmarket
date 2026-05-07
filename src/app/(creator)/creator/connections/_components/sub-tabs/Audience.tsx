import { AudienceDemographics } from "@/components/stats/AudienceDemographics";
import { AccountGrowthChart, type AccountGrowthPoint } from "@/components/stats/AccountGrowthChart";
import type { AggregatedDemographics } from "@/lib/stats/types";

interface Props {
  /** Account-growth data; pass [] to suppress the chart (e.g. all-platforms scope). */
  accountGrowth: AccountGrowthPoint[];
  follower: AggregatedDemographics | null;
  engaged?: AggregatedDemographics | null;
  showKindToggle: boolean;
}

const EMPTY_DEMO: AggregatedDemographics = {
  ageBuckets: {},
  genderSplit: {},
  topCountries: [],
  sampleCount: 0,
};

export function AudienceSubTab({ accountGrowth, follower, engaged, showKindToggle }: Props) {
  return (
    <div className="space-y-4">
      {accountGrowth.length > 0 ? <AccountGrowthChart data={accountGrowth} /> : null}
      <AudienceDemographics
        follower={follower ?? EMPTY_DEMO}
        engaged={engaged ?? undefined}
        showKindToggle={showKindToggle}
      />
    </div>
  );
}
