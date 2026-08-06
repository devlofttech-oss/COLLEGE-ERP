const STAT_COLORS = ['#a78bfa', '#f472b6', '#f6b26b', '#57c4c9', '#2e8c97', '#1b6b74'];

export default function StudentStats({ loading, stats }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      {stats.map(({ label, value, icon }, i) => (
        <div key={label} className="tt-tile flex items-center gap-4">
          <div className="tt-stat-icon [&_svg]:text-white shrink-0" style={{ background: STAT_COLORS[i % STAT_COLORS.length] }}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="tt-micro mb-1">{label}</div>
            <div className="text-[22px] font-bold text-ink leading-none">{loading ? '…' : value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
