import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Bell,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCcw,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import {
  getMyAttendance,
  getMyClasses,
  getMyDownloads,
  getMyExams,
  getMyFees,
  getMyNotices,
  getMyProfile,
  getMyResults,
  getMyTeachingTimetable,
  getMyTimetable,
  listMyStudents,
} from '../../api/myPortal';
import { API_BASE_URL } from '../../api/client';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';
import {
  flattenPortalTimetable,
  formatPortalCurrency,
  formatPortalDate,
  getLinkedStudentIds,
  getPortalStudentClass,
  getPortalStudentId,
  getPortalStudentName,
  isReceiptDownload,
  labelizePortalValue,
  myPortalPermissions,
  summarizePortalAttendance,
  summarizePortalClasses,
  summarizePortalDownloads,
  summarizePortalFees,
} from './myPortalUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const STUDENT_PORTAL_ROLES = new Set(['parent', 'student']);
const TEACHER_PORTAL_ROLES = new Set(['teacher', 'faculty']);
const textInputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20 disabled:cursor-not-allowed disabled:opacity-70';

function resolveBackendAssetUrl(url = '') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return `${API_BASE_URL}${url.slice(4)}`;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

function hasPortalPermission(user, permission) {
  const roleId = user?.roleId || user?.role || '';
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(roleId) || permissions.includes(permission) || canAccess(defaultRoles, roleId, permission);
}

