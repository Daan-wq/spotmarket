import type { CampaignApplicationPage, CampaignApplication, Campaign } from "@prisma/client";

type Row = CampaignApplicationPage & {
  application: CampaignApplication & { campaign: Pick<Campaign, "id" | "name" | "status"> };
};

export function CampaignHistoryTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">No campaigns yet.</p>;
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Campaign", "Status", "Views", "Earned", "Date"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-t border-gray-100">
              <td className="px-4 py-3 text-gray-900">{row.application.campaign.name}</td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {row.application.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{row.totalViews.toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-700">€{(row.earnedAmount / 100).toFixed(2)}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(row.application.appliedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
