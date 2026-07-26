import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  archiveManagedDocument,
  createManagedDocument,
  getDocumentManagementData,
  updateManagedDocument,
} from '../../firebase/db';
import { isFirebaseConfigured } from '../../firebase/config';
import { uploadManagedDocumentFile } from '../../firebase/storage';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';
import { documentCategories, documentOwnerTypes, documentStatuses, filterDocuments, formatDisplayDate, resolveOwnerName, validateDocumentForm } from './documentUtils';
import DocumentPreviewPanel from './components/DocumentPreviewPanel';
import DocumentTable from './components/DocumentTable';
import DocumentUploadModal from './components/DocumentUploadModal';
import { filterStudentScopedRecords, filterStudentsByCourse } from '../shared/courseFilters';

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function collectUserIdentityTokens(user = {}) {
  return new Set([
    user.uid,
    user.id,
    user.email,
    user.displayId,
    user.employeeId,
    user.staffId,
    user.name,
    user.displayName,
  ].map(normalizeIdentity).filter(Boolean));
}

function documentMatchesCurrentStaff(document = {}, identityTokens = new Set()) {
  if (!identityTokens.size) return false;
  const uploadFields = [
    document.uploadedByUid,
    document.createdByUid,
    document.uploadedById,
    document.createdById,
    document.userId,
    document.staffId,
    document.uploadedByEmail,
    document.createdByEmail,
    document.uploadedBy,
    document.createdByName,
  ].map(normalizeIdentity).filter(Boolean);
  if (uploadFields.some((value) => identityTokens.has(value))) return true;

  if (document.ownerType !== 'Staff') return false;
  return [document.ownerRecordId, document.ownerId, document.ownerName, document.employeeId, document.email]
    .map(normalizeIdentity)
    .filter(Boolean)
    .some((value) => identityTokens.has(value));
}

