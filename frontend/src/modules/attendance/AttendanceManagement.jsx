import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import {
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentAttendancePercentage,
  listStaffAttendance,
  listStudentAttendance,
  markStaffAttendance,
  markStudentAttendance,
} from '../../api/attendance';
import { listStaff } from '../../api/staff';
import { listStudents } from '../../api/students';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave'];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthStartValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function statusLabel(status) {
  return String(status || '').replace(/^\w/, (char) => char.toUpperCase());
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'present') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'absent') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === 'late') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'leave') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
}

function tally(records = []) {
  return records.reduce((summary, record) => {
    const status = record.status;
    if (summary[status] !== undefined) summary[status] += 1;
    summary.total += 1;
    return summary;
  }, { present: 0, absent: 0, late: 0, leave: 0, total: 0 });
}

function attendancePercentage(summary) {
  return summary.total ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;
}

function buildRecordMap(records = [], idKey) {
  return new Map(records.map((record) => [record[idKey], record]));
}

function initialsFor(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AT';
}

function entityLabel(entity, mode) {
  if (mode === 'staff') return entity.employeeId || entity.id;
  return entity.admissionNumber || entity.rollNumber || entity.id;
}

function getDepartmentLabel(staffMember = {}) {
  return staffMember.department || staffMember.designation || staffMember.type || '-';
}

function getClassLabel(student = {}) {
  return [student.className || student.course || student.courseName, student.section].filter(Boolean).join(' - ') || '-';
}

function buildAttendanceEntries(entities, drafts, mode) {
  return entities.map((entity) => {
    const draft = drafts[entity.id] || {};
    return mode === 'staff'
      ? {
        staffId: entity.id,
        staffName: entity.name || null,
        status: draft.status || 'present',
        remarks: draft.remarks?.trim() || null,
      }
      : {
        studentId: entity.id,
        studentName: entity.name || null,
        status: draft.status || 'present',
        remarks: draft.remarks?.trim() || null,
      };
  });
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-3xl font-bold text-[#003434]">{loading ? '-' : value}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">
      {message}
    </div>
  );
}

