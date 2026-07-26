import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, FileText, GraduationCap, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createExamSchedule,
  createInternalAssessment,
  createMarksEntry,
  createReportCard,
  createStudentResult,
  getExaminationResultData,
  updateExamSchedule,
  updateMarksEntry,
} from '../../firebase/db';
import { isFirebaseConfigured } from '../../firebase/config';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';
import { getClassOptions } from '../timetable/timetableUtils';
import { calculateGrade, calculatePercentage, calculateResultStatus, formatDisplayDate, summarizeStudentMarks, validateExamSchedule, validateMarksEntry } from './examUtils';
import ExamScheduleModal from './components/ExamScheduleModal';
import ExamScheduleTable from './components/ExamScheduleTable';
import MarksEntryModal from './components/MarksEntryModal';
import ResultsPanel from './components/ResultsPanel';
import { filterByCourse, filterStudentScopedRecords, filterStudentsByCourse } from '../shared/courseFilters';

function AssessmentModal({ schedules, onClose, onSave }) {
  const [form, setForm] = useState({
    examScheduleId: '',
    title: '',
    maxMarks: '',
    status: 'Active',
  });
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Assessment</h2>
            <p className="text-sm text-slate-500">Create an assessment from a live exam schedule.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Exam Schedule</span>
            <select value={form.examScheduleId} onChange={(event) => update('examScheduleId', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus>
              <option value="">Select schedule</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>{schedule.examName} - {schedule.subject}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Assessment Title</span>
            <input value={form.title} onChange={(event) => update('title', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Max Marks</span>
            <input type="number" min="1" value={form.maxMarks} onChange={(event) => update('maxMarks', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {['Active', 'Draft', 'Archived'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">Save Assessment</button>
        </div>
      </form>
    </div>
  );
}

function ResultNameModal({ onClose, onSave }) {
  const [resultName, setResultName] = useState('');

  const submit = (event) => {
    event.preventDefault();
    onSave(resultName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Generate Results</h2>
            <p className="text-sm text-slate-500">Name this result set before saving it to live data.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6">
          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Result Name</span>
            <input value={resultName} onChange={(event) => setResultName(event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">Generate</button>
        </div>
      </form>
    </div>
  );
}

export default function ExaminationResultManagement({
  currentUser,
  academicYear = '',
  initialBranch = '',
  initialTask = '',
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [, setAssessments] = useState([]);
  const [marks, setMarks] = useState([]);
  const [results, setResults] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [activeExamTask, setActiveExamTask] = useState(initialTask || '');
  const [activeExamBranch, setActiveExamBranch] = useState(initialBranch || '');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  useEffect(() => {
    const loadExams = async () => {
      if (!isFirebaseConfigured) {
        setLoadError('Live Firebase data is not configured.');
        return;
      }
      try {
        const data = await getExaminationResultData(academicYear);
        setStudents(data.students.filter((student) => student.status !== 'Archived'));
        setStaff(data.staff.filter((member) => member.staffType === 'Faculty' && member.status !== 'Archived'));
        setSchedules(data.examSchedules);
        setAssessments(data.assessments);
        setMarks(data.marks);
        setResults(data.results);
        setReportCards(data.reportCards);
        setLoadError('');
      } catch (error) {
        console.warn('Unable to load live exam data.', error);
        setLoadError('Unable to load live exam records.');
      }
    };
    loadExams();
  }, [academicYear]);

  useEffect(() => {
    const currentState = window.history.state || {};
    window.history.replaceState({
      ...currentState,
      examFlow: currentState.examFlow || { task: initialTask || '', branch: initialBranch || '' },
    }, '');

    const handleHistoryBack = (event) => {
      const flow = event.state?.examFlow;
      setShowScheduleModal(false);
      setShowMarksModal(false);
      setShowAssessmentModal(false);
      setShowResultModal(false);
      setEditingSchedule(null);
      if (!flow) {
        setActiveExamTask('');
        setActiveExamBranch('');
        setSelectedScheduleId('');
        return;
      }
      setActiveExamTask(flow.task || '');
      setActiveExamBranch(flow.branch || '');
      setSelectedScheduleId('');
      setSearch('');
    };

    window.addEventListener('popstate', handleHistoryBack);
    return () => window.removeEventListener('popstate', handleHistoryBack);
  }, [initialBranch, initialTask]);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canSchedule = canAccess(defaultRoles, currentRoleId, 'exams.schedule');
  const canAssess = canAccess(defaultRoles, currentRoleId, 'exams.assessments');
  const canEnterMarks = canAccess(defaultRoles, currentRoleId, 'exams.marks');
  const canGenerateResults = canAccess(defaultRoles, currentRoleId, 'exams.results');
  const canGenerateReportCards = canAccess(defaultRoles, currentRoleId, 'exams.reportCards');

  const courseStudents = scopedStudents.length ? scopedStudents : filterStudentsByCourse(students, selectedCourseCode, selectedCourse);
  const courseSchedules = filterByCourse(schedules, selectedCourseCode, selectedCourse);
  const courseScheduleIds = new Set(courseSchedules.map((item) => item.id).filter(Boolean));
  const courseMarks = filterStudentScopedRecords(marks, courseStudents, selectedCourseCode, selectedCourse)
    .filter((item) => selectedCourseCode === 'all' || !item.examScheduleId || courseScheduleIds.has(item.examScheduleId));
  const courseResults = filterStudentScopedRecords(results, courseStudents, selectedCourseCode, selectedCourse);
  const courseReportCards = filterStudentScopedRecords(reportCards, courseStudents, selectedCourseCode, selectedCourse);
  const classOptions = getClassOptions(courseStudents);
  const faculty = staff.filter((member) => member.staffType === 'Faculty');
  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return courseSchedules;
    return courseSchedules.filter((schedule) =>
      [schedule.examName, schedule.classKey, schedule.subject, schedule.facultyName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [courseSchedules, search]);

  const selectedSchedule = selectedScheduleId ? courseSchedules.find((schedule) => schedule.id === selectedScheduleId) || null : null;
  const selectedScheduleMarks = selectedSchedule
    ? courseMarks.filter((mark) => mark.examScheduleId === selectedSchedule.id)
    : [];
  const marksCompletion = courseSchedules.length && courseStudents.length
    ? Math.round((courseMarks.length / Math.max(1, courseSchedules.length * courseStudents.length)) * 100)
    : 0;
  const resultDistribution = [
    { label: 'Pass', value: courseResults.filter((item) => item.status === 'Pass').length, color: '#22c55e' },
    { label: 'Needs Improvement', value: courseResults.filter((item) => item.status === 'Needs Improvement').length, color: '#ef4444' },
    { label: 'Pending', value: Math.max(0, courseStudents.length - courseResults.length), color: '#f59e0b' },
  ];
  const maxResultValue = Math.max(...resultDistribution.map((item) => item.value), 1);

  const openExamTask = (taskId) => {
    setActiveExamTask(taskId);
    setActiveExamBranch('');
    setSelectedScheduleId('');
    setSearch('');
    window.history.pushState({ ...(window.history.state || {}), examFlow: { task: taskId, branch: '' } }, '');
  };

  const openExamBranch = (branch) => {
    setActiveExamBranch(branch.id);
    setSelectedScheduleId('');
    setSearch('');
    window.history.pushState({ ...(window.history.state || {}), examFlow: { task: activeExamTask, branch: branch.id } }, '');
    if (branch.openSchedule) setShowScheduleModal(true);
    if (branch.openMarks) setShowMarksModal(true);
  };

  const goBackOneExamStep = () => {
    const flow = window.history.state?.examFlow;
    if (flow?.branch || flow?.task) {
      window.history.back();
      return;
    }
    if (activeExamBranch) {
      setActiveExamBranch('');
      setSelectedScheduleId('');
      return;
    }
    setActiveExamTask('');
  };

  const examTaskOptions = [
    {
      id: 'schedules',
      title: 'Exam Schedules',
      description: 'Create and review exam schedules.',
      icon: <ClipboardList size={22} />,
      meta: [`${courseSchedules.length} schedules`, canSchedule ? 'Schedule enabled' : 'View only'],
    },
    {
      id: 'marks',
      title: 'Marks Entry',
      description: 'Enter and review student marks.',
      icon: <GraduationCap size={22} />,
      meta: [`${courseMarks.length} entries`, canEnterMarks ? 'Entry enabled' : 'View only'],
    },
    {
      id: 'results',
      title: 'Results & Cards',
      description: 'Generate results and report cards.',
      icon: <FileText size={22} />,
      meta: [`${courseResults.length} results`, `${courseReportCards.length} cards`],
    },
  ];

  const examBranchOptions = {
    schedules: [
      { id: 'create-schedule', title: 'Create Schedule', description: 'Open a new exam schedule form.', icon: <Plus size={20} />, disabled: !canSchedule, openSchedule: true },
      { id: 'review-schedules', title: 'Review Schedules', description: 'Select an exam schedule to view or edit.', icon: <ClipboardList size={20} /> },
    ],
    marks: [
      { id: 'enter-marks', title: 'Enter Marks', description: 'Open marks entry, or select a schedule first.', icon: <GraduationCap size={20} />, disabled: !canEnterMarks, openMarks: true },
      { id: 'review-marks', title: 'Review Marks', description: 'Select a schedule to review entered marks.', icon: <Search size={20} /> },
      { id: 'internal-assessment', title: 'Internal Assessment', description: 'Create an internal assessment from an exam schedule.', icon: <FileText size={20} />, disabled: !canAssess },
    ],
    results: [
      { id: 'generate-results', title: 'Generate Results', description: 'Generate combined student results.', icon: <FileText size={20} />, disabled: !canGenerateResults },
      { id: 'report-cards', title: 'Report Cards', description: 'Generate and review report cards.', icon: <FileText size={20} />, disabled: !canGenerateReportCards },
    ],
  };

  const activeTask = examTaskOptions.find((task) => task.id === activeExamTask);
  const activeBranches = examBranchOptions[activeExamTask] || [];
  const activeBranch = activeBranches.find((branch) => branch.id === activeExamBranch);
  const buildSchedulePayload = (form) => {
    const facultyMember = faculty.find((item) => item.id === form.facultyId);
    return {
      ...form,
      examName: form.examName.trim(),
      subject: form.subject.trim(),
      maxMarks: Number(form.maxMarks),
      durationMinutes: Number(form.durationMinutes || 0),
      roomNo: form.roomNo?.trim() || '',
      facultyName: facultyMember?.name || '',
      status: form.status || 'Scheduled',
    };
  };

  const saveSchedule = async (form) => {
    if (!canSchedule && !editingSchedule) {
      toast.error('You do not have permission to schedule exams.');
      return;
    }
    const validationMessage = validateExamSchedule(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    const payload = buildSchedulePayload(form);
    if (editingSchedule) {
      const updates = { ...payload, updatedAtText: formatDisplayDate() };
      try {
        await updateExamSchedule(editingSchedule.id, updates);
        setSchedules((prev) => prev.map((item) => item.id === editingSchedule.id ? { ...item, ...updates } : item));
        toast.success('Exam schedule updated');
      } catch (error) {
        console.error('Unable to update live exam schedule.', error);
        toast.error('Exam schedule was not saved to live data.');
      } finally {
        setEditingSchedule(null);
      }
      return;
    }
    const createPayload = { ...payload, academicYear, createdAtText: formatDisplayDate() };
    try {
      const id = await createExamSchedule(createPayload);
      if (!id) throw new Error('Live exam schedule was not created.');
      setSchedules((prev) => [{ id, ...createPayload }, ...prev]);
      toast.success('Exam scheduled');
    } catch (error) {
      console.error('Unable to create live exam schedule.', error);
      toast.error('Exam schedule was not saved to live data.');
    } finally {
      setShowScheduleModal(false);
    }
  };

  const createAssessment = async (form) => {
    if (!canAssess) {
      toast.error('You do not have permission to manage assessments.');
      return;
    }
    const base = courseSchedules.find((schedule) => schedule.id === form.examScheduleId);
    if (!base) {
      toast.error('Select a live exam schedule first.');
      return;
    }
    const maxMarks = Number(form.maxMarks || 0);
    if (!form.title?.trim()) {
      toast.error('Assessment title is required.');
      return;
    }
    if (maxMarks < 1) {
      toast.error('Max marks must be at least 1.');
      return;
    }
    const payload = {
      examScheduleId: base.id,
      title: form.title.trim(),
      classKey: base.classKey,
      subject: base.subject,
      maxMarks,
      status: form.status || 'Active',
      academicYear,
      createdAtText: formatDisplayDate(),
    };
    try {
      const id = await createInternalAssessment(payload);
      if (!id) throw new Error('Live assessment was not created.');
      setAssessments((prev) => [{ id, ...payload }, ...prev]);
      toast.success('Assessment created');
      setShowAssessmentModal(false);
    } catch (error) {
      console.error('Unable to create live assessment.', error);
      toast.error('Assessment was not saved to live data.');
    }
  };

  const saveMarks = async (form) => {
    if (!canEnterMarks) {
      toast.error('You do not have permission to enter marks.');
      return;
    }
    const schedule = courseSchedules.find((item) => item.id === form.examScheduleId);
    const student = courseStudents.find((item) => item.id === form.studentRecordId);
    const validationMessage = validateMarksEntry({ ...form, maxMarks: schedule?.maxMarks || form.maxMarks });
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    const percentage = calculatePercentage(form.marksObtained, schedule.maxMarks);
    const payload = {
      examScheduleId: schedule.id,
      studentRecordId: student.id,
      studentId: student.studentId,
      studentName: student.name,
      classKey: schedule.classKey,
      subject: schedule.subject,
      academicYear,
      marksObtained: Number(form.marksObtained),
      maxMarks: Number(schedule.maxMarks),
      percentage,
      grade: calculateGrade(percentage),
      status: 'Entered',
      enteredAtText: formatDisplayDate(),
    };
    const existing = courseMarks.find((item) => item.examScheduleId === payload.examScheduleId && item.studentRecordId === payload.studentRecordId);
    try {
      if (existing) {
        await updateMarksEntry(existing.id, payload);
        setMarks((prev) => prev.map((item) => item.id === existing.id ? { ...item, ...payload } : item));
      } else {
        const id = await createMarksEntry(payload);
        if (!id) throw new Error('Live marks entry was not created.');
        setMarks((prev) => [{ id, ...payload }, ...prev]);
      }
      toast.success('Marks saved');
    } catch (error) {
      console.error('Unable to save live marks.', error);
      toast.error('Marks were not saved to live data.');
    } finally {
      setShowMarksModal(false);
    }
  };

  const generateResults = async (resultName) => {
    if (!canGenerateResults) {
      toast.error('You do not have permission to generate results.');
      return;
    }
    const examName = resultName.trim();
    if (!examName) {
      toast.error('Result name is required.');
      return;
    }
    const generated = courseStudents.map((student) => {
      const studentMarks = courseMarks.filter((item) => item.studentRecordId === student.id);
      const summary = summarizeStudentMarks(studentMarks);
      return {
        studentRecordId: student.id,
        studentId: student.studentId,
        studentName: student.name,
        classKey: `${student.className} - ${student.section}`,
        examName,
        academicYear,
        ...summary,
        status: calculateResultStatus(summary.percentage),
        generatedAtText: formatDisplayDate(),
      };
    }).filter((item) => item.totalMax > 0);
    if (!generated.length) {
      toast.error('No marks are available for generating results.');
      return;
    }
    try {
      const ids = await Promise.all(generated.map((item) => createStudentResult(item)));
      if (ids.some((id) => !id)) throw new Error('One or more live results were not created.');
      setResults((prev) => [...generated.map((item, index) => ({ id: ids[index], ...item })), ...prev]);
      toast.success('Results generated');
      setShowResultModal(false);
    } catch (error) {
      console.error('Unable to generate live results.', error);
      toast.error('Results were not saved to live data.');
    }
  };

  const generateReportCards = async () => {
    if (!canGenerateReportCards) {
      toast.error('You do not have permission to generate report cards.');
      return;
    }
    const cards = courseResults.map((result) => ({
      studentRecordId: result.studentRecordId,
      studentId: result.studentId,
      examName: result.examName,
      academicYear,
      status: 'Generated',
      generatedAtText: formatDisplayDate(),
    }));
    try {
      const ids = await Promise.all(cards.map((item) => createReportCard(item)));
      if (ids.some((id) => !id)) throw new Error('One or more live report cards were not created.');
      setReportCards((prev) => [...cards.map((item, index) => ({ id: ids[index], ...item })), ...prev]);
      toast.success('Report cards generated');
    } catch (error) {
      console.error('Unable to generate live report cards.', error);
      toast.error('Report cards were not saved to live data.');
    }
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="text-sm font-bold text-slate-500 mb-2">Academics / <span className="text-[#f39a5f]">Examination & Result Management</span></div>
          <h1 className="text-2xl font-bold text-slate-900">Examination & Result Management</h1>
          <p className="text-sm text-slate-500 mt-1">Exam scheduling, internal assessment, marks entry, grade calculation, results, and report cards.</p>
          {!isFirebaseConfigured && <p className="text-xs text-rose-600 mt-2">Live Firebase data is not configured.</p>}
          {loadError && <p className="text-xs text-rose-600 mt-2">{loadError}</p>}
        </div>
      </div>

      {!activeExamTask ? (
      <>
      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 mb-5">
        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-slate-900">Exam Readiness</h2>
            <span className="rounded-full bg-[#f5f5f6] px-3 py-1 text-xs font-bold text-slate-600">{marksCompletion}% marks entered</span>
          </div>
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Schedules', courseSchedules.length],
              ['Marks Entries', courseMarks.length],
              ['Results', courseResults.length],
              ['Report Cards', courseReportCards.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#f5f5f6] p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {resultDistribution.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm"><span>{item.label}</span><b>{item.value}</b></div>
                <div className="mt-1 h-2 rounded-full bg-[#f5f5f6] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, (item.value / maxResultValue) * 100)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">Exam Desk Workflow</h2>
          <div className="space-y-3 text-sm">
            {['Schedule exams', 'Prepare halls and invigilation', 'Enter subject marks', 'Generate results and report cards'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-[#f5f5f6] p-3">
                <span className="h-7 w-7 rounded-full bg-white flex items-center justify-center font-bold text-[#fb8d49]">{index + 1}</span>
                <span className="font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {examTaskOptions.map((task) => (
          <button key={task.id} onClick={() => openExamTask(task.id)} className="group min-h-40 text-left rounded-lg border border-slate-100 bg-white p-5 shadow-sm hover:-translate-y-1 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#f5f5f6] text-[#34363d] flex items-center justify-center">{task.icon}</div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-[#fb8d49]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-5">{task.title}</h2>
            <p className="text-sm text-slate-500 mt-2">{task.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {task.meta.map((item) => (
                <span key={item} className="rounded-full bg-[#f5f5f6] px-3 py-1 text-xs font-semibold text-slate-600">{item}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
      </>
      ) : !activeExamBranch ? (
      <>
      <div className="erp-back-row my-5">
        <button onClick={goBackOneExamStep} className="erp-back-button h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-sm flex items-center gap-2">
          <ArrowLeft size={15} /> Back
        </button>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 rounded-lg bg-[#f5f5f6] p-4">
        <div>
          <div className="text-xs font-bold text-slate-500">Exams / <span className="text-[#fb8d49]">{activeTask?.title}</span></div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Choose next step</h2>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {activeBranches.map((branch) => (
          <button
            key={branch.id}
            onClick={() => openExamBranch(branch)}
            disabled={branch.disabled}
            className="group min-h-36 text-left rounded-lg border border-slate-100 bg-white p-5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="h-11 w-11 rounded-lg bg-[#f5f5f6] text-[#34363d] flex items-center justify-center">{branch.icon}</div>
              <ArrowRight size={17} className="text-slate-400 group-hover:text-[#fb8d49]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4">{branch.title}</h3>
            <p className="text-sm text-slate-500 mt-2">{branch.disabled ? 'Not available right now.' : branch.description}</p>
          </button>
        ))}
      </div>
      </>
      ) : (
      <>
      <div className="erp-back-row my-5">
        <button onClick={goBackOneExamStep} className="erp-back-button h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-sm flex items-center gap-2">
          <ArrowLeft size={15} /> Back
        </button>
      </div>
      <div className="erp-branch-focus flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 rounded-lg bg-[#f5f5f6] p-5 border border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="erp-branch-icon h-16 w-16 rounded-lg bg-white text-[#fb8d49] flex items-center justify-center shrink-0">{activeBranch?.icon}</div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900">{activeBranch?.title}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeExamBranch === 'create-schedule' && canSchedule && (
            <button onClick={() => setShowScheduleModal(true)} className="h-10 px-4 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm flex items-center gap-2"><Plus size={16} /> Open Form</button>
          )}
        </div>
      </div>

      {['generate-results', 'report-cards', 'internal-assessment'].includes(activeExamBranch) ? (
        <div className="max-w-3xl">
          <ResultsPanel marks={courseMarks} results={courseResults} reportCards={courseReportCards} />
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {activeExamBranch === 'internal-assessment' && (
              <button onClick={() => setShowAssessmentModal(true)} disabled={!canAssess} className="h-11 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Create Assessment</button>
            )}
            {activeExamBranch === 'generate-results' && (
              <button onClick={() => setShowResultModal(true)} disabled={!canGenerateResults} className="h-11 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Generate Results</button>
            )}
            {activeExamBranch === 'report-cards' && (
              <button onClick={generateReportCards} disabled={!canGenerateReportCards} className="h-11 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Generate Report Cards</button>
            )}
          </div>
        </div>
      ) : (
      <div className="flex flex-col xl:flex-row gap-5">
        <div className="xl:w-[68%] min-w-0">
          <div className="relative mb-4">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exams, classes, subjects, faculty..." className="w-full h-11 rounded-lg bg-[#f0f0f2] border-0 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
          </div>
          <ExamScheduleTable schedules={filteredSchedules} canEdit={canSchedule} showActions={false} selectedId={selectedScheduleId} onSelect={setSelectedScheduleId} onEdit={setEditingSchedule} />
        </div>
        <aside className="xl:w-[32%] erp-sticky-inspector">
          {selectedSchedule ? (
            <div className="erp-selected-detail bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">{selectedSchedule.examName}</h3>
              <p className="text-xs text-slate-500 mt-1">{selectedSchedule.classKey} | {selectedSchedule.subject}</p>
              <div className="grid grid-cols-2 gap-3 text-sm mt-5">
                <div className="rounded-lg bg-[#f5f5f6] p-3"><div className="text-xs text-slate-500">Date</div><b>{selectedSchedule.examDate}</b></div>
                <div className="rounded-lg bg-[#f5f5f6] p-3"><div className="text-xs text-slate-500">Max Marks</div><b>{selectedSchedule.maxMarks}</b></div>
                <div className="rounded-lg bg-[#f5f5f6] p-3"><div className="text-xs text-slate-500">Faculty</div><b>{selectedSchedule.facultyName || '-'}</b></div>
                <div className="rounded-lg bg-[#f5f5f6] p-3"><div className="text-xs text-slate-500">Marks</div><b>{selectedScheduleMarks.length}</b></div>
              </div>
              {activeExamBranch === 'review-schedules' && (
                <button onClick={() => setEditingSchedule(selectedSchedule)} disabled={!canSchedule} className="mt-5 w-full h-10 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Edit Schedule</button>
              )}
              {activeExamBranch === 'review-marks' && (
                <button onClick={() => setShowMarksModal(true)} disabled={!canEnterMarks} className="mt-5 w-full h-10 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Enter Marks</button>
              )}
              {activeExamBranch === 'enter-marks' && (
                <button onClick={() => setShowMarksModal(true)} disabled={!canEnterMarks} className="mt-5 w-full h-10 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm disabled:bg-slate-300">Open Marks Entry</button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-sm text-sm text-slate-600 min-h-72 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-lg bg-[#f5f5f6] text-[#fb8d49] flex items-center justify-center mb-4">{activeBranch?.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2">Exam Details</h3>
              <p>{filteredSchedules.length ? 'Click an exam schedule row to view details and available actions.' : 'No matching exam schedules found.'}</p>
            </div>
          )}
        </aside>
      </div>
      )}
      </>
      )}

      {showScheduleModal && <ExamScheduleModal classOptions={classOptions} faculty={faculty} onClose={() => setShowScheduleModal(false)} onSave={saveSchedule} />}
      {editingSchedule && <ExamScheduleModal mode="edit" initialSchedule={editingSchedule} classOptions={classOptions} faculty={faculty} onClose={() => setEditingSchedule(null)} onSave={saveSchedule} />}
      {showMarksModal && <MarksEntryModal schedules={courseSchedules} students={courseStudents} onClose={() => setShowMarksModal(false)} onSave={saveMarks} />}
      {showAssessmentModal && <AssessmentModal schedules={courseSchedules} onClose={() => setShowAssessmentModal(false)} onSave={createAssessment} />}
      {showResultModal && <ResultNameModal onClose={() => setShowResultModal(false)} onSave={generateResults} />}
    </div>
  );
}
