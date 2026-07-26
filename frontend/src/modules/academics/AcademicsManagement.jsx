import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAcademicBatch, createAcademicProgram, createAcademicSubject, getAcademicsData } from '../../firebase/db';
import { isFirebaseConfigured } from '../../firebase/config';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';
import StatusBadge from '../students/components/StatusBadge';
import { filterAcademicItems, formatDisplayDate, validateBatch, validateProgram, validateSubject } from './academicUtils';
import { filterByCourse } from '../shared/courseFilters';

const tabs = [
  ['programs', 'Programs'],
  ['subjects', 'Subjects'],
  ['batches', 'Batches'],
];

function AcademicRecordModal({ activeTab, academicYear, programs, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    subjectName: '',
    subjectCode: '',
    programName: '',
    creditHours: '',
    className: '',
    section: '',
    classTeacher: '',
    capacity: '',
    status: 'Active',
  });
  const label = tabs.find(([id]) => id === activeTab)?.[1].slice(0, -1) || 'Record';
  const programOptions = [...new Set(programs.map((program) => program.name).filter(Boolean))];
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
            <h2 className="text-lg font-bold text-slate-900">New {label}</h2>
            <p className="text-sm text-slate-500">Save a live academic record for {academicYear}.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          {activeTab === 'programs' && (
            <>
              <label className="sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Program Name</span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Program Code</span>
                <input value={form.code} onChange={(event) => update('code', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
            </>
          )}

          {activeTab === 'subjects' && (
            <>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Subject Name</span>
                <input value={form.subjectName} onChange={(event) => update('subjectName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Subject Code</span>
                <input value={form.subjectCode} onChange={(event) => update('subjectCode', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Program</span>
                <input list="academic-program-options" value={form.programName} onChange={(event) => update('programName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Credit Hours</span>
                <input type="number" min="0" value={form.creditHours} onChange={(event) => update('creditHours', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
            </>
          )}

          {activeTab === 'batches' && (
            <>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Class Name</span>
                <input value={form.className} onChange={(event) => update('className', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Section</span>
                <input value={form.section} onChange={(event) => update('section', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Program</span>
                <input list="academic-program-options" value={form.programName} onChange={(event) => update('programName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Class Teacher</span>
                <input value={form.classTeacher} onChange={(event) => update('classTeacher', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Capacity</span>
                <input type="number" min="0" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
            </>
          )}

          <label>
            <span className="block text-xs font-semibold text-slate-500 mb-1.5">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {['Active', 'Inactive'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <datalist id="academic-program-options">
            {programOptions.map((item) => <option key={item} value={item} />)}
          </datalist>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">Save {label}</button>
        </div>
      </form>
    </div>
  );
}

export default function AcademicsManagement({ currentUser, academicYear = '', selectedCourse = null, selectedCourseCode = 'all' }) {
  const [programs, setPrograms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('programs');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);

  useEffect(() => {
    const loadAcademics = async () => {
      if (!isFirebaseConfigured) {
        setLoadError('Live Firebase data is not configured.');
        return;
      }
      try {
        const data = await getAcademicsData(academicYear);
        setPrograms(data.academicPrograms);
        setSubjects(data.academicSubjects);
        setBatches(data.academicBatches);
        setLoadError('');
      } catch (error) {
        console.warn('Unable to load live academic data.', error);
        setLoadError('Unable to load live academic records.');
      }
    };
    loadAcademics();
  }, [academicYear]);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canManage = canAccess(defaultRoles, currentRoleId, 'academics.manage');
  const activeRows = useMemo(() => {
    const map = {
      programs: filterByCourse(programs, selectedCourseCode, selectedCourse),
      subjects: filterByCourse(subjects, selectedCourseCode, selectedCourse),
      batches: filterByCourse(batches, selectedCourseCode, selectedCourse),
    };
    return filterAcademicItems(map[activeTab] || [], search);
  }, [activeTab, batches, programs, search, selectedCourse, selectedCourseCode, subjects]);

  const saveAcademicRecord = async (form) => {
    if (!canManage) {
      toast.error('You do not have permission to manage academics.');
      return;
    }
    const createdAtText = formatDisplayDate();
    const courseFields = {
      courseCode: selectedCourseCode === 'all' ? '' : selectedCourseCode,
      courseName: selectedCourse?.courseName || selectedCourse?.name || '',
    };
    try {
      if (activeTab === 'programs') {
        const payload = {
          name: form.name.trim(),
          code: form.code.trim(),
          academicYear,
          status: form.status || 'Active',
          createdAtText,
          ...courseFields,
        };
        const message = validateProgram(payload);
        if (message) return toast.error(message);
        const id = await createAcademicProgram(payload);
        if (!id) throw new Error('Live academic program was not created.');
        setPrograms((prev) => [{ id, ...payload }, ...prev]);
      } else if (activeTab === 'subjects') {
        const payload = {
          subjectName: form.subjectName.trim(),
          subjectCode: form.subjectCode.trim(),
          programName: form.programName.trim(),
          creditHours: form.creditHours === '' ? '' : Number(form.creditHours),
          academicYear,
          status: form.status || 'Active',
          createdAtText,
          ...courseFields,
        };
        const message = validateSubject(payload);
        if (message) return toast.error(message);
        const id = await createAcademicSubject(payload);
        if (!id) throw new Error('Live academic subject was not created.');
        setSubjects((prev) => [{ id, ...payload }, ...prev]);
      } else if (activeTab === 'batches') {
        const payload = {
          className: form.className.trim(),
          section: form.section.trim(),
          programName: form.programName.trim(),
          classTeacher: form.classTeacher.trim(),
          capacity: form.capacity === '' ? '' : Number(form.capacity),
          academicYear,
          status: form.status || 'Active',
          createdAtText,
          ...courseFields,
        };
        const message = validateBatch(payload);
        if (message) return toast.error(message);
        const id = await createAcademicBatch(payload);
        if (!id) throw new Error('Live academic batch was not created.');
        setBatches((prev) => [{ id, ...payload }, ...prev]);
      }
      toast.success('Academic record created');
      setShowRecordModal(false);
    } catch (error) {
      console.error('Unable to create live academic record.', error);
      toast.error('Academic record was not saved to live data.');
    }
  };

  const renderRow = (item) => {
    if (activeTab === 'programs') return [item.name, item.code, item.academicYear, item.status];
    if (activeTab === 'subjects') return [item.subjectName, item.subjectCode, item.programName, item.status];
    return [`${item.className} - ${item.section}`, item.programName, item.classTeacher, item.status];
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="text-sm font-bold text-slate-500 mb-2">Academics / <span className="text-[#f39a5f]">Academic Setup</span></div>
          <h1 className="text-2xl font-bold text-slate-900">Academics</h1>
          <p className="text-sm text-slate-500 mt-1">Programs, subjects, batches, and sections setup.</p>
          {!isFirebaseConfigured && <p className="text-xs text-rose-600 mt-2">Live Firebase data is not configured.</p>}
          {loadError && <p className="text-xs text-rose-600 mt-2">{loadError}</p>}
        </div>
        <button onClick={() => setShowRecordModal(true)} disabled={!canManage} className="h-10 px-5 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm flex items-center gap-2 disabled:bg-slate-300">
          <Plus size={16} /> Create {tabs.find(([id]) => id === activeTab)?.[1]}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`h-10 px-4 rounded-md border text-sm font-semibold ${activeTab === id ? 'bg-[#33373e] text-white border-[#33373e]' : 'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search academics..." className="w-full h-11 rounded-lg bg-[#f0f0f2] border-0 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
      </div>
      <div className="overflow-hidden border border-slate-100 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f6] text-slate-500">
            <tr>{['Name', 'Code/Type', 'Owner/Year', 'Status'].map((item) => <th key={item} className="text-left px-4 py-3 font-semibold">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeRows.map((item) => {
              const [a, b, c, d] = renderRow(item);
              return <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{a}</td><td className="px-4 py-3">{b}</td><td className="px-4 py-3">{c}</td><td className="px-4 py-3"><StatusBadge value={d} /></td></tr>;
            })}
            {!activeRows.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500">No academic records found.</td></tr>}
          </tbody>
        </table>
      </div>
      {showRecordModal && (
        <AcademicRecordModal
          activeTab={activeTab}
          academicYear={academicYear}
          programs={programs}
          onClose={() => setShowRecordModal(false)}
          onSave={saveAcademicRecord}
        />
      )}
    </div>
  );
}