function hasAnyPortalPermission(user, permissions = []) {
  return permissions.some((permission) => hasPortalPermission(user, permission));
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-6 text-center text-sm font-semibold text-[#3f4848]">
      {message}
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-2xl font-bold text-[#003434]">{value}</div>
    </div>
  );
}

function InfoGrid({ rows }) {
  const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!visibleRows.length) return <EmptyState message="No profile fields returned." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visibleRows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</div>
          <div className="mt-2 break-words text-sm font-bold text-[#003434]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function TimetablePanel({ title, timetable }) {
  const rows = flattenPortalTimetable(timetable);
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">{title}</h2>
        <CalendarDays size={19} className="text-[#006a62]" />
      </div>
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map(({ day, entries }) => (
            <div key={day} className="rounded-xl bg-white/40 p-4">
              <div className="mb-3 text-xs font-bold uppercase text-[#006a62]">{day}</div>
              <div className="grid gap-2">
                {entries.map((entry, index) => (
                  <div key={entry.id || `${day}-${index}`} className="rounded-xl bg-white/45 px-3 py-2 text-sm">
                    <div className="font-bold text-[#003434]">{entry.subjectName || entry.subject || entry.subjectId || 'Class period'}</div>
                    <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                      {[entry.startTime, entry.endTime].filter(Boolean).join(' - ') || entry.periodName || entry.periodId || '-'}
                      {entry.teacherName || entry.className || entry.sectionName ? ` | ${[entry.teacherName, entry.className, entry.sectionName].filter(Boolean).join(' / ')}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No timetable entries returned." />
      )}
    </section>
  );
}

function AttendancePanel({ attendance }) {
  const summary = summarizePortalAttendance(attendance || {});
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">Attendance</h2>
        <Activity size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-2xl bg-white/40 p-4 text-center">
          <div
            className="mx-auto flex h-32 w-32 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#006a62 ${Math.min(100, summary.percentage) * 3.6}deg, rgba(255,255,255,.52) 0deg)` }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white/70">
              <span className="font-['Montserrat'] text-3xl font-bold text-[#003434]">{summary.percentage}%</span>
              <span className="text-[11px] font-bold uppercase text-[#3f4848]">Present</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-[#3f4848]">
            <div className="rounded-xl bg-white/45 p-2"><b className="block text-[#003434]">{summary.present}</b>Present</div>
            <div className="rounded-xl bg-white/45 p-2"><b className="block text-[#003434]">{summary.absent}</b>Absent</div>
            <div className="rounded-xl bg-white/45 p-2"><b className="block text-[#003434]">{summary.late}</b>Late</div>
            <div className="rounded-xl bg-white/45 p-2"><b className="block text-[#003434]">{summary.leave}</b>Leave</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white/35">
          {summary.records.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#004d4d] text-left text-white">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.records.slice(0, 8).map((record, index) => (
                    <tr key={record.id || index} className="border-t border-white/30">
                      <td className="px-4 py-3 font-semibold text-[#3f4848]">{formatPortalDate(record.date || record.attendanceDate || record.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold text-[#3f4848]">{record.subjectName || record.subject || record.subjectId || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-[#003434]">{labelizePortalValue(record.status)}</td>
                      <td className="px-4 py-3 font-semibold text-[#3f4848]">{record.session || record.periodName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState message="No attendance records returned." />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeesPanel({ downloads, fees }) {
  const summary = summarizePortalFees(fees || {});
  const downloadSummary = summarizePortalDownloads(downloads || {});
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">Fees</h2>
        <Wallet size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Assigned</div>
          <div className="mt-2 text-lg font-bold text-[#003434]">{formatPortalCurrency(summary.totalAssigned)}</div>
        </div>
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Paid</div>
          <div className="mt-2 text-lg font-bold text-[#006a62]">{formatPortalCurrency(summary.totalPaid)}</div>
        </div>
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Due</div>
          <div className="mt-2 text-lg font-bold text-[#8a4b00]">{formatPortalCurrency(summary.totalDue)}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Pending Assignments</h3>
          <div className="grid gap-2">
            {summary.pending.length ? summary.pending.map((item, index) => (
              <div key={item.id || index} className="rounded-xl bg-white/40 p-3 text-sm">
                <div className="font-bold text-[#003434]">{item.structureName || item.feeStructureName || item.feeHeadName || item.id || `Assignment ${index + 1}`}</div>
                <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                  {formatPortalCurrency(item.balance || item.dueAmount || item.amountDue)} due
                </div>
              </div>
            )) : <EmptyState message="No pending fee assignments returned." />}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Receipts</h3>
          <div className="grid gap-2">
            {downloadSummary.receipts.length ? downloadSummary.receipts.map((item, index) => (
              <a
                key={item.id || index}
                href={resolveBackendAssetUrl(item.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl bg-white/40 p-3 text-sm font-bold text-[#003434] hover:text-[#006a62]"
              >
                <span>{item.receiptNumber || `Receipt ${index + 1}`}</span>
                <span className="flex items-center gap-2 text-xs text-[#006a62]">
                  {formatPortalCurrency(item.amount)} <Download size={15} />
                </span>
              </a>
            )) : <EmptyState message="No receipt downloads returned." />}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExamsResultsPanel({ exams, results }) {
  const schedules = Array.isArray(exams?.schedules) ? exams.schedules : [];
  const resultRows = Array.isArray(results?.results) ? results.results : [];
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">Exams & Results</h2>
        <BadgeCheck size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Exam Schedules</h3>
          <div className="grid gap-2">
            {schedules.length ? schedules.slice(0, 8).map((schedule, index) => (
              <div key={schedule.id || index} className="rounded-xl bg-white/40 p-3 text-sm">
                <div className="font-bold text-[#003434]">{schedule.examName || schedule.title || schedule.name || `Exam ${index + 1}`}</div>
                <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                  {[formatPortalDate(schedule.examDate || schedule.date || schedule.startDate), schedule.subjectName || schedule.subject || schedule.subjectId].filter(Boolean).join(' | ')}
                </div>
              </div>
            )) : <EmptyState message="No exam schedules returned." />}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Published Results</h3>
          <div className="grid gap-2">
            {resultRows.length ? resultRows.slice(0, 8).map((result, index) => (
              <div key={result.id || index} className="rounded-xl bg-white/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#003434]">{result.examName || result.examId || `Result ${index + 1}`}</div>
                    <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                      {[result.academicYear, result.status, result.rank ? `Rank ${result.rank}` : ''].filter(Boolean).join(' | ')}
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-[#006a62]">
                    {result.percentage !== undefined ? `${result.percentage}%` : '-'}
                    <div className="text-xs text-[#3f4848]">{result.grade || '-'}</div>
                  </div>
                </div>
              </div>
            )) : <EmptyState message="No published results returned." />}
          </div>
        </div>
      </div>
    </section>
  );
}

function NoticesDownloadsPanel({ downloads, notices }) {
  const noticeRows = Array.isArray(notices?.notices) ? notices.notices : [];
  const downloadSummary = summarizePortalDownloads(downloads || {});
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">Notices & Downloads</h2>
        <Bell size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Notices</h3>
          <div className="grid gap-2">
            {noticeRows.length ? noticeRows.slice(0, 8).map((notice, index) => (
              <div key={notice.id || index} className="rounded-xl bg-white/40 p-3 text-sm">
                <div className="font-bold text-[#003434]">{notice.title || notice.subject || `Notice ${index + 1}`}</div>
                <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                  {[labelizePortalValue(notice.audience), formatPortalDate(notice.createdAt || notice.publishDate || notice.date)].filter(Boolean).join(' | ')}
                </div>
                {notice.body || notice.message ? <div className="mt-2 text-xs font-semibold text-[#3f4848]">{notice.body || notice.message}</div> : null}
              </div>
            )) : <EmptyState message="No notices returned." />}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-[#3f4848]">Documents</h3>
          <div className="grid gap-2">
            {downloadSummary.documents.length ? downloadSummary.documents.slice(0, 8).map((item, index) => {
              const url = resolveBackendAssetUrl(item.url || item.downloadUrl || item.fileUrl);
              const title = item.documentType || item.archiveTitle || item.fileName || `Document ${index + 1}`;
              const content = (
                <>
                  <span>
                    <span className="block font-bold text-[#003434]">{title}</span>
                    <span className="mt-1 block text-xs font-semibold text-[#3f4848]">{item.verificationStatus || item.category || '-'}</span>
                  </span>
                  {url ? <Download size={16} className="text-[#006a62]" /> : <FileText size={16} className="text-[#006a62]" />}
                </>
              );
              return url ? (
                <a key={item.id || index} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-white/40 p-3 text-sm">
                  {content}
                </a>
              ) : (
                <div key={item.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-white/40 p-3 text-sm">
                  {content}
                </div>
              );
            }) : <EmptyState message="No document downloads returned." />}
            {downloadSummary.receipts.filter(isReceiptDownload).length ? (
              <div className="rounded-xl bg-white/30 p-3 text-xs font-bold uppercase text-[#3f4848]">
                {downloadSummary.receipts.length} fee receipt{downloadSummary.receipts.length === 1 ? '' : 's'} available in Fees.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherClassesPanel({ classes }) {
  const summary = summarizePortalClasses(classes || {});
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#003434]">My Classes</h2>
        <Users size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Staff</div>
          <div className="mt-2 text-sm font-bold text-[#003434]">{summary.staffName}</div>
        </div>
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Classes</div>
          <div className="mt-2 text-lg font-bold text-[#003434]">{summary.classes}</div>
        </div>
        <div className="rounded-xl bg-white/40 p-4">
          <div className="text-[11px] font-bold uppercase text-[#3f4848]">Subjects</div>
          <div className="mt-2 text-lg font-bold text-[#003434]">{summary.subjects}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {summary.allocations.length ? summary.allocations.map((allocation, index) => (
          <div key={allocation.id || index} className="rounded-xl bg-white/40 p-3 text-sm">
            <div className="font-bold text-[#003434]">{allocation.className || allocation.classId || `Allocation ${index + 1}`}</div>
            <div className="mt-1 text-xs font-semibold text-[#3f4848]">
              {[allocation.sectionName || allocation.sectionId, allocation.subjectName || allocation.subjectId, allocation.academicYear].filter(Boolean).join(' | ') || '-'}
            </div>
          </div>
        )) : <EmptyState message="No teaching allocations returned." />}
      </div>
    </section>
  );
}

export default function MyPortal({ academicYear = '', currentUser }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [fees, setFees] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [exams, setExams] = useState(null);
  const [results, setResults] = useState(null);
  const [notices, setNotices] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [classes, setClasses] = useState(null);
  const [teachingTimetable, setTeachingTimetable] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', academicYear });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const roleId = currentUser?.roleId || currentUser?.role || '';
  const isStudentPortalRole = STUDENT_PORTAL_ROLES.has(roleId);
  const isTeacherPortalRole = TEACHER_PORTAL_ROLES.has(roleId);
  const canView = (isStudentPortalRole || isTeacherPortalRole) && hasAnyPortalPermission(currentUser, myPortalPermissions);
  const canListStudents = isStudentPortalRole && hasPortalPermission(currentUser, 'students.viewOwn');
  const canViewAttendance = isStudentPortalRole && hasPortalPermission(currentUser, 'attendance.viewOwn');
  const canViewFees = isStudentPortalRole && hasPortalPermission(currentUser, 'fees.viewOwn');
  const canViewTimetable = isStudentPortalRole && hasPortalPermission(currentUser, 'timetable.viewOwn');
  const canViewExams = isStudentPortalRole && hasPortalPermission(currentUser, 'examinations.viewOwn');
  const canViewResults = isStudentPortalRole && hasPortalPermission(currentUser, 'results.viewOwn');
  const canViewNotices = (isStudentPortalRole || isTeacherPortalRole) && hasPortalPermission(currentUser, 'communication.view');
  const canViewTeacherClasses = isTeacherPortalRole && hasAnyPortalPermission(currentUser, ['attendance.mark', 'timetable.view', 'examinations.marks']);
  const canViewTeachingTimetable = isTeacherPortalRole && hasAnyPortalPermission(currentUser, ['timetable.view', 'timetable.viewOwn']);

  const linkedStudentIds = useMemo(() => getLinkedStudentIds(currentUser), [currentUser]);
  const selectedStudent = students.find((student) => getPortalStudentId(student) === selectedStudentId) || profile || students[0] || null;
  const attendanceSummary = summarizePortalAttendance(attendance || {});
  const feeSummary = summarizePortalFees(fees || {});
  const downloadSummary = summarizePortalDownloads(downloads || {});
  const classSummary = summarizePortalClasses(classes || {});
  const noticeCount = Array.isArray(notices?.notices) ? notices.notices.length : 0;
  const summaryCards = [
    canListStudents ? { id: 'linked-students', icon: <GraduationCap size={20} className="text-[#006a62]" />, label: 'Linked Students', value: students.length || linkedStudentIds.length || 0 } : null,
    canViewAttendance ? { id: 'attendance', icon: <Activity size={20} className="text-[#006a62]" />, label: 'Attendance', value: `${attendanceSummary.percentage}%` } : null,
    canViewFees ? { id: 'fee-due', icon: <Wallet size={20} className="text-[#006a62]" />, label: 'Fee Due', value: formatPortalCurrency(feeSummary.totalDue) } : null,
    canViewNotices ? { id: 'notices', icon: <Bell size={20} className="text-[#006a62]" />, label: 'Notices', value: noticeCount } : null,
    canViewTeacherClasses ? { id: 'classes', icon: <Users size={20} className="text-[#006a62]" />, label: 'Classes', value: classSummary.allocations.length } : null,
  ].filter(Boolean);

  const loadPortalData = async ({ studentId = selectedStudentId, nextFilters = filters } = {}) => {
    if (!canView) return;
    setLoading(true);
    const errors = [];
    const read = async (label, loader, fallback) => {
      try {
        return await loader();
      } catch (error) {
        errors.push(`${label}: ${error?.message || 'Request failed.'}`);
        return fallback;
      }
    };

    try {
      let targetStudentId = studentId;
      if (canListStudents) {
        const studentRows = await read('Students', listMyStudents, []);
        setStudents(studentRows);
        const firstStudentId = getPortalStudentId(studentRows[0] || {});
        const isValidSelected = studentRows.some((student) => getPortalStudentId(student) === targetStudentId);
        if (!targetStudentId || !isValidSelected) targetStudentId = firstStudentId;
      } else if (!targetStudentId) {
        targetStudentId = linkedStudentIds[0] || '';
      }
      setSelectedStudentId(targetStudentId || '');

      const studentParams = targetStudentId ? { studentId: targetStudentId } : {};
      const attendanceParams = {
        ...studentParams,
        from: nextFilters.from,
        to: nextFilters.to,
      };
      const teacherTimetableParams = {
        academicYear: nextFilters.academicYear || academicYear,
      };

      const [
        nextProfile,
        nextAttendance,
        nextFees,
        nextTimetable,
        nextExams,
        nextResults,
        nextNotices,
        nextDownloads,
        nextClasses,
        nextTeachingTimetable,
      ] = await Promise.all([
        canListStudents ? read('Profile', () => getMyProfile(studentParams), null) : Promise.resolve(null),
        canViewAttendance ? read('Attendance', () => getMyAttendance(attendanceParams), null) : Promise.resolve(null),
        canViewFees ? read('Fees', () => getMyFees(studentParams), null) : Promise.resolve(null),
        canViewTimetable ? read('Timetable', () => getMyTimetable(studentParams), null) : Promise.resolve(null),
        canViewExams ? read('Exams', () => getMyExams(studentParams), null) : Promise.resolve(null),
        canViewResults ? read('Results', () => getMyResults(studentParams), null) : Promise.resolve(null),
        canViewNotices ? read('Notices', () => getMyNotices(studentParams), null) : Promise.resolve(null),
        canListStudents ? read('Downloads', () => getMyDownloads(studentParams), null) : Promise.resolve(null),
        canViewTeacherClasses ? read('Classes', getMyClasses, null) : Promise.resolve(null),
        canViewTeachingTimetable ? read('Teaching timetable', () => getMyTeachingTimetable(teacherTimetableParams), null) : Promise.resolve(null),
      ]);

      setProfile(nextProfile);
      setAttendance(nextAttendance);
      setFees(nextFees);
      setTimetable(nextTimetable);
      setExams(nextExams);
      setResults(nextResults);
      setNotices(nextNotices);
      setDownloads(nextDownloads);
      setClasses(nextClasses);
      setTeachingTimetable(nextTeachingTimetable);
      setLoadError(errors.join(' '));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadPortalData();
    });
    return () => {
      active = false;
    };
    // Route permissions and current user are checked inside the loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, currentUser?.roleId, academicYear]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    loadPortalData({ studentId: selectedStudentId, nextFilters: filters });
  };

  const selectStudent = (event) => {
    const nextStudentId = event.target.value;
    setSelectedStudentId(nextStudentId);
    loadPortalData({ studentId: nextStudentId, nextFilters: filters });
  };

  if (!canView) {
    return (
      <div className="erp-my-portal-page">
        <EmptyState message="You do not have permission to view My Portal." />
      </div>
    );
  }

  return (
    <div className="erp-my-portal-page">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#006a62]">My Portal</p>
          <h1 className="mt-1 font-['Montserrat'] text-3xl font-bold text-[#003434]">Self View</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">{currentUser?.name || currentUser?.email || 'Signed-in user'}</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={() => loadPortalData({ studentId: selectedStudentId, nextFilters: filters })}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d] disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} icon={card.icon} label={card.label} value={card.value} />
        ))}
      </div>

      <section className="erp-glass-card mt-5 rounded-2xl p-5">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={submitFilters}>
          {(canListStudents || linkedStudentIds.length > 0) && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Student</span>
              <select value={selectedStudentId} onChange={selectStudent} disabled={!canListStudents || loading || students.length <= 1} className={textInputClass}>
                {!students.length && <option value="">{linkedStudentIds[0] || 'Default linked student'}</option>}
                {students.map((student) => (
                  <option key={getPortalStudentId(student)} value={getPortalStudentId(student)}>
                    {getPortalStudentName(student)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canViewAttendance && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Attendance From</span>
              <input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} disabled={loading} className={textInputClass} />
            </label>
          )}
          {canViewAttendance && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Attendance To</span>
              <input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} disabled={loading} className={textInputClass} />
            </label>
          )}
          {canViewTeachingTimetable && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Teaching Year</span>
              <input value={filters.academicYear || academicYear || ''} onChange={(event) => updateFilter('academicYear', event.target.value)} disabled={loading} placeholder="2025-2026" className={textInputClass} />
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />} Apply
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {canListStudents && (
            <section className="erp-glass-card rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#003434]">Profile</h2>
                <UserRound size={19} className="text-[#006a62]" />
              </div>
              {selectedStudent ? (
                <InfoGrid rows={[
                  ['Name', getPortalStudentName(selectedStudent)],
                  ['Student ID', selectedStudent.studentId || selectedStudent.displayId || getPortalStudentId(selectedStudent)],
                  ['Admission No', selectedStudent.admissionNo || selectedStudent.admissionNumber],
                  ['Class', getPortalStudentClass(selectedStudent)],
                  ['Academic Year', selectedStudent.academicYear],
                  ['Guardian', selectedStudent.guardianName || selectedStudent.parentName],
                  ['Phone', selectedStudent.phone || selectedStudent.mobile],
                  ['Email', selectedStudent.email],
                  ['Status', selectedStudent.status],
                ]} />
              ) : (
                <EmptyState message="No linked student profile returned." />
              )}
            </section>
          )}

          {canViewAttendance && <AttendancePanel attendance={attendance} />}
          {canViewFees && <FeesPanel downloads={downloads} fees={fees} />}
          {canViewTimetable && <TimetablePanel title="Class Timetable" timetable={timetable?.timetable} />}
          {(canViewExams || canViewResults) && <ExamsResultsPanel exams={exams} results={results} />}
          {canViewTeacherClasses && <TeacherClassesPanel classes={classes} />}
          {canViewTeachingTimetable && <TimetablePanel title="Teaching Timetable" timetable={teachingTimetable?.timetable} />}
        </div>

        <div className="space-y-5">
          {(canViewNotices || canListStudents) && <NoticesDownloadsPanel downloads={downloads} notices={notices} />}
          <section className="erp-glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#3f4848]">Downloads</div>
                <div className="mt-2 font-['Montserrat'] text-2xl font-bold text-[#003434]">{downloadSummary.total}</div>
              </div>
              <Download size={20} className="text-[#006a62]" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
