import StatusBadge from '../../students/components/StatusBadge';

export default function ResultsPanel({ marks, reportCards, results }) {
  return (
    <aside className="xl:w-[32%] erp-sticky-inspector">
      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm mb-5">
        <h3 className="font-bold mb-4">Recent Marks</h3>
        <div className="space-y-3">
          {marks.slice(0, 5).map((mark) => (
            <div key={mark.id} className="rounded-lg bg-[#f5f5f6] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{mark.studentName}</span>
                <StatusBadge value={mark.grade} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{mark.subject}: {mark.marksObtained}/{mark.maxMarks}</div>
            </div>
          ))}
          {!marks.length && <div className="rounded-lg bg-[#f5f5f6] p-3 text-sm text-slate-500">No marks entered.</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm mb-5">
        <h3 className="font-bold mb-4">Generated Results</h3>
        <div className="space-y-3">
          {results.slice(0, 5).map((result) => (
            <div key={result.id} className="rounded-lg bg-[#f5f5f6] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{result.studentName}</span>
                <StatusBadge value={result.status} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{result.percentage}% / {result.grade}</div>
            </div>
          ))}
          {!results.length && <div className="rounded-lg bg-[#f5f5f6] p-3 text-sm text-slate-500">No results generated.</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
        <h3 className="font-bold mb-4">Report Cards</h3>
        <div className="space-y-3">
          {reportCards.slice(0, 5).map((card) => (
            <div key={card.id} className="h-11 rounded-lg bg-[#f5f5f6] px-3 flex items-center justify-between text-sm">
              <span>{card.studentId}</span>
              <StatusBadge value={card.status} />
            </div>
          ))}
          {!reportCards.length && <div className="rounded-lg bg-[#f5f5f6] p-3 text-sm text-slate-500">No report cards generated.</div>}
        </div>
      </div>
    </aside>
  );
}
