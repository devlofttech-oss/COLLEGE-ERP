import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  Banknote,
  BellRing,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  Layers,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import {
  archiveFeeHead,
  archiveFeeStructure,
  assignFee,
  collectFee,
  createFeeHead,
  createFeeStructure,
  createPaymentOrder,
  feeReceiptPdfUrl,
  getFeeDues,
  getFeeReceipt,
  listFeeAssignments,
  listFeeHeads,
  listFeePayments,
  listFeeStructures,
  sendFeeReminders,
  updateFeeHead,
  updateFeeStructure,
} from '../../api/fees';
import { listStudents } from '../../api/students';
import { formatCurrency } from './feeUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Online', 'Cheque', 'NetBanking'];
const STATUS_OPTIONS = ['active', 'inactive'];
const TABS = [
  { id: 'collections', label: 'Fee Collection', icon: Wallet },
  { id: 'heads', label: 'Fee Heads', icon: Layers },
  { id: 'structures', label: 'Fee Structures', icon: ClipboardList },
  { id: 'assignments', label: 'Fee Assignments', icon: UserRound },
  { id: 'dues', label: 'Dues & Reminders', icon: BellRing },
];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function normalizeTimestamp(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toLocaleString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return String(value);
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'partial') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'pending') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (normalized === 'inactive' || normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function initialsFor(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FE';
}

function routeTab(initialTask = '', initialBranch = '') {
  if (TABS.some((tab) => tab.id === initialTask)) return initialTask;
  if (TABS.some((tab) => tab.id === initialBranch)) return initialBranch;
  if (initialTask === 'due-tracking' || initialBranch === 'due-list') return 'dues';
  if (initialTask === 'collections' || initialBranch === 'collect-fee') return 'collections';
  return 'collections';
}

function studentLabel(student = {}) {
  return [student.name, student.admissionNumber || student.rollNumber || student.id].filter(Boolean).join(' - ');
}

function classLabel(klass = {}) {
  return [klass.name, klass.courseName].filter(Boolean).join(' - ') || klass.id;
}

function structureLabel(structure = {}) {
  return [
    structure.feeHeadName || structure.feeHeadId,
    structure.className,
    structure.installment,
    structure.academicYear,
  ].filter(Boolean).join(' | ');
}

function assignmentDue(assignment = {}) {
  return Number(assignment.balance ?? assignment.dueAmount ?? 0);
}

function assignmentTotal(assignment = {}) {
  return Number(assignment.amount ?? assignment.totalAmount ?? 0);
}

function ModalFrame({ children, footer, maxWidth = 'max-w-3xl', onClose, subtitle, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071e27]/50 p-4 backdrop-blur-sm">
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-2xl border border-white/35 bg-[#f3faff]/90 shadow-[0_30px_90px_rgba(7,30,39,.22)] backdrop-blur-2xl', maxWidth)}>
        <div className="flex items-start justify-between border-b border-white/35 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Fees</p>
            <h2 className="mt-1 text-xl font-bold text-[#003434]">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#3f4848]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/45 text-[#3f4848] hover:bg-white" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg bg-white/45 p-3">
      <p className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#071e27]">{valueOrDash(value)}</p>
    </div>
  );
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-2xl font-bold text-[#003434]">{loading ? '-' : value}</div>
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

function HeadModal({ academicYear, initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    name: initialRecord?.name || '',
    academicYear: initialRecord?.academicYear || academicYear || '',
    description: initialRecord?.description || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Fee head name is required.');
      return;
    }
    onSave({
      name: form.name.trim(),
      academicYear: form.academicYear.trim() || null,
      description: form.description.trim() || null,
      status: form.status || null,
    });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Fee Head' : 'Add Fee Head'}
        subtitle={isEdit ? initialRecord.name : 'Creates a backend fee head.'}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              <CheckCircle2 size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Name *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
            <input value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Description</span>
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} className={`${inputClass} py-3`} rows={3} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function StructureModal({ academicYear, classes, heads, initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    feeHeadId: initialRecord?.feeHeadId || '',
    academicYear: initialRecord?.academicYear || academicYear || '',
    classId: initialRecord?.classId || '',
    className: initialRecord?.className || '',
    installment: initialRecord?.installment || '',
    amount: initialRecord?.amount || '',
    dueDate: initialRecord?.dueDate || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateClass = (classId) => {
    const klass = classes.find((item) => item.id === classId);
    setForm((current) => ({ ...current, classId, className: klass?.name || current.className }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!isEdit && !form.feeHeadId) {
      toast.error('Fee head is required.');
      return;
    }
    if (!isEdit && !form.academicYear.trim()) {
      toast.error('Academic year is required.');
      return;
    }
    if (Number(form.amount || 0) <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }

    onSave(isEdit
      ? {
        installment: form.installment.trim() || null,
        amount: Number(form.amount) || 0,
        dueDate: form.dueDate || null,
        status: form.status || null,
        className: form.className.trim() || null,
      }
      : {
        feeHeadId: form.feeHeadId,
        academicYear: form.academicYear.trim(),
        classId: form.classId || null,
        className: form.className.trim() || null,
        installment: form.installment.trim() || null,
        amount: Number(form.amount) || 0,
        dueDate: form.dueDate || null,
        status: form.status || null,
      });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Fee Structure' : 'Add Fee Structure'}
        subtitle={isEdit ? structureLabel(initialRecord) : 'Creates a backend fee structure.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              <CheckCircle2 size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Fee Head{!isEdit ? ' *' : ''}</span>
            <select value={form.feeHeadId} onChange={(event) => update('feeHeadId', event.target.value)} disabled={isEdit} className={inputClass}>
              <option value="">Select head</option>
              {heads.map((head) => <option key={head.id} value={head.id}>{head.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year{!isEdit ? ' *' : ''}</span>
            <input value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} disabled={isEdit} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
            <select value={form.classId} onChange={(event) => updateClass(event.target.value)} disabled={isEdit} className={inputClass}>
              <option value="">No class filter</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
              {form.classId && !classes.some((klass) => klass.id === form.classId) && <option value={form.classId}>{form.className || form.classId}</option>}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class Name</span>
            <input value={form.className} onChange={(event) => update('className', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Installment</span>
            <input value={form.installment} onChange={(event) => update('installment', event.target.value)} className={inputClass} placeholder="Q1, Term 1, Annual..." />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Amount *</span>
            <input type="number" min="0" value={form.amount} onChange={(event) => update('amount', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Due Date</span>
            <input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function AssignmentModal({ academicYear, students, structures, onClose, onSave }) {
  const [form, setForm] = useState({
    studentId: '',
    feeStructureId: '',
    amount: '',
    academicYear: academicYear || '',
    classId: '',
    dueDate: '',
    installment: '',
    feeHeadName: '',
  });
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const selectedStudent = students.find((student) => student.id === form.studentId);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateStructure = (feeStructureId) => {
    const structure = structures.find((item) => item.id === feeStructureId);
    setForm((current) => ({
      ...current,
      feeStructureId,
      amount: structure?.amount ?? current.amount,
      academicYear: structure?.academicYear || current.academicYear,
      classId: structure?.classId || current.classId,
      dueDate: structure?.dueDate || current.dueDate,
      installment: structure?.installment || current.installment,
      feeHeadName: structure?.feeHeadName || current.feeHeadName,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.studentId) {
      toast.error('Student is required.');
      return;
    }
    if (Number(form.amount || 0) <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }
    onSave(compactPayload({
      studentId: form.studentId,
      studentName: selectedStudent?.name || null,
      feeStructureId: form.feeStructureId || null,
      feeHeadName: form.feeHeadName.trim() || null,
      academicYear: form.academicYear.trim() || null,
      classId: form.classId || selectedStudent?.classId || null,
      installment: form.installment.trim() || null,
      dueDate: form.dueDate || null,
      amount: Number(form.amount) || 0,
    }));
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Assign Fee"
        subtitle="Creates a backend student fee assignment."
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              <CheckCircle2 size={16} /> Assign
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Student *</span>
            <select value={form.studentId} onChange={(event) => update('studentId', event.target.value)} className={inputClass}>
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Fee Structure</span>
            <select value={form.feeStructureId} onChange={(event) => updateStructure(event.target.value)} className={inputClass}>
              <option value="">No structure selected</option>
              {structures.map((structure) => <option key={structure.id} value={structure.id}>{structureLabel(structure)} - {formatCurrency(structure.amount)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Amount *</span>
            <input type="number" min="0" value={form.amount} onChange={(event) => update('amount', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Fee Head Name</span>
            <input value={form.feeHeadName} onChange={(event) => update('feeHeadName', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
            <input value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Installment</span>
            <input value={form.installment} onChange={(event) => update('installment', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class ID</span>
            <input value={form.classId} onChange={(event) => update('classId', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Due Date</span>
            <input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} className={inputClass} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function CollectionModal({ assignment, canDiscount, students, onClose, onSave }) {
  const selectedStudent = students.find((student) => student.id === assignment?.studentId);
  const [form, setForm] = useState(() => ({
    studentId: assignment?.studentId || '',
    assignmentId: assignment?.id || '',
    studentName: assignment?.studentName || selectedStudent?.name || '',
    feeHeadName: assignment?.feeHeadName || '',
    amount: assignment ? assignmentDue(assignment) || '' : '',
    discount: '',
    fine: '',
    paymentMode: 'Cash',
    referenceNumber: '',
    remarks: '',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateStudent = (studentId) => {
    const student = students.find((item) => item.id === studentId);
    setForm((current) => ({ ...current, studentId, studentName: student?.name || current.studentName }));
  };

  const submit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount || 0);
    const discount = Number(form.discount || 0);
    if (!form.studentId) {
      toast.error('Student is required.');
      return;
    }
    if (amount <= 0 && discount <= 0) {
      toast.error('Payment amount or discount must be greater than zero.');
      return;
    }
    onSave(compactPayload({
      studentId: form.studentId,
      studentName: form.studentName.trim() || null,
      assignmentId: form.assignmentId || null,
      feeHeadName: form.feeHeadName.trim() || null,
      amount,
      discount: canDiscount ? discount : 0,
      fine: Number(form.fine || 0),
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber.trim() || null,
      remarks: form.remarks.trim() || null,
    }));
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Collect Payment"
        subtitle={assignment ? `${assignment.studentName || assignment.studentId} | Balance ${formatCurrency(assignmentDue(assignment))}` : 'Creates a backend fee payment.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              <Wallet size={16} /> Collect
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Student *</span>
            <select value={form.studentId} onChange={(event) => updateStudent(event.target.value)} disabled={Boolean(assignment)} className={inputClass}>
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Assignment ID</span>
            <input value={form.assignmentId} onChange={(event) => update('assignmentId', event.target.value)} disabled={Boolean(assignment)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Fee Head Name</span>
            <input value={form.feeHeadName} onChange={(event) => update('feeHeadName', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Amount *</span>
            <input type="number" min="0" value={form.amount} onChange={(event) => update('amount', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Discount</span>
            <input type="number" min="0" value={form.discount} onChange={(event) => update('discount', event.target.value)} disabled={!canDiscount} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Fine</span>
            <input type="number" min="0" value={form.fine} onChange={(event) => update('fine', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Payment Mode *</span>
            <select value={form.paymentMode} onChange={(event) => update('paymentMode', event.target.value)} className={inputClass}>
              {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Reference Number</span>
            <input value={form.referenceNumber} onChange={(event) => update('referenceNumber', event.target.value)} className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Remarks</span>
            <textarea value={form.remarks} onChange={(event) => update('remarks', event.target.value)} className={`${inputClass} py-3`} rows={3} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

export default function FeesManagement({
  academicYear = '',
  currentUser,
  initialBranch = '',
  initialTask = '',
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [activeTab, setActiveTab] = useState(routeTab(initialTask, initialBranch));
  const [heads, setHeads] = useState([]);
  const [structures, setStructures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [dues, setDues] = useState({ count: 0, totalDue: 0, assignments: [] });
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [headModalRecord, setHeadModalRecord] = useState(undefined);
  const [structureModalRecord, setStructureModalRecord] = useState(undefined);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [collectionAssignment, setCollectionAssignment] = useState(undefined);

  const canView = hasPermission(currentUser, 'fees.view');
  const canStructure = hasPermission(currentUser, 'fees.structure');
  const canCollect = hasPermission(currentUser, 'fees.collect');
  const canDiscount = hasPermission(currentUser, 'fees.discount');
  const canReceipt = canView || hasPermission(currentUser, 'fees.receipt');
  const canReport = canView || hasPermission(currentUser, 'fees.report');
  const canRemind = hasPermission(currentUser, 'fees.remind') || canCollect;

  const effectiveAcademicYear = academicYear || heads[0]?.academicYear || structures[0]?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || (selectedCourseCode !== 'all' ? selectedCourseCode : '');

  const loadFees = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const studentParams = {
        academicYear: effectiveAcademicYear,
        courseId: effectiveCourseId,
        status: 'active',
      };
      const classParams = {
        academicYear: effectiveAcademicYear,
        courseId: effectiveCourseId,
        status: 'active',
      };
      const feeParams = {
        academicYear: effectiveAcademicYear,
        classId,
      };
      const [nextHeads, nextStructures, nextAssignments, nextPayments, nextStudents, nextClasses, nextDues] = await Promise.all([
        listFeeHeads({ academicYear: effectiveAcademicYear }),
        listFeeStructures(feeParams),
        listFeeAssignments(feeParams),
        listFeePayments(),
        scopedStudents.length ? Promise.resolve({ students: scopedStudents, count: scopedStudents.length }) : listStudents(studentParams),
        listAcademicResource('classes', classParams),
        canReport ? getFeeDues(feeParams) : Promise.resolve({ count: 0, totalDue: 0, assignments: [] }),
      ]);
      setHeads(nextHeads);
      setStructures(nextStructures);
      setAssignments(nextAssignments);
      setPayments(nextPayments);
      setStudents(nextStudents.students || []);
      setClasses(nextClasses);
      setDues(nextDues || { count: 0, totalDue: 0, assignments: [] });
      setSelectedAssignmentIds((current) => current.filter((id) => (nextDues?.assignments || []).some((item) => item.id === id)));
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend fee data.', error);
      setLoadError(error?.message || 'Unable to load fees from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canReport, canView, classId, effectiveAcademicYear, effectiveCourseId, scopedStudents]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadFees();
    });
    return () => {
      active = false;
    };
  }, [loadFees]);

  const paymentsByAssignment = useMemo(() => payments.reduce((map, payment) => {
    if (!payment.assignmentId) return map;
    map[payment.assignmentId] = [...(map[payment.assignmentId] || []), payment];
    return map;
  }, {}), [payments]);

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return assignments;
    return assignments.filter((assignment) => [
      assignment.studentName,
      assignment.studentId,
      assignment.feeHeadName,
      assignment.installment,
      assignment.status,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [assignments, search]);

  const filteredPayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return payments;
    return payments.filter((payment) => [
      payment.studentName,
      payment.studentId,
      payment.feeHeadName,
      payment.receiptNumber,
      payment.paymentMode,
      payment.referenceNumber,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [payments, search]);

  const filteredHeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return heads;
    return heads.filter((head) => [head.name, head.description, head.academicYear].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [heads, search]);

  const filteredStructures = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return structures;
    return structures.filter((structure) => [
      structure.feeHeadName,
      structure.className,
      structure.installment,
      structure.academicYear,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [search, structures]);

  const summary = useMemo(() => {
    const totalAssigned = assignments.reduce((sum, assignment) => sum + assignmentTotal(assignment), 0);
    const totalCollected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalDiscount = payments.reduce((sum, payment) => sum + Number(payment.discount || 0), 0);
    const totalDue = assignments.reduce((sum, assignment) => sum + assignmentDue(assignment), 0);
    return { totalAssigned, totalCollected, totalDiscount, totalDue };
  }, [assignments, payments]);

  const saveHead = async (payload) => {
    const isEdit = Boolean(headModalRecord?.id);
    if (!canStructure) {
      toast.error('You do not have permission to manage fee heads.');
      return;
    }
    setSaving(true);
    try {
      await (isEdit ? updateFeeHead(headModalRecord.id, payload) : createFeeHead(payload));
      setHeadModalRecord(undefined);
      toast.success(isEdit ? 'Fee head updated' : 'Fee head created');
      await loadFees();
    } catch (error) {
      toast.error(error?.message || 'Fee head was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveStructure = async (payload) => {
    const isEdit = Boolean(structureModalRecord?.id);
    if (!canStructure) {
      toast.error('You do not have permission to manage fee structures.');
      return;
    }
    setSaving(true);
    try {
      await (isEdit ? updateFeeStructure(structureModalRecord.id, payload) : createFeeStructure(payload));
      setStructureModalRecord(undefined);
      toast.success(isEdit ? 'Fee structure updated' : 'Fee structure created');
      await loadFees();
    } catch (error) {
      toast.error(error?.message || 'Fee structure was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (payload) => {
    if (!canStructure) {
      toast.error('You do not have permission to assign fees.');
      return;
    }
    setSaving(true);
    try {
      await assignFee(payload);
      setAssignmentModalOpen(false);
      toast.success('Fee assigned');
      await loadFees();
    } catch (error) {
      toast.error(error?.message || 'Fee assignment was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveCollection = async (payload) => {
    if (!canCollect) {
      toast.error('You do not have permission to collect fees.');
      return;
    }
    setSaving(true);
    try {
      const result = await collectFee(payload);
      setCollectionAssignment(undefined);
      toast.success(`Payment collected: ${result.receiptNumber}`);
      await loadFees();
      if (result.payment) setSelectedReceipt(result.payment);
    } catch (error) {
      toast.error(error?.message || 'Payment was not collected.');
    } finally {
      setSaving(false);
    }
  };

  const archiveHeadRecord = async (head) => {
    if (!canStructure) {
      toast.error('You do not have permission to archive fee heads.');
      return;
    }
    if (!window.confirm(`Archive ${head.name || 'this fee head'}?`)) return;
    try {
      await archiveFeeHead(head.id);
      toast.success('Fee head archived');
      await loadFees();
    } catch (error) {
      toast.error(error?.message || 'Fee head was not archived.');
    }
  };

  const archiveStructureRecord = async (structure) => {
    if (!canStructure) {
      toast.error('You do not have permission to archive fee structures.');
      return;
    }
    if (!window.confirm(`Archive ${structureLabel(structure) || 'this fee structure'}?`)) return;
    try {
      await archiveFeeStructure(structure.id);
      toast.success('Fee structure archived');
      await loadFees();
    } catch (error) {
      toast.error(error?.message || 'Fee structure was not archived.');
    }
  };

  const loadReceipt = async (payment) => {
    if (!canReceipt) {
      toast.error('You do not have permission to view receipts.');
      return;
    }
    try {
      setSelectedReceipt(await getFeeReceipt(payment.id));
    } catch (error) {
      toast.error(error?.message || 'Receipt could not be loaded.');
    }
  };

  const toggleReminderAssignment = (assignmentId) => {
    setSelectedAssignmentIds((current) => current.includes(assignmentId)
      ? current.filter((id) => id !== assignmentId)
      : [...current, assignmentId]);
  };

  const sendReminders = async () => {
    if (!canRemind) {
      toast.error('You do not have permission to send reminders.');
      return;
    }
    if (!selectedAssignmentIds.length) {
      toast.error('Select due assignments first.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendFeeReminders({ assignmentIds: selectedAssignmentIds, channel: 'app' });
      toast.success(`${result.queued} reminder intent${result.queued === 1 ? '' : 's'} recorded`);
      setSelectedAssignmentIds([]);
    } catch (error) {
      toast.error(error?.message || 'Fee reminders were not recorded.');
    } finally {
      setSaving(false);
    }
  };

  const requestOnlineOrder = async (assignment) => {
    if (!canView) {
      toast.error('You do not have permission to request online payment orders.');
      return;
    }
    try {
      await createPaymentOrder({
        assignmentId: assignment?.id || null,
        studentId: assignment?.studentId || null,
        amount: assignment ? assignmentDue(assignment) : 0,
      });
      toast.success('Online payment order created');
    } catch (error) {
      toast.error(error?.message || 'Online payment order could not be created.');
    }
  };

  if (!canView) {
    return (
      <div className="erp-fees-page min-w-0">
        <section className="erp-glass-card rounded-2xl p-8 text-center">
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003434]">Fee Management</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">You do not have permission to view fees.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="erp-fees-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-[#3f4848]">
            <span>Daily Work</span>
            <span>/</span>
            <span className="text-[#006a62]">Fees</span>
          </div>
          <h1 className="font-['Montserrat'] text-3xl font-bold text-[#003434]">Fee Management</h1>
          <p className="mt-2 text-sm text-[#3f4848]">Backend-backed fee heads, structures, assignments, collections, receipts, dues, and reminders.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadFees} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/40 px-4 text-sm font-bold text-[#004d4d]">
            <RefreshCcw size={17} /> Refresh
          </button>
          {canCollect && (
            <button type="button" onClick={() => setCollectionAssignment(null)} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
              <Wallet size={17} /> Collect Payment
            </button>
          )}
        </div>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <SummaryCard label="Assigned" value={formatCurrency(summary.totalAssigned)} loading={loading} icon={<Banknote size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Collected" value={formatCurrency(summary.totalCollected)} loading={loading} icon={<BadgeCheck size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Discounts" value={formatCurrency(summary.totalDiscount)} loading={loading} icon={<CreditCard size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Outstanding" value={formatCurrency(dues.totalDue || summary.totalDue)} loading={loading} icon={<BellRing size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Due Assignments" value={dues.count || assignments.filter((item) => assignmentDue(item) > 0).length} loading={loading} icon={<ClipboardList size={18} className="text-[#006a62]" />} />
      </section>

      <section className="erp-glass-card mb-6 rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cx('inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold', activeTab === tab.id ? 'bg-[#004d4d] text-white' : 'bg-white/40 text-[#3f4848]')}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(240px,1fr)]">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
              <select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                <option value="">All classes</option>
                {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Search</span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 pl-10 pr-4 text-sm text-[#071e27] outline-none focus:border-[#006a62]" placeholder="Student, receipt, fee head, status" />
              </span>
            </label>
          </div>
        </div>
      </section>

      {activeTab === 'collections' && (
        <CollectionsPanel
          assignments={filteredAssignments}
          canCollect={canCollect}
          canReceipt={canReceipt}
          loading={loading}
          onCollect={setCollectionAssignment}
          onOnlineOrder={requestOnlineOrder}
          onReceipt={loadReceipt}
          payments={filteredPayments}
          paymentsByAssignment={paymentsByAssignment}
        />
      )}

      {activeTab === 'heads' && (
        <HeadsPanel
          canStructure={canStructure}
          heads={filteredHeads}
          loading={loading}
          onAdd={() => setHeadModalRecord(null)}
          onArchive={archiveHeadRecord}
          onEdit={setHeadModalRecord}
        />
      )}

      {activeTab === 'structures' && (
        <StructuresPanel
          canStructure={canStructure}
          loading={loading}
          onAdd={() => setStructureModalRecord(null)}
          onArchive={archiveStructureRecord}
          onEdit={setStructureModalRecord}
          structures={filteredStructures}
        />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsPanel
          assignments={filteredAssignments}
          canAssign={canStructure}
          canCollect={canCollect}
          loading={loading}
          onAssign={() => setAssignmentModalOpen(true)}
          onCollect={setCollectionAssignment}
          paymentsByAssignment={paymentsByAssignment}
        />
      )}

      {activeTab === 'dues' && (
        <DuesPanel
          canCollect={canCollect}
          canRemind={canRemind}
          dues={dues}
          loading={loading}
          onCollect={setCollectionAssignment}
          onSend={sendReminders}
          selectedIds={selectedAssignmentIds}
          toggleSelected={toggleReminderAssignment}
        />
      )}

      {headModalRecord !== undefined && (
        <HeadModal
          academicYear={effectiveAcademicYear}
          initialRecord={headModalRecord}
          onClose={() => setHeadModalRecord(undefined)}
          onSave={saveHead}
        />
      )}

      {structureModalRecord !== undefined && (
        <StructureModal
          academicYear={effectiveAcademicYear}
          classes={classes}
          heads={heads}
          initialRecord={structureModalRecord}
          onClose={() => setStructureModalRecord(undefined)}
          onSave={saveStructure}
        />
      )}

      {assignmentModalOpen && (
        <AssignmentModal
          academicYear={effectiveAcademicYear}
          students={students}
          structures={structures}
          onClose={() => setAssignmentModalOpen(false)}
          onSave={saveAssignment}
        />
      )}

      {collectionAssignment !== undefined && (
        <CollectionModal
          assignment={collectionAssignment}
          canDiscount={canDiscount}
          students={students}
          onClose={() => setCollectionAssignment(undefined)}
          onSave={saveCollection}
        />
      )}

      {selectedReceipt && (
        <button type="button" aria-label="Close receipt" onClick={() => setSelectedReceipt(null)} className="fixed inset-0 z-[70] bg-[#071e27]/30 backdrop-blur-sm">
          <aside className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-lg flex-col overflow-hidden bg-[#f3faff] text-left shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between bg-[#004d4d] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold text-white/70">Receipt</p>
                <h2 className="text-lg font-bold text-white">{selectedReceipt.receiptNumber || selectedReceipt.id}</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={17} /></span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Student" value={selectedReceipt.studentName || selectedReceipt.studentId} />
                <DetailRow label="Fee Head" value={selectedReceipt.feeHeadName} />
                <DetailRow label="Amount" value={formatCurrency(selectedReceipt.amount)} />
                <DetailRow label="Discount" value={formatCurrency(selectedReceipt.discount)} />
                <DetailRow label="Fine" value={formatCurrency(selectedReceipt.fine)} />
                <DetailRow label="Payment Mode" value={selectedReceipt.paymentMode} />
                <DetailRow label="Reference" value={selectedReceipt.referenceNumber} />
                <DetailRow label="Paid At" value={normalizeTimestamp(selectedReceipt.paidAt || selectedReceipt.createdAt)} />
                <div className="col-span-2">
                  <DetailRow label="Remarks" value={selectedReceipt.remarks} />
                </div>
              </div>
            </div>
            {canReceipt && selectedReceipt.id && (
              <div className="border-t border-[#cfe6f2] bg-white/55 p-5">
                <a href={feeReceiptPdfUrl(selectedReceipt.id)} target="_blank" rel="noreferrer" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
                  <Receipt size={16} /> Open Receipt PDF
                </a>
              </div>
            )}
          </aside>
        </button>
      )}
    </div>
  );
}

function CollectionsPanel({ assignments, canCollect, canReceipt, loading, onCollect, onOnlineOrder, onReceipt, payments, paymentsByAssignment }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="erp-glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
          <h2 className="text-sm font-bold text-[#003434]">Collection Queue</h2>
          <span className="rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold text-[#3f4848]">{assignments.length} assignment{assignments.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#004d4d] text-left text-white">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Fee</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading assignments...</td></tr>}
              {!loading && assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#004d4d] text-xs font-bold text-white">{initialsFor(assignment.studentName)}</div>
                      <div>
                        <p className="font-bold text-[#071e27]">{assignment.studentName || assignment.studentId}</p>
                        <p className="mt-1 text-xs text-[#3f4848]">{assignment.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#3f4848]">{assignment.feeHeadName || '-'}<div className="text-xs">{assignment.installment || assignment.dueDate || '-'}</div></td>
                  <td className="px-5 py-4 font-bold text-[#071e27]">{formatCurrency(assignmentTotal(assignment))}</td>
                  <td className="px-5 py-4 font-bold text-[#006a62]">{formatCurrency(assignmentDue(assignment))}</td>
                  <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(assignment.status))}>{assignment.status || '-'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {canCollect && (
                        <button type="button" onClick={() => onCollect(assignment)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
                          <Wallet size={14} /> Collect
                        </button>
                      )}
                      <button type="button" onClick={() => onOnlineOrder(assignment)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/45 px-3 text-xs font-bold text-[#004d4d]">
                        <CreditCard size={14} /> Online
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !assignments.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No fee assignments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="erp-glass-card rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase text-[#3f4848]">Payment History</p>
        <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-white/35 bg-white/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#071e27]">{payment.studentName || payment.studentId}</p>
                  <p className="mt-1 text-xs text-[#3f4848]">{payment.receiptNumber || payment.id} | {payment.paymentMode}</p>
                </div>
                <span className="font-bold text-[#006a62]">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canReceipt && (
                  <button type="button" onClick={() => onReceipt(payment)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]">
                    <Receipt size={13} /> Receipt
                  </button>
                )}
                {payment.assignmentId && (
                  <span className="rounded-lg bg-white/45 px-3 py-1 text-xs font-semibold text-[#3f4848]">{(paymentsByAssignment[payment.assignmentId] || []).length} assignment payment{(paymentsByAssignment[payment.assignmentId] || []).length === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>
          ))}
          {!payments.length && <EmptyState message="No payment history found." />}
        </div>
      </aside>
    </div>
  );
}

function HeadsPanel({ canStructure, heads, loading, onAdd, onArchive, onEdit }) {
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Fee Heads</h2>
        {canStructure && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white"><Plus size={14} /> Add Head</button>}
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {loading && <div className="text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading heads...</div>}
        {!loading && heads.map((head) => (
          <div key={head.id} className="rounded-2xl border border-white/35 bg-white/35 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#003434]">{head.name}</h3>
                <p className="mt-1 text-xs text-[#3f4848]">{head.academicYear || 'All years'}</p>
              </div>
              <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(head.status))}>{head.status || '-'}</span>
            </div>
            <p className="mt-4 text-sm text-[#3f4848]">{head.description || 'No description.'}</p>
            {canStructure && (
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => onEdit(head)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Eye size={13} /> Edit</button>
                <button type="button" onClick={() => onArchive(head)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Archive size={13} /> Archive</button>
              </div>
            )}
          </div>
        ))}
        {!loading && !heads.length && <EmptyState message="No fee heads found." />}
      </div>
    </section>
  );
}

function StructuresPanel({ canStructure, loading, onAdd, onArchive, onEdit, structures }) {
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Fee Structures</h2>
        {canStructure && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white"><Plus size={14} /> Add Structure</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-[#004d4d] text-left text-white">
            <tr>
              <th className="px-5 py-3">Fee</th>
              <th className="px-5 py-3">Class</th>
              <th className="px-5 py-3">Installment</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Due Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading structures...</td></tr>}
            {!loading && structures.map((structure) => (
              <tr key={structure.id}>
                <td className="px-5 py-4 font-bold text-[#071e27]">{structure.feeHeadName || structure.feeHeadId}</td>
                <td className="px-5 py-4 text-[#3f4848]">{structure.className || '-'}</td>
                <td className="px-5 py-4 text-[#3f4848]">{structure.installment || '-'}</td>
                <td className="px-5 py-4 font-bold text-[#006a62]">{formatCurrency(structure.amount)}</td>
                <td className="px-5 py-4 text-[#3f4848]">{structure.dueDate || '-'}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(structure.status))}>{structure.status || '-'}</span></td>
                <td className="px-5 py-4">
                  {canStructure && (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(structure)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Eye size={13} /> Edit</button>
                      <button type="button" onClick={() => onArchive(structure)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Archive size={13} /> Archive</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !structures.length && <tr><td colSpan="7" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No fee structures found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AssignmentsPanel({ assignments, canAssign, canCollect, loading, onAssign, onCollect, paymentsByAssignment }) {
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Fee Assignments</h2>
        {canAssign && <button type="button" onClick={onAssign} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white"><Plus size={14} /> Assign Fee</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-[#004d4d] text-left text-white">
            <tr>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Fee</th>
              <th className="px-5 py-3">Paid</th>
              <th className="px-5 py-3">Discount</th>
              <th className="px-5 py-3">Fine</th>
              <th className="px-5 py-3">Balance</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading assignments...</td></tr>}
            {!loading && assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td className="px-5 py-4 font-bold text-[#071e27]">{assignment.studentName || assignment.studentId}</td>
                <td className="px-5 py-4 text-[#3f4848]">{assignment.feeHeadName || '-'}<div className="text-xs">{assignment.installment || assignment.academicYear || '-'}</div></td>
                <td className="px-5 py-4">{formatCurrency(assignment.paidAmount)}</td>
                <td className="px-5 py-4">{formatCurrency(assignment.discountTotal)}</td>
                <td className="px-5 py-4">{formatCurrency(assignment.fineTotal)}</td>
                <td className="px-5 py-4 font-bold text-[#006a62]">{formatCurrency(assignmentDue(assignment))}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(assignment.status))}>{assignment.status || '-'}</span></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <span className="rounded-lg bg-white/45 px-3 py-1 text-xs font-semibold text-[#3f4848]">{(paymentsByAssignment[assignment.id] || []).length} payment{(paymentsByAssignment[assignment.id] || []).length === 1 ? '' : 's'}</span>
                    {canCollect && <button type="button" onClick={() => onCollect(assignment)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#004d4d] px-3 text-xs font-bold text-white"><Wallet size={13} /> Collect</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !assignments.length && <tr><td colSpan="8" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No fee assignments found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DuesPanel({ canCollect, canRemind, dues, loading, onCollect, onSend, selectedIds, toggleSelected }) {
  const dueAssignments = dues.assignments || [];
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/35 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#003434]">Dues & Reminders</h2>
          <p className="mt-1 text-xs font-semibold text-[#3f4848]">{dues.count || dueAssignments.length} due assignment{(dues.count || dueAssignments.length) === 1 ? '' : 's'} | {formatCurrency(dues.totalDue)}</p>
        </div>
        {canRemind && (
          <button type="button" onClick={onSend} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
            <Send size={14} /> Record Reminders
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-[#004d4d] text-left text-white">
            <tr>
              <th className="px-5 py-3">Select</th>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Fee</th>
              <th className="px-5 py-3">Due Date</th>
              <th className="px-5 py-3">Balance</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading dues...</td></tr>}
            {!loading && dueAssignments.map((assignment) => (
              <tr key={assignment.id}>
                <td className="px-5 py-4">
                  <input type="checkbox" checked={selectedIds.includes(assignment.id)} onChange={() => toggleSelected(assignment.id)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
                </td>
                <td className="px-5 py-4 font-bold text-[#071e27]">{assignment.studentName || assignment.studentId}</td>
                <td className="px-5 py-4 text-[#3f4848]">{assignment.feeHeadName || '-'}<div className="text-xs">{assignment.installment || '-'}</div></td>
                <td className="px-5 py-4 text-[#3f4848]">{assignment.dueDate || '-'}</td>
                <td className="px-5 py-4 font-bold text-[#006a62]">{formatCurrency(assignmentDue(assignment))}</td>
                <td className="px-5 py-4 text-right">
                  {canCollect && <button type="button" onClick={() => onCollect(assignment)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#004d4d] px-3 text-xs font-bold text-white"><Wallet size={13} /> Collect</button>}
                </td>
              </tr>
            ))}
            {!loading && !dueAssignments.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No dues found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
