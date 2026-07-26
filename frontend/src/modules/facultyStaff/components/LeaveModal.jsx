import { useState } from 'react';

export default function LeaveModal({ staffMember, onClose, onSave }) {
  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Leave Request</h2>
            <p className="text-sm text-slate-500">{staffMember.name} / {staffMember.employeeId}</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Leave Type</span>
            <select
              value={form.leaveType}
              onChange={(event) => setForm((prev) => ({ ...prev, leaveType: event.target.value }))}
              className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#fb9a5b] focus:ring-2 focus:ring-orange-100"
            >
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Earned Leave</option>
              <option>Academic Duty</option>
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">From Date</span>
            <input type="date" value={form.fromDate} onChange={(event) => setForm((prev) => ({ ...prev, fromDate: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#fb9a5b] focus:ring-2 focus:ring-orange-100" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">To Date</span>
            <input type="date" value={form.toDate} onChange={(event) => setForm((prev) => ({ ...prev, toDate: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#fb9a5b] focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Reason</span>
            <textarea value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} className="w-full min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#fb9a5b] focus:ring-2 focus:ring-orange-100" />
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">Save Leave</button>
        </div>
      </form>
    </div>
  );
}
