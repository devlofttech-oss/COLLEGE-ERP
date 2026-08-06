import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  Settings2,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import { listExamSchedules, listExams } from '../../api/examinations';
import {
  getReportCard,
  getResultHistory,
  listGradeSettings,
  listResults,
  lockResults,
  processResults,
  publishResults,
  reportCardPdfUrl,
  saveGradeSettings,
  unlockResults,
} from '../../api/results';
import { listStudents } from '../../api/students';
import {
  DEFAULT_GRADE_BANDS,
  formatPercentage,
  normalizeGradeBands,
  resultStatusClasses,
  validateGradeSettings,
  validateResultSelection,
} from './resultsUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const TABS = [
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'grade-settings', label: 'Grade Settings', icon: Settings2 },
  { id: 'report-card', label: 'Report Card', icon: FileText },
];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function activeItems(items = []) {
  return items.filter((item) => !item.archived && String(item.status || 'active').toLowerCase() !== 'inactive');
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') {
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleDateString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
  return String(value);
}

function classLabel(klass = {}) {
  return [klass.name, klass.courseName].filter(Boolean).join(' - ') || klass.id;
}

function examLabel(exam = {}) {
  return [exam.name, exam.examType].filter(Boolean).join(' - ') || exam.id;
}

function studentLabel(student = {}) {
  return [student.name, student.admissionNumber || student.rollNumber || student.id].filter(Boolean).join(' - ');
}

function scheduleLabel(schedule = {}) {
  return [
    schedule.examName,
    schedule.className,
    schedule.subjectName,
    formatDate(schedule.examDate),
  ].filter((item) => item && item !== '-').join(' | ') || schedule.id;
}

async function optionalLoad(loader, fallback) {
  try {
    return await loader();
  } catch (error) {
    console.warn('Optional results support data did not load.', error);
    return fallback;
  }
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="tt-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? '-' : value}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function ToggleBadge({ label, tone }) {
  const classes = tone === 'yes'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
  return <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', classes)}>{label}</span>;
}

