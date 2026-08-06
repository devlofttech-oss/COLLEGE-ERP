import { useEffect, useMemo, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  assignFee,
  createFeeStructure,
  listFeeAssignments,
  listFeeStructures,
  updateFeeStructure,
} from '../../../api/fees';
import { canAccess, defaultRoles } from '../../userRoles/rolePermissions';
import { getClassOptions } from '../../timetable/timetableUtils';
import { filterByCourse, filterStudentScopedRecords, filterStudentsByCourse } from '../../shared/courseFilters';
import {
  formatCurrency,
  getFeeComponentValues,
  getStudentClassKey,
  totalFeeComponents,
  validateFeeStructure,
} from '../feeUtils';
import FeeStructureModal from './FeeStructureModal';
import FeeStructurePanel from './FeeStructurePanel';

function getFeeValues(form = {}) {
  return getFeeComponentValues(form);
}

function getSelectedCourseFields(selectedCourse = null, selectedCourseCode = 'all') {
  if (!selectedCourse && selectedCourseCode === 'all') return {};
  return {
    courseCode: selectedCourse?.courseCode || (selectedCourseCode === 'all' ? '' : selectedCourseCode),
    courseName: selectedCourse?.courseName || selectedCourse?.name || '',
    programName: selectedCourse?.programName || selectedCourse?.courseName || selectedCourse?.name || '',
    courseYear: selectedCourse?.courseYear || '',
    admissionType: selectedCourse?.admissionType || '',
    collegeName: selectedCourse?.collegeName || '',
    collegeCode: selectedCourse?.collegeCode || '',
  };
}

function mergeCourseFields(form, editingStructure, selectedCourse, selectedCourseCode) {
  const selectedFields = getSelectedCourseFields(selectedCourse, selectedCourseCode);
  return {
    courseCode: form.courseCode || editingStructure?.courseCode || selectedFields.courseCode || '',
    courseName: form.courseName || editingStructure?.courseName || selectedFields.courseName || '',
    programName: form.programName || editingStructure?.programName || selectedFields.programName || '',
    courseYear: form.courseYear || editingStructure?.courseYear || selectedFields.courseYear || '',
    admissionType: form.admissionType || editingStructure?.admissionType || selectedFields.admissionType || '',
    collegeName: form.collegeName || editingStructure?.collegeName || selectedFields.collegeName || '',
    collegeCode: form.collegeCode || editingStructure?.collegeCode || selectedFields.collegeCode || '',
  };
}

