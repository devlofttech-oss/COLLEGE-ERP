import assert from 'node:assert/strict';
import {
  acceptedTypesForFolder,
  buildPresignUploadPayload,
  fileFolderPolicies,
  formatBytes,
  getFolderPolicy,
  keyFolder,
  summarizeUploadResult,
  validateUploadInput,
} from '../src/modules/files/fileUtils.js';

assert.equal(fileFolderPolicies.length, 10);
assert.deepEqual(fileFolderPolicies.map((policy) => policy.id), [
  'profile-photos',
  'institution',
  'student-documents',
  'staff-documents',
  'managed-documents',
  'subject-notes',
  'communication-attachments',
  'receipts',
  'report-cards',
  'id-cards',
]);

assert.equal(getFolderPolicy('subject-notes').maxBytes, 25 * 1024 * 1024);
assert.equal(getFolderPolicy('profile-photos').public, true);
assert.equal(getFolderPolicy('student-documents').public, false);
assert.equal(acceptedTypesForFolder('id-cards'), 'application/pdf,image/png');
assert.equal(formatBytes(5 * 1024 * 1024), '5 MB');
assert.equal(formatBytes(1536), '1.5 KB');
assert.equal(formatBytes(12), '12 B');

assert.equal(validateUploadInput({}), 'Folder is required.');
assert.equal(validateUploadInput({ folder: 'bad', filename: 'a.pdf' }), 'Unknown upload folder: bad');
assert.equal(validateUploadInput({ folder: 'receipts', filename: 'a.png', contentType: 'image/png' }), 'File type image/png is not allowed for receipts.');
assert.equal(validateUploadInput({ folder: 'receipts', filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 6 * 1024 * 1024 }), 'File too large. Max for receipts is 5 MB.');
assert.equal(validateUploadInput({ folder: 'receipts', filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 1024 }), '');

assert.deepEqual(buildPresignUploadPayload({
  folder: 'student-documents',
  ownerId: ' stu-1 ',
  filename: '',
  contentType: '',
}, { name: 'admission.pdf', type: 'application/pdf', size: 1024 }), {
  folder: 'student-documents',
  ownerId: 'stu-1',
  filename: 'admission.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1024,
});

assert.equal(keyFolder('student-documents/stu-1/1-file.pdf'), 'student-documents');
assert.deepEqual(summarizeUploadResult({
  key: 'institution/general/logo.png',
  method: 'PUT',
  public: true,
  publicUrl: 'https://cdn.example/logo.png',
  expiresIn: 300,
}), {
  key: 'institution/general/logo.png',
  method: 'PUT',
  public: true,
  publicUrl: 'https://cdn.example/logo.png',
  expiresIn: 300,
});

console.log('Files tests passed.');
