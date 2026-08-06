import { Archive, ArchiveRestore, Edit3, Eye, UserRound } from 'lucide-react';
import StatusBadge from './StatusBadge';

function ActionBtn({ onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-9 w-9 rounded-xl bg-[#f2f7f7] hover:bg-[#e4f0f0] text-ink-2 flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}

export default function StudentTable({
  canArchive = true,
  canEdit = true,
  showActions = true,
  students,
  statusFilter,
  onArchive,
  onEdit,
  onRestore,
  onSelect,
  selectedId,
}) {
  const handleRowKeyDown = (event, studentId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(studentId);
    }
  };

  return (
    <div className="tt-card p-0! overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-micro text-left">
              <th className="font-medium px-6 py-4">Student</th>
              <th className="font-medium px-4 py-4">Admission / ID</th>
              <th className="font-medium px-4 py-4">Class</th>
              <th className="font-medium px-4 py-4">Status</th>
              {showActions && <th className="font-medium px-6 py-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(student.id)}
                onKeyDown={(event) => handleRowKeyDown(event, student.id)}
                className={`border-t border-[#eef3f3] cursor-pointer transition-colors hover:bg-[#f7fbfb] ${selectedId === student.id ? 'bg-[#f0f7f7]' : ''}`}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center overflow-hidden shrink-0">
                      {student.profilePhotoUrl ? (
                        <img src={student.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound size={20} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink truncate">{student.name}</span>
                      <span className="block text-[12px] text-muted truncate">{student.guardianName}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{student.admissionNo}</div>
                  <div className="text-[12px] text-muted">{student.studentId}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink-2">{student.className} - {student.section}</div>
                  <div className="text-[12px] text-muted">{student.program}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge value={student.status} /></td>
                {showActions && (
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <ActionBtn onClick={(e) => { e.stopPropagation(); onSelect(student.id); }} title="View"><Eye size={15} /></ActionBtn>
                      {canEdit && <ActionBtn onClick={(e) => { e.stopPropagation(); onEdit(student); }} title="Edit profile"><Edit3 size={15} /></ActionBtn>}
                      {canArchive && student.status !== 'Archived' && <ActionBtn onClick={(e) => { e.stopPropagation(); onArchive(student); }} title="Archive student"><Archive size={15} /></ActionBtn>}
                      {canArchive && student.status === 'Archived' && <ActionBtn onClick={(e) => { e.stopPropagation(); onRestore(student); }} title="Restore student"><ArchiveRestore size={15} /></ActionBtn>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!students.length && (
              <tr>
                <td colSpan={showActions ? 5 : 4} className="text-center text-[13px] text-muted px-6 py-12">
                  No {statusFilter === 'archived' ? 'archived' : 'active'} student records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