export default function PaymentSettingsPanel({
  currentUser,
  academicYear = '',
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [structures, setStructures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = academicYear ? { academicYear } : {};
        const [structs, assigns] = await Promise.all([
          listFeeStructures(params),
          listFeeAssignments(params),
        ]);
        if (!active) return;
        setStructures(structs);
        setAssignments(assigns);
      } catch (error) {
        console.warn('Unable to load payment settings.', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [academicYear]);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canSetup = canAccess(defaultRoles, currentRoleId, 'fees.structure');
  const canAssign = canAccess(defaultRoles, currentRoleId, 'fees.structure');
  const courseStudents = useMemo(
    () => filterStudentsByCourse(scopedStudents, selectedCourseCode, selectedCourse),
    [scopedStudents, selectedCourse, selectedCourseCode]
  );
  const courseStructures = useMemo(
    () => filterByCourse(structures, selectedCourseCode, selectedCourse),
    [selectedCourse, selectedCourseCode, structures]
  );
  const courseAssignments = useMemo(
    () => filterStudentScopedRecords(assignments, courseStudents, selectedCourseCode, selectedCourse),
    [assignments, courseStudents, selectedCourse, selectedCourseCode]
  );
  const classOptions = getClassOptions(courseStudents);
  const totalConfigured = courseStructures.reduce((total, structure) => total + Number(structure.totalAmount || 0), 0);
  const selectedCourseFields = getSelectedCourseFields(selectedCourse, selectedCourseCode);
  const createStructureDefaults = {
    academicYear,
    classKey: classOptions[0] || '',
    ...selectedCourseFields,
  };

  const saveStructure = async (form) => {
    if (!canSetup) {
      toast.error('You do not have permission to manage fee structures.');
      return;
    }
    const validationMessage = validateFeeStructure(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    const payload = {
      ...mergeCourseFields(form, editingStructure, selectedCourse, selectedCourseCode),
      ...form,
      name: form.name.trim(),
      academicYear: form.academicYear.trim(),
      ...getFeeValues(form),
      totalAmount: Number(form.totalAmount || 0),
      status: form.status || 'Active',
    };

    if (editingStructure) {
      try {
        const updated = await updateFeeStructure(editingStructure.id, payload);
        setStructures((prev) => prev.map((item) => item.id === editingStructure.id ? { ...item, ...(updated || payload) } : item));
        toast.success('Fee structure updated');
      } catch (error) {
        console.error('Unable to update fee structure.', error);
        toast.error('Fee structure was not saved.');
      } finally {
        setEditingStructure(null);
      }
      return;
    }

    try {
      const created = await createFeeStructure(payload);
      if (!created) throw new Error('Fee structure was not created.');
      setStructures((prev) => [created, ...prev]);
      toast.success('Fee structure created');
    } catch (error) {
      console.error('Unable to create fee structure.', error);
      toast.error('Fee structure was not saved.');
    } finally {
      setShowStructureModal(false);
    }
  };

  const assignStructureToStudents = async (structure) => {
    if (!canAssign) {
      toast.error('You do not have permission to assign fees.');
      return;
    }
    const structureCourse = structure.courseCode
      ? { courseCode: structure.courseCode, courseName: structure.courseName }
      : selectedCourse;
    const structureStudents = structure.courseCode
      ? filterStudentsByCourse(courseStudents, structure.courseCode, structureCourse)
      : courseStudents;
    const targetStudents = structureStudents.filter((student) => getStudentClassKey(student) === structure.classKey);
    if (!targetStudents.length) {
      toast.error('No active students found for this class.');
      return;
    }
    const existingKeys = new Set(courseAssignments.map((item) => `${item.studentRecordId}-${item.feeStructureId}`));
    const payloads = targetStudents
      .filter((student) => !existingKeys.has(`${student.id}-${structure.id}`))
      .map((student) => {
        const studentPayableTotal = totalFeeComponents(structure) || Number(structure.totalAmount || 0);
        return {
          feeStructureId: structure.id,
          studentRecordId: student.id,
          studentId: student.studentId,
          studentName: student.name,
          classKey: structure.classKey,
          academicYear: structure.academicYear,
          courseCode: structure.courseCode || student.courseCode || '',
          courseName: structure.courseName || student.courseName || student.program || '',
          ...getFeeValues(structure),
          totalAmount: studentPayableTotal,
          paidAmount: 0,
          adjustmentAmount: 0,
          dueAmount: studentPayableTotal,
          dueDate: structure.dueDate,
          status: 'Due',
          feeYearLabel: structure.feeYearLabel || '',
          seedSource: structure.seedSource || '',
        };
      });
    if (!payloads.length) {
      toast.success('This structure is already assigned to all matching students.');
      return;
    }
    try {
      const created = await Promise.all(payloads.map((payload) => assignFee(payload)));
      const newAssignments = created.filter(Boolean);
      setAssignments((prev) => [...newAssignments, ...prev]);
      toast.success('Fee structure assigned');
    } catch (error) {
      console.error('Unable to assign fee structure.', error);
      toast.error('Fee assignments were not saved.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-lg bg-[#f5f5f6] border border-slate-100 p-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 rounded-lg bg-white text-[#fb8d49] flex items-center justify-center shrink-0">
            <Settings size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">Payment Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Create, edit, and assign course fee structures.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowStructureModal(true)}
          disabled={!canSetup || loading || !classOptions.length}
          className="h-10 px-4 rounded-lg bg-[#fb9a5b] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-600"
        >
          <Plus size={16} /> Create Structure
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white border border-slate-100 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Structures</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{loading ? '...' : courseStructures.length}</div>
        </div>
        <div className="rounded-lg bg-white border border-slate-100 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Assigned Fees</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{loading ? '...' : courseAssignments.length}</div>
        </div>
        <div className="rounded-lg bg-white border border-slate-100 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Configured Value</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{loading ? '...' : formatCurrency(totalConfigured)}</div>
        </div>
      </div>

      {!canSetup && !canAssign && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-800">
          You can view payment settings but cannot create, edit, or assign fee structures.
        </div>
      )}

      <FeeStructurePanel
        layout="grid"
        structures={courseStructures}
        canEdit={canSetup}
        canAssign={canAssign}
        onEdit={setEditingStructure}
        onAssign={assignStructureToStudents}
      />

      {showStructureModal && (
        <FeeStructureModal
          initialStructure={createStructureDefaults}
          classOptions={classOptions}
          onClose={() => setShowStructureModal(false)}
          onSave={saveStructure}
        />
      )}
      {editingStructure && (
        <FeeStructureModal
          mode="edit"
          initialStructure={editingStructure}
          classOptions={classOptions}
          onClose={() => setEditingStructure(null)}
          onSave={saveStructure}
        />
      )}
    </div>
  );
}
