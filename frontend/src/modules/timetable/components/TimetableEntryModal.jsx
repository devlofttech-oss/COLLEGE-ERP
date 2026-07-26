import { useState } from 'react';
import { normalizeTimeSlotFields, weekDays } from '../timetableUtils';

export default function TimetableEntryModal({ classOptions, classrooms, faculty, initialEntry = null, initialValues = {}, mode = 'create', onClose, onSave, timeSlotOptions = [] }) {
  const isEdit = mode === 'edit';
  const initialTime = normalizeTimeSlotFields(initialEntry || initialValues);
  const [form, setForm] = useState({
    classKey: initialEntry?.classKey || initialValues.classKey || classOptions[0] || '',
    subject: initialEntry?.subject || '',
    facultyId: initialEntry?.facultyId || faculty[0]?.id || '',
    classroomId: initialEntry?.classroomId || classrooms[0]?.id || '',
    day: initialEntry?.day || initialValues.day || weekDays[0],
    timeSlot: initialTime.timeSlot || timeSlotOptions[0]?.label || '',
    startTime: initialTime.startTime || timeSlotOptions[0]?.startTime || '',
    endTime: initialTime.endTime || timeSlotOptions[0]?.endTime || '',
  });

  const changeTimeSlot = (timeSlot) => {
    const selected = timeSlotOptions.find((item) => item.label === timeSlot);
    setForm((prev) => ({
      ...prev,
      timeSlot,
      startTime: selected?.startTime || prev.startTime,
      endTime: selected?.endTime || prev.endTime,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="erp-modal-overlay fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="erp-modal-form w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="erp-modal-header px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Timetable Entry' : 'Create Timetable Entry'}</h2>
            <p className="text-sm text-slate-500">Assign subject, faculty, classroom, day, and time slot.</p>
          </div>
          <button type="button" onClick={onClose} className="erp-modal-close h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Class</span>
            <select value={form.classKey} onChange={(event) => setForm((prev) => ({ ...prev, classKey: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {classOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Subject</span>
            <input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Faculty</span>
            <select value={form.facultyId} onChange={(event) => setForm((prev) => ({ ...prev, facultyId: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {faculty.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Classroom</span>
            <select value={form.classroomId} onChange={(event) => setForm((prev) => ({ ...prev, classroomId: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {classrooms.map((item) => <option key={item.id} value={item.id}>{item.roomNo}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Day</span>
            <select value={form.day} onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {weekDays.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Time Slot</span>
            <input list="timetable-time-slots" value={form.timeSlot} onChange={(event) => changeTimeSlot(event.target.value)} placeholder="09:00 - 10:00" className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
            <datalist id="timetable-time-slots">
              {timeSlotOptions.map((item) => <option key={item.label} value={item.label} />)}
            </datalist>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Start Time</span>
            <input type="time" value={form.startTime} onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">End Time</span>
            <input type="time" value={form.endTime} onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
        </div>
        <div className="erp-modal-footer px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">{isEdit ? 'Save Changes' : 'Save Entry'}</button>
        </div>
      </form>
    </div>
  );
}
