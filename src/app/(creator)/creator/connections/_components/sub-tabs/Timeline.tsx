import { TimelineChart } from "@/components/stats/TimelineChart";
import { TimelineFeed } from "@/components/stats/TimelineFeed";
import { TimelineCorrelationCallout } from "@/components/stats/TimelineCorrelationCallout";
import type { TimelineEvent } from "@/lib/stats/timeline";
import type { DailyPoint } from "@/components/stats/DailyViewsChart";

interface CorrelationRow {
  id: string;
  submissionId: string;
  deltaMinutes: number;
  story: {
    id: string;
    mediaId: string;
    postedAt: Date;
    permalink: string | null;
    views: number | null;
    reach: number | null;
  };
}

interface Props {
  daily: DailyPoint[];
  events: TimelineEvent[];
  lifts: Map<string, Array<{ date: string; views: number }>>;
  correlations: CorrelationRow[];
}

export function TimelineSubTab({ daily, events, lifts, correlations }: Props) {
  return (
    <div className="space-y-4">
      <TimelineChart series={daily} events={events} />
      <TimelineCorrelationCallout rows={correlations} />
      <TimelineFeed events={events} lifts={lifts} />
    </div>
  );
}
