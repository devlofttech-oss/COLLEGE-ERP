import StatusBadge from '../../students/components/StatusBadge';
import { formatCurrency } from '../../fees/feeUtils';

export default function FeeStatusCard({ feeStatus }) {
  const totalAssigned = Number(feeStatus.totalAssigned || 0);
  const totalPaid = Number(feeStatus.totalPaid || 0);
  const totalAdjusted = Number(feeStatus.totalAdjusted || 0);
  const totalDue = Number(feeStatus.totalDue || 0);
  const hasAssignedFee = totalAssigned > 0;
  const total = hasAssignedFee ? totalAssigned : 1;
  const paidPercent = hasAssignedFee ? Math.round((totalPaid / total) * 100) : 0;
  const adjustedPercent = hasAssignedFee ? Math.round((totalAdjusted / total) * 100) : 0;
  const duePercent = hasAssignedFee ? Math.round((totalDue / total) * 100) : 0;
  const graph = !hasAssignedFee || totalDue <= 0
    ? [{ label: 'Paid', value: 100, color: '#22c55e' }]
    : [
      { label: 'Paid', value: paidPercent, color: '#22c55e' },
      { label: 'Adjustment', value: adjustedPercent, color: '#64748b' },
      { label: 'Due', value: duePercent, color: '#ef4444' },
    ];
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Fee Status</h3>
        <StatusBadge value={feeStatus.status} />
      </div>
      <div className="space-y-3 text-sm">
        <div className="h-3 rounded-full bg-[#f5f5f6] overflow-hidden flex">
          {graph.map((item) => (
            <div key={item.label} className="h-full" style={{ width: `${item.value}%`, background: item.color }} />
          ))}
        </div>
        <div className="flex items-center justify-between"><span className="text-slate-500">Assigned</span><b>{formatCurrency(feeStatus.totalAssigned)}</b></div>
        <div className="flex items-center justify-between"><span className="text-slate-500">Paid</span><b className="text-emerald-700">{formatCurrency(feeStatus.totalPaid)}</b></div>
        <div className="flex items-center justify-between"><span className="text-slate-500">Adjustment</span><b>{formatCurrency(feeStatus.totalAdjusted)}</b></div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Due</span><b className="text-rose-700">{formatCurrency(feeStatus.totalDue)}</b></div>
      </div>
    </div>
  );
}