export default function DocumentManagement({ currentUser, academicYear = '', ownerFilter = null, scopedStudents = [], selectedCourse = null, selectedCourseCode = 'all' }) {
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({ search: '', ownerType: '', category: '', status: '' });
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [loadError, setLoadError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!isFirebaseConfigured) {
        setLoadError('Live Firebase data is not configured.');
        setLoading(false);
        return;
      }
      try {
        const data = await getDocumentManagementData(academicYear);
        setStudents(data.students.filter((student) => student.status !== 'Archived'));
        setStaff(data.staff.filter((member) => member.status !== 'Archived'));
        setDocuments(data.managedDocuments);
        setSelectedId('');
        setLoadError('');
      } catch (error) {
        console.warn('Unable to load live documents.', error);
        setLoadError('Unable to load live document records.');
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [academicYear]);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canUpload = canAccess(defaultRoles, currentRoleId, 'documents.upload');
  const canVerify = canAccess(defaultRoles, currentRoleId, 'documents.verify');
  const canArchive = canAccess(defaultRoles, currentRoleId, 'documents.archive');
  const isRoleScopedDocumentView = currentRoleId === 'parent' || currentRoleId === 'faculty';
  const hideOwnerFilter = currentRoleId === 'parent' || currentRoleId === 'faculty';
  const courseStudents = scopedStudents.length ? scopedStudents : filterStudentsByCourse(students, selectedCourseCode, selectedCourse);
  const ownerFilterKey = ownerFilter
    ? [ownerFilter.ownerType, ownerFilter.ownerRecordId, ownerFilter.ownerId].join('|')
    : '';
  const isOwnerFilterActive = Boolean(ownerFilterKey);
  const canModerateDocuments = !isRoleScopedDocumentView && !isOwnerFilterActive;
  const courseDocuments = useMemo(
    () => filterStudentScopedRecords(documents, courseStudents, selectedCourseCode, selectedCourse),
    [courseStudents, documents, selectedCourse, selectedCourseCode]
  );
  const ownerScopedDocuments = useMemo(() => {
    if (!isOwnerFilterActive) return [];
    return documents.filter((item) => {
      const ownerTypeMatches = item.ownerType === ownerFilter.ownerType;
      const ownerRecordMatches = ownerFilter.ownerRecordId && item.ownerRecordId === ownerFilter.ownerRecordId;
      const ownerIdMatches = ownerFilter.ownerId && item.ownerId === ownerFilter.ownerId;
      return ownerTypeMatches && (ownerRecordMatches || ownerIdMatches);
    });
  }, [documents, isOwnerFilterActive, ownerFilter]);
  const currentStaffTokens = useMemo(() => collectUserIdentityTokens(currentUser), [currentUser]);
  const staffScopedDocuments = useMemo(
    () => documents.filter((item) => documentMatchesCurrentStaff(item, currentStaffTokens)),
    [currentStaffTokens, documents]
  );
  const activeFilters = useMemo(
    () => (isOwnerFilterActive ? {} : { ...filters, ownerType: hideOwnerFilter ? '' : filters.ownerType }),
    [filters, hideOwnerFilter, isOwnerFilterActive]
  );
  const sourceDocuments = isOwnerFilterActive
    ? ownerScopedDocuments
    : currentRoleId === 'faculty'
      ? staffScopedDocuments
      : courseDocuments;
  const visibleDocuments = useMemo(() => filterDocuments(sourceDocuments, activeFilters), [activeFilters, sourceDocuments]);
  const normalizedDocuments = useMemo(() => visibleDocuments.map((item) => ({
    ...item,
    ownerName: resolveOwnerName(item, students, staff),
  })), [staff, students, visibleDocuments]);
  const selectedDocumentId = normalizedDocuments.some((item) => item.id === selectedId)
    ? selectedId
    : (isOwnerFilterActive ? normalizedDocuments[0]?.id || '' : '');
  const selectedDocument = selectedDocumentId ? normalizedDocuments.find((item) => item.id === selectedDocumentId) || null : null;

  const buildDocumentPayload = (form, fileData = {}) => {
    const ownerList = form.ownerType === 'Student' ? courseStudents : staff;
    const owner = ownerList.find((item) => item.id === form.ownerRecordId);
    const ownerId = form.ownerType === 'Student' ? owner?.studentId : owner?.employeeId;
    const courseCode = form.ownerType === 'Student'
      ? owner?.courseCode || selectedCourseCode
      : selectedCourseCode === 'all' ? '' : selectedCourseCode;
    const courseName = form.ownerType === 'Student'
      ? owner?.courseName || owner?.program || selectedCourse?.courseName || ''
      : selectedCourse?.courseName || '';
    const otherOwnerName = form.ownerName?.trim() || '';
    return {
      ownerType: form.ownerType,
      ownerRecordId: form.ownerRecordId,
      ownerId: form.ownerType === 'Other' ? `OTHER-${Date.now()}` : ownerId || '',
      ownerName: form.ownerType === 'Other' ? otherOwnerName : owner?.name || '',
      archiveTitle: form.ownerType === 'Other' ? otherOwnerName : '',
      documentType: form.documentType.trim(),
      note: form.note?.trim() || '',
      category: form.category,
      courseCode,
      courseName,
      notes: form.notes?.trim() || '',
      tags: form.notes?.trim() || '',
      verificationStatus: 'Pending Review',
      uploadedAtText: formatDisplayDate(),
      verifiedAtText: '',
      uploadedByUid: currentUser?.uid || '',
      uploadedByEmail: currentUser?.email || '',
      uploadedById: currentUser?.employeeId || currentUser?.displayId || currentUser?.id || '',
      uploadedByName: currentUser?.name || currentUser?.displayName || '',
      ...fileData,
    };
  };

  const saveDocument = async (form, file) => {
    if (!canUpload) {
      toast.error('You do not have permission to upload documents.');
      return;
    }
    const validationMessage = validateDocumentForm(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setUploading(true);
    let fileData = {};
    let uploadError = null;
    try {
      const ownerKey = form.ownerType === 'Other'
        ? form.ownerName
        : form.ownerRecordId;
      if (file) {
        fileData = await uploadManagedDocumentFile({ ownerType: form.ownerType, ownerId: ownerKey, file });
      }
    } catch (error) {
      uploadError = error;
      fileData = file ? {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileUrl: '',
        storagePath: '',
      } : {};
    }

    const payload = { ...buildDocumentPayload(form, fileData), academicYear };
    try {
      const id = await createManagedDocument(payload);
      if (!id) throw new Error('Live document was not created.');
      const created = { id, ...payload };
      setDocuments((prev) => [created, ...prev]);
      setSelectedId(created.id);
      toast.success(uploadError ? 'Document metadata saved. File upload is unavailable.' : 'Document saved');
    } catch (error) {
      console.error('Unable to save live document.', error);
      toast.error('Document was not saved to live data.');
    } finally {
      setUploading(false);
      setShowUploadModal(false);
    }
  };

  const updateVerification = async (document, verificationStatus) => {
    if (!canVerify) {
      toast.error('You do not have permission to verify documents.');
      return;
    }
    const updates = {
      verificationStatus,
      verifiedAtText: formatDisplayDate(),
    };
    try {
      await updateManagedDocument(document.id, updates);
      setDocuments((prev) => prev.map((item) => item.id === document.id ? { ...item, ...updates } : item));
      toast.success(`Document marked ${verificationStatus.toLowerCase()}`);
    } catch (error) {
      console.error('Unable to update live document verification.', error);
      toast.error('Document verification was not saved to live data.');
    }
  };

  const archiveDocument = async (document) => {
    if (!canArchive) {
      toast.error('You do not have permission to archive documents.');
      return;
    }
    const updates = {
      verificationStatus: 'Archived',
      archivedAtText: formatDisplayDate(),
    };
    try {
      await archiveManagedDocument(document.id, updates);
      setDocuments((prev) => prev.map((item) => item.id === document.id ? { ...item, ...updates } : item));
      toast.success('Document archived');
    } catch (error) {
      console.error('Unable to archive live document.', error);
      toast.error('Document archive was not saved to live data.');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'ownerType' ? { ownerId: '', ownerRecordId: '' } : {}),
    }));
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="text-sm font-bold text-slate-500 mb-2">Administration / <span className="text-[#f39a5f]">Document Management</span></div>
          <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {ownerFilter?.ownerName
              ? `Viewing uploaded documents for ${ownerFilter.ownerName}.`
              : 'Search documents first. Click one document to view metadata and verification actions.'}
          </p>
          {loading && <p className="text-xs text-slate-500 mt-2">Loading live document records...</p>}
          {!isFirebaseConfigured && <p className="text-xs text-rose-600 mt-2">Live Firebase data is not configured.</p>}
          {loadError && <p className="text-xs text-rose-600 mt-2">{loadError}</p>}
        </div>
        {!isOwnerFilterActive && canUpload && (
          <button onClick={() => setShowUploadModal(true)} disabled={!canUpload || uploading} className="h-10 px-5 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm flex items-center gap-2 disabled:bg-slate-300">
            <Plus size={16} /> {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <div className={`${selectedDocument ? 'xl:w-[68%]' : 'xl:w-full'} min-w-0 transition-all duration-300`}>
          {!isOwnerFilterActive && (
            <div className={`grid ${hideOwnerFilter ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-3 mb-4`}>
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search..." className="w-full h-10 rounded-lg bg-[#f0f0f2] border-0 pl-10 pr-3 text-sm" />
              </div>
              {!hideOwnerFilter && (
                <select value={activeFilters.ownerType || ''} onChange={(event) => updateFilter('ownerType', event.target.value)} className="h-10 rounded-lg bg-[#f0f0f2] border-0 px-3 text-sm">
                  <option value="">All Owners</option>
                  {documentOwnerTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              )}
              <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="h-10 rounded-lg bg-[#f0f0f2] border-0 px-3 text-sm">
                <option value="">All Categories</option>
                {documentCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-10 rounded-lg bg-[#f0f0f2] border-0 px-3 text-sm">
                <option value="">All Statuses</option>
                {documentStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          )}
          <DocumentTable
            documents={normalizedDocuments}
            canVerify={canModerateDocuments && canVerify}
            canArchive={canModerateDocuments && canArchive}
            onArchive={archiveDocument}
            onPreview={(document) => setSelectedId(document.id)}
            onVerify={updateVerification}
            onSelect={setSelectedId}
            selectedId={selectedDocumentId}
            emptyMessage="No documents found."
            showActions={false}
          />
        </div>
        {selectedDocument && (
          <DocumentPreviewPanel
            canArchive={canModerateDocuments && canArchive}
            canVerify={canModerateDocuments && canVerify}
            document={selectedDocument}
            showActions={canModerateDocuments}
            onArchive={archiveDocument}
            onVerify={updateVerification}
          />
        )}
      </div>

      {showUploadModal && <DocumentUploadModal students={courseStudents} staff={staff} onClose={() => setShowUploadModal(false)} onSave={saveDocument} />}
    </div>
  );
}
