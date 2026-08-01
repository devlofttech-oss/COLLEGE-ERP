const MB = 1024 * 1024;

export const fileFolderPolicies = [
  {
    id: 'profile-photos',
    label: 'Profile Photos',
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * MB,
    public: true,
  },
  {
    id: 'institution',
    label: 'Institution',
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxBytes: 5 * MB,
    public: true,
  },
  {
    id: 'student-documents',
    label: 'Student Documents',
    types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
    public: false,
  },
  {
    id: 'staff-documents',
    label: 'Staff Documents',
    types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
    public: false,
  },
  {
    id: 'managed-documents',
    label: 'Managed Documents',
    types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
    public: false,
  },
  {
    id: 'subject-notes',
    label: 'Subject Notes',
    types: ['application/pdf'],
    maxBytes: 25 * MB,
    public: false,
  },
  {
    id: 'communication-attachments',
    label: 'Communication Attachments',
    types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
    public: false,
  },
  {
    id: 'receipts',
    label: 'Receipts',
    types: ['application/pdf'],
    maxBytes: 5 * MB,
    public: false,
  },
  {
    id: 'report-cards',
    label: 'Report Cards',
    types: ['application/pdf'],
    maxBytes: 5 * MB,
    public: false,
  },
  {
    id: 'id-cards',
    label: 'ID Cards',
    types: ['application/pdf', 'image/png'],
    maxBytes: 5 * MB,
    public: false,
  },
];

function asNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getFolderPolicy(folder = '') {
  return fileFolderPolicies.find((policy) => policy.id === folder) || null;
}

export function formatBytes(value = 0) {
  const bytes = asNumber(value);
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  return `${bytes} B`;
}

export function acceptedTypesForFolder(folder = '') {
  return getFolderPolicy(folder)?.types.join(',') || '';
}

export function validateUploadInput({ folder, filename, contentType, sizeBytes } = {}) {
  if (!folder) return 'Folder is required.';
  if (!filename?.trim()) return 'Filename is required.';
  const policy = getFolderPolicy(folder);
  if (!policy) return `Unknown upload folder: ${folder}`;
  if (contentType && policy.types.length && !policy.types.includes(contentType)) {
    return `File type ${contentType} is not allowed for ${folder}.`;
  }
  if (sizeBytes && asNumber(sizeBytes) > policy.maxBytes) {
    return `File too large. Max for ${folder} is ${formatBytes(policy.maxBytes)}.`;
  }
  return '';
}

export function buildPresignUploadPayload(form = {}, selectedFile = null) {
  const filename = form.filename?.trim() || selectedFile?.name || '';
  const contentType = form.contentType?.trim() || selectedFile?.type || '';
  const sizeBytes = form.sizeBytes || selectedFile?.size || '';
  return {
    folder: form.folder,
    ownerId: form.ownerId?.trim() || '',
    filename,
    contentType,
    sizeBytes: sizeBytes === '' ? undefined : asNumber(sizeBytes),
  };
}

export function keyFolder(key = '') {
  return String(key || '').split('/')[0] || '';
}

export function summarizeUploadResult(result = {}) {
  return {
    key: result.key || '',
    method: result.method || 'PUT',
    public: Boolean(result.public),
    publicUrl: result.publicUrl || '',
    expiresIn: asNumber(result.expiresIn),
  };
}
