interface StatCard {
  label: string;
  value: string | number;
}

interface StatCardsProps {
  stats: StatCard[];
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-[10px] mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-md px-4 py-[14px]">
          <p className="text-[12px] text-gray-400">{label}</p>
          <p className="text-[22px] font-medium text-gray-900 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  );
}