function SelectionPanel({
  canProcess,
  canPublish,
  classes,
  exams,
  loading,
  onLock,
  onProcess,
  onPublish,
  onRefresh,
  onUnlock,
  schedules,
  selectedClassId,
  selectedExamId,
  setSelectedClassId,
  setSelectedExamId,
  saving,
}) {
  const selectionReady = Boolean(selectedExamId && selectedClassId);
  const selectedSchedule = schedules.find((schedule) => schedule.examId === selectedExamId && schedule.classId === selectedClassId);

  return (
    <section className="tt-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Result Processing</h2>
        <button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-bold text-brand-700">
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-4">
        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">Exam *</span>
          <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
            <option value="">Select exam</option>
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{examLabel(exam)}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">Class *</span>
          <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
            <option value="">Select class</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
          </select>
        </label>
        <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          <p className="text-xs font-bold uppercase">Matching Schedule</p>
          <p className="mt-2 text-slate-900">{selectedSchedule ? scheduleLabel(selectedSchedule) : 'No schedule selected from this exam/class.'}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {canProcess && (
            <button type="button" onClick={onProcess} disabled={!selectionReady || loading || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Process
            </button>
          )}
          {canPublish && (
            <>
              <button type="button" onClick={onPublish} disabled={!selectionReady || loading || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white">
                <BadgeCheck size={14} /> Publish
              </button>
              <button type="button" onClick={onLock} disabled={!selectionReady || loading || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700">
                <Lock size={14} /> Lock
              </button>
              <button type="button" onClick={onUnlock} disabled={!selectionReady || loading || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700">
                <Unlock size={14} /> Unlock
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultsTable({ loading, onOpenReportCard, results }) {
  return (
    <section className="tt-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Processed Results</h2>
        <span className="text-xs font-bold uppercase text-slate-500">{results.length} listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Marks</th>
              <th className="px-5 py-3">Percentage</th>
              <th className="px-5 py-3">Grade</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Published</th>
              <th className="px-5 py-3">Locked</th>
              <th className="px-5 py-3 text-right">Report Card</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="9" className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading results...</td></tr>}
            {!loading && results.map((result) => (
              <tr key={result.id || `${result.examId}-${result.studentId}`}>
                <td className="px-5 py-4 font-bold text-slate-900">{valueOrDash(result.rank)}</td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-900">{valueOrDash(result.studentName)}</p>
                  <p className="text-xs text-slate-500">{valueOrDash(result.studentId)}</p>
                </td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(result.marksObtained)} / {valueOrDash(result.totalMarks)}</td>
                <td className="px-5 py-4 font-bold text-slate-900">{formatPercentage(result.percentage)}</td>
                <td className="px-5 py-4 font-bold text-slate-900">{valueOrDash(result.grade)}</td>
                <td className="px-5 py-4">
                  <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', resultStatusClasses(result.status))}>{valueOrDash(result.status)}</span>
                </td>
                <td className="px-5 py-4"><ToggleBadge label={result.published ? 'Yes' : 'No'} tone={result.published ? 'yes' : 'no'} /></td>
                <td className="px-5 py-4"><ToggleBadge label={result.locked ? 'Yes' : 'No'} tone={result.locked ? 'yes' : 'no'} /></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => onOpenReportCard(result)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700">
                      <Eye size={13} /> Open
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !results.length && <tr><td colSpan="9" className="px-5 py-12"><EmptyState message="No processed results found for this selection." /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GradeSettingsPanel({ academicYear, canProcess, gradeDraft, onAddBand, onRemoveBand, onSave, onUpdateBand, onUpdateDraft, saving }) {
  return (
    <section className="tt-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Grade Settings</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Used by backend result processing.</p>
        </div>
        {canProcess && (
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-bold text-white">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save Settings
          </button>
        )}
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Academic Year *</span>
            <input value={gradeDraft.academicYear} onChange={(event) => onUpdateDraft('academicYear', event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900" placeholder={academicYear} />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Pass Mark</span>
            <input type="number" min="0" max="100" value={gradeDraft.passMark} onChange={(event) => onUpdateDraft('passMark', event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Minimum %</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {gradeDraft.bands.map((band, index) => (
                <tr key={`${band.grade}-${index}`}>
                  <td className="px-5 py-4">
                    <input value={band.grade} onChange={(event) => onUpdateBand(index, 'grade', event.target.value)} className="h-10 w-28 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm outline-none focus:border-brand-500 font-bold text-slate-900" />
                  </td>
                  <td className="px-5 py-4">
                    <input type="number" min="0" max="100" value={band.min} onChange={(event) => onUpdateBand(index, 'min', event.target.value)} className="h-10 w-28 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm outline-none focus:border-brand-500 text-slate-900" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button type="button" onClick={() => onRemoveBand(index)} disabled={!canProcess || gradeDraft.bands.length <= 1} className="h-8 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {canProcess && (
            <button type="button" onClick={onAddBand} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-bold text-brand-700">
              <ClipboardList size={14} /> Add Band
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportCardPanel({
  canView,
  history,
  loading,
  onLoadReportCard,
  reportCard,
  results,
  selectedReportStudentId,
  setSelectedReportStudentId,
  students,
}) {
  const selectedResult = results.find((result) => result.studentId === selectedReportStudentId);
  const selectedStudent = students.find((student) => student.id === selectedReportStudentId);
  const pdfHref = reportCard?.examId && reportCard?.studentId
    ? reportCardPdfUrl({ examId: reportCard.examId, studentId: reportCard.studentId })
    : '';

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section className="tt-card p-5">
        <h2 className="text-sm font-bold text-slate-900">Report Card Lookup</h2>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">Student *</span>
          <select value={selectedReportStudentId} onChange={(event) => setSelectedReportStudentId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
            <option value="">Select student</option>
            {results.map((result) => <option key={result.studentId} value={result.studentId}>{result.studentName || result.studentId}</option>)}
            {!results.length && students.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
          </select>
        </label>
        <button type="button" onClick={onLoadReportCard} disabled={!canView || !selectedReportStudentId || loading} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-bold text-white">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Load
        </button>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          <p className="text-xs font-bold uppercase">Selected</p>
          <p className="mt-2 text-slate-900">{selectedResult?.studentName || studentLabel(selectedStudent) || '-'}</p>
        </div>
      </section>
      <section className="tt-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-slate-900">Report Card</h2>
          {pdfHref && (
            <a href={pdfHref} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-bold text-white">
              <Download size={14} /> PDF
            </a>
          )}
        </div>
        {!reportCard ? (
          <div className="mt-5"><EmptyState message="Load a report card to view backend data." /></div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard icon={<GraduationCap size={18} className="text-brand-500" />} label="Student" loading={false} value={reportCard.studentName || reportCard.studentId} />
              <SummaryCard icon={<BarChart3 size={18} className="text-brand-500" />} label="Percentage" loading={false} value={formatPercentage(reportCard.percentage)} />
              <SummaryCard icon={<BadgeCheck size={18} className="text-brand-500" />} label="Grade" loading={false} value={reportCard.grade || '-'} />
              <SummaryCard icon={<ClipboardList size={18} className="text-brand-500" />} label="Rank" loading={false} value={reportCard.rank || '-'} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Marks</th>
                    <th className="px-5 py-3">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportCard.subjects || []).map((subject) => (
                    <tr key={subject.subjectId || subject.subjectName}>
                      <td className="px-5 py-4 font-bold text-slate-900">{valueOrDash(subject.subjectName || subject.subjectId)}</td>
                      <td className="px-5 py-4 text-slate-500">{valueOrDash(subject.marksObtained)} / {valueOrDash(subject.maxMarks)}</td>
                      <td className="px-5 py-4"><ToggleBadge label={subject.absent ? 'Yes' : 'No'} tone={subject.absent ? 'no' : 'yes'} /></td>
                    </tr>
                  ))}
                  {!reportCard.subjects?.length && <tr><td colSpan="3" className="px-5 py-8 text-center text-sm font-semibold text-slate-500">No subject marks found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">History</h3>
              <div className="grid gap-2">
                {history.map((item) => (
                  <div key={item.id || `${item.examId}-${item.rank}`} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm">
                    <span className="font-bold text-slate-900">{valueOrDash(item.examId)}</span>
                    <span className="text-slate-500">{formatPercentage(item.percentage)} | {item.grade} | Rank {valueOrDash(item.rank)}</span>
                  </div>
                ))}
                {!history.length && <p className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm font-semibold text-slate-500">No result history found.</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ResultsManagement({
  academicYear = '',
  currentUser,
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [activeTab, setActiveTab] = useState('results');
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [gradeDraft, setGradeDraft] = useState({ academicYear: academicYear || '', passMark: 35, bands: DEFAULT_GRADE_BANDS });
  const [reportCard, setReportCard] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedReportStudentId, setSelectedReportStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'results.view') || hasPermission(currentUser, 'results.viewOwn');
  const canProcess = hasPermission(currentUser, 'results.process');
  const canPublish = hasPermission(currentUser, 'results.publish');
  const effectiveAcademicYear = academicYear || selectedCourse?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || (selectedCourseCode !== 'all' ? selectedCourseCode : '');

  const loadResultsData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextExams, nextSchedules, nextSettings] = await Promise.all([
        listExams({ academicYear: effectiveAcademicYear }),
        listExamSchedules(),
        listGradeSettings({ academicYear: effectiveAcademicYear }),
      ]);
      const classParams = { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' };
      const [nextClasses, nextStudents] = await Promise.all([
        optionalLoad(() => listAcademicResource('classes', classParams), []),
        scopedStudents.length
          ? Promise.resolve({ students: scopedStudents, count: scopedStudents.length })
          : optionalLoad(() => listStudents({ academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' }), { students: [], count: 0 }),
      ]);
      const settings = nextSettings[0] || {};
      setExams(nextExams);
      setSchedules(nextSchedules);
      setClasses(activeItems(nextClasses));
      setStudents(activeItems(nextStudents.students || []));
      setGradeDraft({
        academicYear: settings.academicYear || effectiveAcademicYear || '',
        passMark: settings.passMark ?? 35,
        bands: normalizeGradeBands(settings.bands),
      });
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend result data.', error);
      setLoadError(error?.message || 'Unable to load results from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, effectiveAcademicYear, effectiveCourseId, scopedStudents]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadResultsData();
    });
    return () => {
      active = false;
    };
  }, [loadResultsData]);

  const effectiveExamId = useMemo(() => (
    selectedExamId && exams.some((exam) => exam.id === selectedExamId) ? selectedExamId : exams[0]?.id || ''
  ), [exams, selectedExamId]);
  const effectiveClassId = useMemo(() => (
    selectedClassId && classes.some((klass) => klass.id === selectedClassId) ? selectedClassId : classes[0]?.id || ''
  ), [classes, selectedClassId]);

  const enrichedSchedules = useMemo(() => schedules.map((schedule) => {
    const exam = exams.find((item) => item.id === schedule.examId);
    const klass = classes.find((item) => item.id === schedule.classId);
    return {
      ...schedule,
      examName: schedule.examName || exam?.name || schedule.examId,
      className: schedule.className || (klass ? classLabel(klass) : schedule.classId),
    };
  }), [classes, exams, schedules]);

  const loadFilteredResults = useCallback(async () => {
    if (!canView || !effectiveExamId || !effectiveClassId) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const nextResults = await listResults({
        examId: effectiveExamId,
        classId: effectiveClassId,
        status: statusFilter,
        published: publishedFilter,
      });
      setResults(nextResults);
      setLoadError('');
    } catch (error) {
      console.error('Unable to load processed results.', error);
      setLoadError(error?.message || 'Unable to load processed results.');
    } finally {
      setLoading(false);
    }
  }, [canView, effectiveClassId, effectiveExamId, publishedFilter, statusFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadFilteredResults();
    });
    return () => {
      active = false;
    };
  }, [loadFilteredResults]);

  const classStudents = useMemo(() => students.filter((student) => {
    if (!effectiveClassId) return true;
    const selectedClass = classes.find((klass) => klass.id === effectiveClassId);
    return student.classId === effectiveClassId || (selectedClass?.name && student.className === selectedClass.name);
  }), [classes, effectiveClassId, students]);

  const visibleResults = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return results;
    return results.filter((result) => [
      result.studentName,
      result.studentId,
      result.grade,
      result.status,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [results, search]);

  const passCount = results.filter((result) => result.status === 'Pass').length;
  const publishedCount = results.filter((result) => result.published).length;
  const lockedCount = results.filter((result) => result.locked).length;
  const averagePercentage = results.length
    ? Math.round((results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length) * 100) / 100
    : 0;

  const processCurrentResults = async () => {
    const validationMessage = validateResultSelection({ examId: effectiveExamId, classId: effectiveClassId });
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    if (!canProcess) {
      toast.error('You do not have permission to process results.');
      return;
    }
    setSaving('process');
    try {
      const result = await processResults({ examId: effectiveExamId, classId: effectiveClassId, academicYear: effectiveAcademicYear || undefined });
      toast.success(`${result.processed || 0} result${result.processed === 1 ? '' : 's'} processed`);
      await loadFilteredResults();
    } catch (error) {
      toast.error(error?.message || 'Results were not processed.');
    } finally {
      setSaving('');
    }
  };

  const publishCurrentResults = async () => {
    if (!canPublish) {
      toast.error('You do not have permission to publish results.');
      return;
    }
    setSaving('publish');
    try {
      const result = await publishResults({ examId: effectiveExamId, classId: effectiveClassId });
      toast.success(`${result.published || 0} result${result.published === 1 ? '' : 's'} published`);
      await loadFilteredResults();
    } catch (error) {
      toast.error(error?.message || 'Results were not published.');
    } finally {
      setSaving('');
    }
  };

  const lockCurrentResults = async (locked) => {
    if (!canPublish) {
      toast.error('You do not have permission to lock results.');
      return;
    }
    setSaving(locked ? 'lock' : 'unlock');
    try {
      const result = await (locked ? lockResults : unlockResults)({ examId: effectiveExamId, classId: effectiveClassId });
      toast.success(`${result.count || 0} result${result.count === 1 ? '' : 's'} ${locked ? 'locked' : 'unlocked'}`);
      await loadFilteredResults();
    } catch (error) {
      toast.error(error?.message || `Results were not ${locked ? 'locked' : 'unlocked'}.`);
    } finally {
      setSaving('');
    }
  };

  const updateGradeDraft = (key, value) => setGradeDraft((current) => ({ ...current, [key]: value }));
  const updateBand = (index, key, value) => setGradeDraft((current) => ({
    ...current,
    bands: current.bands.map((band, bandIndex) => (bandIndex === index ? { ...band, [key]: value } : band)),
  }));
  const addBand = () => setGradeDraft((current) => ({ ...current, bands: [...current.bands, { grade: '', min: 0 }] }));
  const removeBand = (index) => setGradeDraft((current) => ({ ...current, bands: current.bands.filter((_, bandIndex) => bandIndex !== index) }));

  const saveCurrentGradeSettings = async () => {
    if (!canProcess) {
      toast.error('You do not have permission to manage grade settings.');
      return;
    }
    const payload = {
      academicYear: gradeDraft.academicYear.trim(),
      passMark: Number(gradeDraft.passMark),
      bands: normalizeGradeBands(gradeDraft.bands),
    };
    const validationMessage = validateGradeSettings(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setSaving('grade-settings');
    try {
      const saved = await saveGradeSettings(payload);
      setGradeDraft({
        academicYear: saved.academicYear || payload.academicYear,
        passMark: saved.passMark ?? payload.passMark,
        bands: normalizeGradeBands(saved.bands),
      });
      toast.success('Grade settings saved');
    } catch (error) {
      toast.error(error?.message || 'Grade settings were not saved.');
    } finally {
      setSaving('');
    }
  };

  const openReportCard = (result) => {
    setSelectedReportStudentId(result.studentId);
    setActiveTab('report-card');
  };

  const loadReportCard = async () => {
    if (!selectedReportStudentId || !effectiveExamId) {
      toast.error('Exam and student are required.');
      return;
    }
    setReportLoading(true);
    try {
      const [nextReportCard, nextHistory] = await Promise.all([
        getReportCard({ examId: effectiveExamId, studentId: selectedReportStudentId }),
        getResultHistory(selectedReportStudentId),
      ]);
      setReportCard(nextReportCard);
      setHistory(nextHistory);
      toast.success('Report card loaded');
    } catch (error) {
      toast.error(error?.message || 'Report card was not loaded.');
    } finally {
      setReportLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="min-w-0">
        <EmptyState message="You do not have permission to view results." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results &amp; Grading</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-[#f8f9fa] pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 sm:w-72" placeholder="Search results" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500">
            <option value="">All status</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          <select value={publishedFilter} onChange={(event) => setPublishedFilter(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500">
            <option value="">All publish states</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<GraduationCap size={20} className="text-brand-500" />} label="Results" loading={loading} value={results.length} />
        <SummaryCard icon={<CheckCircle2 size={20} className="text-brand-500" />} label="Passed" loading={loading} value={passCount} />
        <SummaryCard icon={<BadgeCheck size={20} className="text-brand-500" />} label="Published" loading={loading} value={publishedCount} />
        <SummaryCard icon={<BarChart3 size={20} className="text-brand-500" />} label="Average" loading={loading} value={formatPercentage(averagePercentage)} />
      </div>

      <div className="my-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition',
                activeTab === tab.id ? 'bg-brand-700 text-white shadow-[0_12px_28px_rgba(0,77,77,.18)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'results' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <SelectionPanel
            canProcess={canProcess}
            canPublish={canPublish}
            classes={classes}
            exams={exams}
            loading={loading}
            onLock={() => lockCurrentResults(true)}
            onProcess={processCurrentResults}
            onPublish={publishCurrentResults}
            onRefresh={() => {
              loadResultsData();
              loadFilteredResults();
            }}
            onUnlock={() => lockCurrentResults(false)}
            schedules={enrichedSchedules}
            selectedClassId={effectiveClassId}
            selectedExamId={effectiveExamId}
            setSelectedClassId={setSelectedClassId}
            setSelectedExamId={setSelectedExamId}
            saving={Boolean(saving)}
          />
          <ResultsTable loading={loading} onOpenReportCard={openReportCard} results={visibleResults} />
        </div>
      )}

      {activeTab === 'grade-settings' && (
        <GradeSettingsPanel
          academicYear={effectiveAcademicYear}
          canProcess={canProcess}
          gradeDraft={gradeDraft}
          onAddBand={addBand}
          onRemoveBand={removeBand}
          onSave={saveCurrentGradeSettings}
          onUpdateBand={updateBand}
          onUpdateDraft={updateGradeDraft}
          saving={saving === 'grade-settings'}
        />
      )}

      {activeTab === 'report-card' && (
        <ReportCardPanel
          canView={canView}
          history={history}
          loading={reportLoading}
          onLoadReportCard={loadReportCard}
          reportCard={reportCard}
          results={results}
          selectedReportStudentId={selectedReportStudentId}
          setSelectedReportStudentId={setSelectedReportStudentId}
          students={classStudents}
        />
      )}

      {lockedCount > 0 && activeTab === 'results' && (
        <p className="mt-4 text-xs font-semibold text-slate-500">{lockedCount} listed result{lockedCount === 1 ? '' : 's'} currently locked.</p>
      )}
    </div>
  );
}
