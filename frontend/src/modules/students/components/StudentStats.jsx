export default function StudentStats({ loading, stats }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 py-5">
      {stats.map(({ label, value, icon }) => (
        <div key={label} className="bg-[#f5f5f6] rounded-lg p-4 flex items-center gap-4">
          <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center text-[#34363d] shadow-sm">
            {icon}
          </div>
          <div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-xl font-bold text-slate-900">{loading ? '...' : value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