export default function AttendanceManagement({
  academicYear = '',
  currentUser,
  initialBranch = '',
  initialMode = 'students',
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const initialModeFromRoute = initialMode === 'staff' || String(initialBranch || '').includes('staff') ? 'staff' : 'students';
  const [mode, setMode] = useState(initialModeFromRoute);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentRecords, setStudentRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [studentCount, setStudentCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [date, setDate] = useState(todayInputValue);
  const [fromDate, setFromDate] = useState(monthStartValue);
  const [toDate, setToDate] = useState(todayInputValue);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [studentPercentage, setStudentPercentage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'attendance.view');
  const canMark = hasPermission(currentUser, 'attendance.mark');
  const canReport = canView || hasPermission(currentUser, 'attendance.report');

  const effectiveAcademicYear = academicYear || classes[0]?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || (selectedCourseCode !== 'all' ? selectedCourseCode : '');
  const visibleSections = useMemo(
    () => sections.filter((section) => !classId || section.classId === classId),
    [classId, sections]
  );

  const entityRecords = mode === 'staff' ? staffRecords : studentRecords;
  const entitySummary = useMemo(() => tally(entityRecords), [entityRecords]);
  const entityPercentage = attendancePercentage(entitySummary);

  const roster = useMemo(() => {
    const entities = mode === 'staff' ? staff : (scopedStudents.length && !classId && !sectionId ? scopedStudents : students);
    const needle = search.trim().toLowerCase();
    if (!needle) return entities;
    return entities.filter((entity) => [
      entity.name,
      entity.employeeId,
      entity.admissionNumber,
      entity.rollNumber,
      entity.mobile,
      entity.phone,
      entity.email,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [classId, mode, scopedStudents, search, sectionId, staff, students]);

  const loadAcademicLookups = useCallback(async () => {
    try {
      const classParams = {
        academicYear: effectiveAcademicYear,
        courseId: effectiveCourseId,
        status: 'active',
      };
      const sectionParams = {
        academicYear: effectiveAcademicYear,
        status: 'active',
      };
      const [nextClasses, nextSections] = await Promise.all([
        listAcademicResource('classes', classParams),
        listAcademicResource('sections', sectionParams),
      ]);
      setClasses(nextClasses);
      setSections(nextSections);
    } catch (error) {
      console.error('Unable to load attendance academic lookups.', error);
      toast.error(error?.message || 'Academic lookup data could not be loaded.');
    }
  }, [effectiveAcademicYear, effectiveCourseId]);

  const loadAttendanceData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const studentParams = {
        academicYear: effectiveAcademicYear,
        classId,
        sectionId,
        courseId: effectiveCourseId,
        status: 'active',
      };
      const studentAttendanceParams = {
        date,
        academicYear: effectiveAcademicYear,
        classId,
        sectionId,
      };
      const [studentData, staffData, nextStudentRecords, nextStaffRecords] = await Promise.all([
        listStudents(studentParams),
        listStaff({ status: 'active' }),
        listStudentAttendance(studentAttendanceParams),
        listStaffAttendance({ date }),
      ]);
      setStudents(studentData.students);
      setStudentCount(studentData.count);
      setStaff(staffData.staff);
      setStaffCount(staffData.count);
      setStudentRecords(nextStudentRecords);
      setStaffRecords(nextStaffRecords);
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend attendance data.', error);
      setLoadError(error?.message || 'Unable to load attendance from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, classId, date, effectiveAcademicYear, effectiveCourseId, sectionId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active || !canView) return;
      await Promise.all([loadAcademicLookups(), loadAttendanceData()]);
    });
    return () => {
      active = false;
    };
  }, [canView, loadAcademicLookups, loadAttendanceData]);

  useEffect(() => {
    let active = true;
    const records = mode === 'staff' ? staffRecords : studentRecords;
    const recordMap = buildRecordMap(records, mode === 'staff' ? 'staffId' : 'studentId');
    const nextDrafts = {};
    roster.forEach((entity) => {
      const existing = recordMap.get(entity.id);
      nextDrafts[entity.id] = {
        status: existing?.status || 'present',
        remarks: existing?.remarks || '',
      };
    });
    queueMicrotask(() => {
      if (active) setDrafts(nextDrafts);
    });
    return () => {
      active = false;
    };
  }, [mode, roster, staffRecords, studentRecords]);

  useEffect(() => {
    if (classId && !classes.some((item) => item.id === classId)) {
      queueMicrotask(() => setClassId(''));
    }
  }, [classId, classes]);

  useEffect(() => {
    if (sectionId && !visibleSections.some((item) => item.id === sectionId)) {
      queueMicrotask(() => setSectionId(''));
    }
  }, [sectionId, visibleSections]);

  const updateDraft = (entityId, patch) => {
    setDrafts((current) => ({
      ...current,
      [entityId]: {
        status: current[entityId]?.status || 'present',
        remarks: current[entityId]?.remarks || '',
        ...patch,
      },
    }));
  };

  const setAllStatuses = (status) => {
    setDrafts(Object.fromEntries(roster.map((entity) => [entity.id, {
      status,
      remarks: drafts[entity.id]?.remarks || '',
    }])));
  };

  const saveAttendance = async () => {
    if (!canMark) {
      toast.error('You do not have permission to mark attendance.');
      return;
    }
    if (!date) {
      toast.error('Date is required.');
      return;
    }
    if (!roster.length) {
      toast.error('No roster records available to mark.');
      return;
    }
    setSaving(true);
    try {
      const entries = buildAttendanceEntries(roster, drafts, mode);
      if (mode === 'staff') {
        await markStaffAttendance({ date, entries });
      } else {
        await markStudentAttendance({
          date,
          academicYear: effectiveAcademicYear || null,
          classId: classId || null,
          sectionId: sectionId || null,
          entries,
        });
      }
      toast.success('Attendance saved');
      await loadAttendanceData();
    } catch (error) {
      toast.error(error?.message || 'Attendance was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async () => {
    if (!canReport) {
      toast.error('You do not have permission to view attendance reports.');
      return;
    }
    setReportLoading(true);
    try {
      if (reportType === 'daily') {
        if (!date) {
          toast.error('Date is required.');
          return;
        }
        const report = await getDailyAttendanceReport({ date, classId, sectionId });
        setDailyReport(report);
      } else if (reportType === 'monthly') {
        if (!fromDate || !toDate || !classId) {
          toast.error('From date, to date, and class are required.');
          return;
        }
        const report = await getMonthlyAttendanceReport({ from: fromDate, to: toDate, classId, sectionId });
        setMonthlyReport(report);
      } else {
        if (!selectedStudentId) {
          toast.error('Student is required.');
          return;
        }
        const report = await getStudentAttendancePercentage({ studentId: selectedStudentId, from: fromDate, to: toDate });
        setStudentPercentage(report);
      }
    } catch (error) {
      toast.error(error?.message || 'Attendance report could not be loaded.');
    } finally {
      setReportLoading(false);
    }
  };

  const studentRecordMap = useMemo(() => buildRecordMap(studentRecords, 'studentId'), [studentRecords]);
  const staffRecordMap = useMemo(() => buildRecordMap(staffRecords, 'staffId'), [staffRecords]);
  const activeRecordMap = mode === 'staff' ? staffRecordMap : studentRecordMap;

  if (!canView) {
    return (
      <div className="erp-attendance-page min-w-0">
        <section className="erp-glass-card rounded-2xl p-8 text-center">
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003434]">Attendance Management</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">You do not have permission to view attendance.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="erp-attendance-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-[#3f4848]">
            <span>Daily Work</span>
            <span>/</span>
            <span className="text-[#006a62]">Attendance</span>
          </div>
          <h1 className="font-['Montserrat'] text-3xl font-bold text-[#003434]">Attendance Management</h1>
          <p className="mt-2 text-sm text-[#3f4848]">Backend-backed student and staff attendance marking with reports.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadAttendanceData} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/40 px-4 text-sm font-bold text-[#004d4d]">
            <RefreshCcw size={17} /> Refresh
          </button>
          {canMark && (
            <button type="button" onClick={saveAttendance} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
              {saving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              Save Attendance
            </button>
          )}
        </div>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <SummaryCard label={mode === 'staff' ? 'Staff Roster' : 'Student Roster'} value={mode === 'staff' ? staffCount : studentCount} loading={loading} icon={<Users size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Present" value={entitySummary.present} loading={loading} icon={<BadgeCheck size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Late" value={entitySummary.late} loading={loading} icon={<CalendarDays size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Absent" value={entitySummary.absent} loading={loading} icon={<UserCheck size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Attendance %" value={`${entityPercentage}%`} loading={loading} icon={<BarChart3 size={18} className="text-[#006a62]" />} />
      </section>

      <section className="erp-glass-card mb-6 rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
            {[
              ['students', 'Student Attendance'],
              ['staff', 'Staff Attendance'],
              ['reports', 'Reports'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cx('h-11 rounded-xl px-4 text-sm font-bold', mode === value ? 'bg-[#004d4d] text-white' : 'bg-white/40 text-[#3f4848]')}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]" />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
            <select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={mode === 'staff'} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60">
              <option value="">All classes</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={mode === 'staff'} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60">
              <option value="">All sections</option>
              {visibleSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </label>
          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Search Roster</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 pl-10 pr-4 text-sm text-[#071e27] outline-none focus:border-[#006a62]" placeholder="Name, ID, phone, email" />
            </span>
          </label>
        </div>
      </section>

      {mode !== 'reports' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="erp-glass-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-white/35 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#003434]">{mode === 'staff' ? 'Staff Roster' : 'Student Roster'}</h2>
                <p className="mt-1 text-xs font-semibold text-[#3f4848]">Re-marking the same date updates the backend record.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ATTENDANCE_STATUSES.map((status) => (
                  <button key={status} type="button" onClick={() => setAllStatuses(status)} className={cx('h-8 rounded-lg border px-3 text-xs font-bold', statusClasses(status))}>
                    All {statusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-[#004d4d] text-left text-white">
                  <tr>
                    <th className="px-5 py-3">{mode === 'staff' ? 'Staff' : 'Student'}</th>
                    <th className="px-5 py-3">{mode === 'staff' ? 'Department' : 'Class'}</th>
                    <th className="px-5 py-3">Existing Record</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30">
                  {loading && (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]">
                        <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading roster...
                      </td>
                    </tr>
                  )}
                  {!loading && roster.map((entity) => {
                    const existing = activeRecordMap.get(entity.id);
                    return (
                      <tr key={entity.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#004d4d] text-xs font-bold text-white">
                              {initialsFor(entity.name)}
                            </div>
                            <div>
                              <p className="font-bold text-[#071e27]">{entity.name || '-'}</p>
                              <p className="mt-1 text-xs font-semibold text-[#3f4848]">{entityLabel(entity, mode)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[#3f4848]">{mode === 'staff' ? getDepartmentLabel(entity) : getClassLabel(entity)}</td>
                        <td className="px-5 py-4">
                          {existing ? (
                            <span className={cx('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(existing.status))}>{existing.status}</span>
                          ) : (
                            <span className="text-xs font-semibold text-[#3f4848]">Not marked</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {ATTENDANCE_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateDraft(entity.id, { status })}
                                disabled={!canMark}
                                className={cx(
                                  'h-8 rounded-lg border px-3 text-xs font-bold disabled:opacity-70',
                                  drafts[entity.id]?.status === status ? statusClasses(status) : 'border-white/40 bg-white/35 text-[#3f4848]'
                                )}
                              >
                                {statusLabel(status)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <input
                            value={drafts[entity.id]?.remarks || ''}
                            onChange={(event) => updateDraft(entity.id, { remarks: event.target.value })}
                            disabled={!canMark}
                            className="h-9 w-full min-w-40 rounded-lg border border-white/40 bg-white/45 px-3 text-xs text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-70"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !roster.length && (
                    <tr>
                      <td colSpan="5" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No roster records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="erp-glass-card rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase text-[#3f4848]">Selected Date</p>
              <h2 className="mt-1 text-lg font-bold text-[#003434]">{date}</h2>
              <div className="mt-5 space-y-3">
                {ATTENDANCE_STATUSES.map((status) => (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#3f4848]">{statusLabel(status)}</span>
                      <b className="text-[#071e27]">{entitySummary[status]}</b>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-white/40">
                      <div className="h-full rounded-full bg-[#006a62]" style={{ width: `${entitySummary.total ? Math.round((entitySummary[status] / entitySummary.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="erp-glass-card rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase text-[#3f4848]">Loaded Records</p>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {entityRecords.map((record) => (
                  <div key={record.id || `${record.date}-${record.studentId || record.staffId}`} className="rounded-xl border border-white/35 bg-white/35 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#071e27]">{record.studentName || record.staffName || record.studentId || record.staffId}</p>
                        <p className="mt-1 text-xs text-[#3f4848]">{record.date} | {record.remarks || 'No remarks'}</p>
                      </div>
                      <span className={cx('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase', statusClasses(record.status))}>{record.status}</span>
                    </div>
                  </div>
                ))}
                {!entityRecords.length && <EmptyState message="No attendance records loaded for this date." />}
              </div>
            </section>
          </aside>
        </div>
      ) : (
        <section className="erp-glass-card rounded-2xl p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#003434]">Attendance Reports</h2>
              <p className="mt-1 text-sm text-[#3f4848]">Student attendance report endpoints from the backend.</p>
            </div>
            <button type="button" onClick={loadReport} disabled={reportLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white disabled:bg-slate-300">
              {reportLoading ? <Loader2 className="animate-spin" size={16} /> : <ClipboardCheck size={16} />}
              Load Report
            </button>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-12">
            <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
              {[
                ['daily', 'Daily'],
                ['monthly', 'Monthly'],
                ['student', 'Student %'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReportType(value)}
                  className={cx('h-10 rounded-xl px-4 text-sm font-bold', reportType === value ? 'bg-[#004d4d] text-white' : 'bg-white/40 text-[#3f4848]')}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={reportType !== 'daily'} className="h-10 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60" />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">From</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} disabled={reportType === 'daily'} className="h-10 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60" />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">To</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} disabled={reportType === 'daily'} className="h-10 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60" />
            </label>
            <label className="lg:col-span-3">
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">{reportType === 'student' ? 'Student' : 'Class'}</span>
              {reportType === 'student' ? (
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="h-10 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">Select student</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name} - {entityLabel(student, 'students')}</option>)}
                </select>
              ) : (
                <select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={reportType === 'daily'} className="h-10 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] disabled:opacity-60">
                  <option value="">All classes</option>
                  {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
                </select>
              )}
            </label>
          </div>

          {reportType === 'daily' && dailyReport && (
            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/35 bg-white/35 p-5">
                <p className="text-[11px] font-bold uppercase text-[#3f4848]">Daily Summary</p>
                <h3 className="mt-1 text-xl font-bold text-[#003434]">{dailyReport.date}</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {ATTENDANCE_STATUSES.map((status) => (
                    <div key={status} className="rounded-xl bg-white/45 p-3">
                      <p className="text-xs font-bold uppercase text-[#3f4848]">{statusLabel(status)}</p>
                      <p className="mt-1 text-2xl font-bold text-[#003434]">{dailyReport.summary?.[status] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
              <ReportRecords records={dailyReport.records || []} />
            </div>
          )}

          {reportType === 'monthly' && monthlyReport && (
            <div className="overflow-x-auto rounded-2xl border border-white/35 bg-white/35">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#004d4d] text-left text-white">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Present</th>
                    <th className="px-5 py-3">Late</th>
                    <th className="px-5 py-3">Absent</th>
                    <th className="px-5 py-3">Leave</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlyReport.students || []).map((student) => (
                    <tr key={student.studentId}>
                      <td className="px-5 py-4 font-bold text-[#071e27]">{student.studentName || student.studentId}</td>
                      <td className="px-5 py-4">{student.present}</td>
                      <td className="px-5 py-4">{student.late}</td>
                      <td className="px-5 py-4">{student.absent}</td>
                      <td className="px-5 py-4">{student.leave}</td>
                      <td className="px-5 py-4">{student.total}</td>
                      <td className="px-5 py-4 font-bold text-[#006a62]">{student.percentage}%</td>
                    </tr>
                  ))}
                  {!monthlyReport.students?.length && (
                    <tr><td colSpan="7" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]">No monthly report rows found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'student' && studentPercentage && (
            <div className="grid gap-4 md:grid-cols-6">
              {[
                ['Student ID', studentPercentage.studentId],
                ['Present', studentPercentage.present],
                ['Late', studentPercentage.late],
                ['Absent', studentPercentage.absent],
                ['Leave', studentPercentage.leave],
                ['Percentage', `${studentPercentage.percentage}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/35 bg-white/35 p-5">
                  <p className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#003434]">{valueOrDash(value)}</p>
                </div>
              ))}
            </div>
          )}

          {reportType === 'daily' && !dailyReport && <EmptyState message="Load a daily report to see backend results." />}
          {reportType === 'monthly' && !monthlyReport && <EmptyState message="Load a monthly report to see backend results." />}
          {reportType === 'student' && !studentPercentage && <EmptyState message="Load a student percentage report to see backend results." />}
        </section>
      )}
    </div>
  );
}

function ReportRecords({ records }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/35 bg-white/35">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-[#004d4d] text-left text-white">
          <tr>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id || `${record.date}-${record.studentId}`}>
              <td className="px-5 py-4 font-bold text-[#071e27]">{record.studentName || record.studentId}</td>
              <td className="px-5 py-4 text-[#3f4848]">{record.date}</td>
              <td className="px-5 py-4">
                <span className={cx('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(record.status))}>{record.status}</span>
              </td>
              <td className="px-5 py-4 text-[#3f4848]">{record.remarks || '-'}</td>
            </tr>
          ))}
          {!records.length && (
            <tr><td colSpan="4" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]">No report records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
