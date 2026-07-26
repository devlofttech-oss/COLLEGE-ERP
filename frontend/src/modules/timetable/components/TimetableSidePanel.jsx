import { Building2, CalendarCheck } from 'lucide-react';
import StatusBadge from '../../students/components/StatusBadge';

export default function TimetableSidePanel({ classrooms, facultyEntries, publications, selectedClass }) {
  return (
    <aside className="xl:w-[32%] erp-sticky-inspector">
      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm mb-5">
        <h3 className="font-bold mb-4">Classroom Allocation</h3>
        <div className="space-y-3">
          {classrooms.map((room) => (
            <div key={room.id} className="h-12 rounded-lg bg-[#f5f5f6] px-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Building2 size={16} /> {room.roomNo}</span>
              <span className="text-xs text-slate-500">{room.capacity} seats</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm mb-5">
        <h3 className="font-bold mb-4">Faculty Timetable</h3>
        <div className="space-y-3">
          {facultyEntries.slice(0, 6).map((entry) => (
            <div key={entry.id} className="rounded-lg bg-[#f5f5f6] p-3 text-sm">
              <div className="font-semibold">{entry.facultyName}</div>
              <div className="text-xs text-slate-500 mt-1">{entry.day} / {entry.timeSlot}</div>
              <div className="text-xs text-slate-500">{entry.subject} / {entry.classKey}</div>
            </div>
          ))}
          {!facultyEntries.length && <div className="rounded-lg bg-[#f5f5f6] p-3 text-sm text-slate-500">No faculty timetable entries.</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
        <h3 className="font-bold mb-4">Publishing</h3>
        <div className="space-y-3">
          {publications.filter((item) => !selectedClass || item.classKey === selectedClass).slice(0, 4).map((publication) => (
            <div key={publication.id} className="h-12 rounded-lg bg-[#f5f5f6] px-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><CalendarCheck size={16} /> {publication.classKey}</span>
              <StatusBadge value={publication.status} />
            </div>
          ))}
          {!publications.length && <div className="rounded-lg bg-[#f5f5f6] p-3 text-sm text-slate-500">No timetable publications yet.</div>}
        </div>
      </div>
    </aside>
  );
}
