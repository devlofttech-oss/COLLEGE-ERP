import { Edit3, FileText, Phone, UserRound } from 'lucide-react';
import StatusBadge from './StatusBadge';
import {
  certificateAdmissionFields,
  commonAdmissionFields,
  examAdmissionFields,
  lateralAdmissionFields,
} from '../admissionFieldConfig';

function DetailItem({ label, value, icon, full = false }) {
  return (
    <div className={`min-w-0 ${full ? 'xl:col-span-2' : ''}`}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-semibold text-slate-900 break-words">
        {icon}
        <span className="min-w-0 break-words">{value || '-'}</span>
      </div>
    </div>
  );
}

function DetailGrid({ fields, student, title }) {
  const visibleFields = fields.filter(([key]) => student[key]);
  if (!visibleFields.length) return null;

  return (
    <div className="mt-5">
      <h4 className="text-sm font-bold text-slate-900 mb-3">{title}</h4>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4 text-sm">
        {visibleFields.map(([key, label]) => (
          <DetailItem key={key} label={label} value={student[key]} />
        ))}
      </div>
    </div>
  );
}

export default function StudentProfileCard({
  canEdit = true,
  onApprove,
  onEdit,
  onOpenDocuments,
  onSummaryTabSelect,
  showApprove = false,
  showExtendedDetails = true,
  showProfileDetails = true,
  showSummaryTabs = true,
  summaryTabs = [],
  student,
}) {
  const resolvedSummaryTabs = summaryTabs.length ? summaryTabs : [
    { id: 'profile', label: 'Profile', icon: <UserRound size={14} /> },
    { id: 'documents', label: 'Docs', value: `${student.documents?.length || 0}`, icon: <FileText size={14} /> },
  ];
  const hasDocumentsSummaryTab = showSummaryTabs && resolvedSummaryTabs.some((tab) => (
    tab.id === 'documents' || String(tab.label || '').toLowerCase() === 'docs'
  ));

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-5 mb-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-[136px] w-[136px] rounded-full bg-[#30343c] text-emerald-300 flex items-center justify-center shrink-0 overflow-hidden">
            {student.profilePhotoUrl ? (
              <img src={student.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound size={64} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900 break-words">{student.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{student.className} {student.section} | Student ID: {student.studentId}</p>
            <p className="text-xs text-slate-500 mt-1">{student.program}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canEdit && (
            <button
              onClick={() => onEdit?.(student)}
              className="h-9 px-4 rounded-full bg-[#33373e] text-white font-semibold text-xs flex items-center justify-center gap-2"
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
          {showApprove && (
            <button
              onClick={() => onApprove?.(student)}
              className="h-9 px-4 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2"
            >
              Approve Admission
            </button>
          )}
          {!hasDocumentsSummaryTab && (
            <button
              onClick={() => onSummaryTabSelect ? onSummaryTabSelect('documents', student) : onOpenDocuments?.(student)}
              className="h-9 px-4 rounded-full bg-[#f5f5f6] text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
            >
              <FileText size={14} /> Documents
            </button>
          )}
          <StatusBadge value={student.status} />
        </div>
      </div>

      <div className="pt-5">
        {showSummaryTabs && (
        <div className="flex flex-wrap gap-2 mb-5">
          {resolvedSummaryTabs.map((tab) => (
            <button
              key={tab.id || tab.label}
              type="button"
              onClick={() => onSummaryTabSelect?.(tab.id || tab.label, student)}
              className={`h-10 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                tab.active
                  ? 'bg-[#33373e] text-white border-[#33373e]'
                  : 'bg-[#f5f5f6] text-slate-600 border-slate-100'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.value ? <span className="text-[11px] opacity-75">{tab.value}</span> : null}
            </button>
          ))}
        </div>
        )}

        {showProfileDetails && (
          <>
            <h3 className="font-bold text-slate-900 mb-4">Basic Details</h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4 text-sm">
              <DetailItem label="Admission No" value={student.admissionNo} />
              <DetailItem label="Class" value={`${student.className || '-'} - ${student.section || '-'}`} />
              <DetailItem label="Guardian" value={student.guardianName} />
              <DetailItem label="ID Holder" value={student.idHolder} />
              <DetailItem label="Contact" value={student.phone} icon={<Phone size={13} className="shrink-0" />} />
              <DetailItem label="Email" value={student.email} />
            </div>

            {showExtendedDetails && (
              <>
                <DetailGrid title="RGUHS Admission Details" fields={commonAdmissionFields} student={student} />
                <DetailGrid title="Entrance & Qualifying Exam" fields={examAdmissionFields} student={student} />
                <DetailGrid title="Lateral Entry Diploma Details" fields={lateralAdmissionFields} student={student} />
                <DetailGrid title="Caste & Income Certificate Details" fields={certificateAdmissionFields} student={student} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
