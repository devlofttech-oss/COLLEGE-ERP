import { useMemo, useState } from 'react';
import {
  Clipboard,
  Download,
  ExternalLink,
  FileKey2,
  Files,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteStoredFile,
  presignDownload,
  presignUpload,
  resolveStoredFile,
  uploadPresignedFile,
} from '../../api/files';
import {
  acceptedTypesForFolder,
  buildPresignUploadPayload,
  fileFolderPolicies,
  formatBytes,
  getFolderPolicy,
  keyFolder,
  summarizeUploadResult,
  validateUploadInput,
} from './fileUtils';

const textInputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-70';

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="tt-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ResultBox({ result }) {
  const entries = Object.entries(result || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return <EmptyState message="No response yet." />;
  return (
    <div className="grid gap-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[11px] font-bold uppercase text-slate-500">{key}</div>
          <div className="mt-1 break-all text-xs font-bold text-slate-900">
            {typeof value === 'boolean' ? String(value) : typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(value).then(
    () => toast.success('Copied'),
    () => toast.error('Copy failed')
  );
}

function openUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function FilesManagement() {
  const [uploadForm, setUploadForm] = useState({
    folder: 'student-documents',
    ownerId: '',
    filename: '',
    contentType: '',
    sizeBytes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [downloadForm, setDownloadForm] = useState({ key: '', name: '' });
  const [downloadResult, setDownloadResult] = useState(null);
  const [resolveKey, setResolveKey] = useState('');
  const [resolveResult, setResolveResult] = useState(null);
  const [deleteKey, setDeleteKey] = useState('');
  const [deleteResult, setDeleteResult] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');

  const selectedPolicy = useMemo(() => getFolderPolicy(uploadForm.folder), [uploadForm.folder]);
  const uploadSummary = summarizeUploadResult(uploadResult || {});
  const privateFolders = fileFolderPolicies.filter((policy) => !policy.public).length;
  const publicFolders = fileFolderPolicies.filter((policy) => policy.public).length;

  const updateUploadForm = (field, value) => {
    setUploadForm((current) => ({ ...current, [field]: value }));
  };

  const chooseFile = (file) => {
    setSelectedFile(file || null);
    if (!file) return;
    setUploadForm((current) => ({
      ...current,
      filename: file.name,
      contentType: file.type || current.contentType,
      sizeBytes: file.size,
    }));
    setUploaded(false);
  };

  const createUploadUrl = async (event) => {
    event.preventDefault();
    const payload = buildPresignUploadPayload(uploadForm, selectedFile);
    const validationMessage = validateUploadInput(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setBusyAction('presign-upload');
    try {
      const result = await presignUpload(payload);
      setUploadResult(result);
      setUploaded(false);
      setError('');
      toast.success('Upload URL generated');
    } catch (requestError) {
      setError(requestError?.message || 'Upload URL was not generated.');
      toast.error(requestError?.message || 'Upload URL was not generated.');
    } finally {
      setBusyAction('');
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile || !uploadResult?.uploadUrl) return;
    setBusyAction('upload-file');
    try {
      await uploadPresignedFile({
        uploadUrl: uploadResult.uploadUrl,
        method: uploadResult.method,
        headers: uploadResult.headers,
        file: selectedFile,
      });
      setUploaded(true);
      setError('');
      toast.success('File uploaded');
    } catch (requestError) {
      setError(requestError?.message || 'File upload failed.');
      toast.error(requestError?.message || 'File upload failed.');
    } finally {
      setBusyAction('');
    }
  };

  const createDownloadUrl = async (event) => {
    event.preventDefault();
    if (!downloadForm.key.trim()) {
      toast.error('Key is required.');
      return;
    }
    setBusyAction('presign-download');
    try {
      const result = await presignDownload({ key: downloadForm.key.trim(), name: downloadForm.name.trim() });
      setDownloadResult(result);
      setError('');
      toast.success('Download URL generated');
    } catch (requestError) {
      setError(requestError?.message || 'Download URL was not generated.');
      toast.error(requestError?.message || 'Download URL was not generated.');
    } finally {
      setBusyAction('');
    }
  };

  const resolveKeyUrl = async (event) => {
    event.preventDefault();
    if (!resolveKey.trim()) {
      toast.error('Key is required.');
      return;
    }
    setBusyAction('resolve');
    try {
      const result = await resolveStoredFile({ key: resolveKey.trim() });
      setResolveResult(result);
      setError('');
      toast.success('File URL resolved');
    } catch (requestError) {
      setError(requestError?.message || 'File URL was not resolved.');
      toast.error(requestError?.message || 'File URL was not resolved.');
    } finally {
      setBusyAction('');
    }
  };

  const deleteKeyObject = async (event) => {
    event.preventDefault();
    if (!deleteKey.trim()) {
      toast.error('Key is required.');
      return;
    }
    if (!window.confirm('Delete this stored object?')) return;
    setBusyAction('delete');
    try {
      const result = await deleteStoredFile(deleteKey.trim());
      setDeleteResult(result);
      setError('');
      toast.success('Object deleted');
    } catch (requestError) {
      setError(requestError?.message || 'Object was not deleted.');
      toast.error(requestError?.message || 'Object was not deleted.');
    } finally {
      setBusyAction('');
    }
  };

  const applyKeyToTools = (key) => {
    setDownloadForm((current) => ({ ...current, key }));
    setResolveKey(key);
    setDeleteKey(key);
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Files</h1>
          {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Files size={20} className="text-brand-500" />} label="Folders" value={fileFolderPolicies.length} />
        <SummaryCard icon={<ShieldCheck size={20} className="text-brand-500" />} label="Private" value={privateFolders} />
        <SummaryCard icon={<ExternalLink size={20} className="text-brand-500" />} label="Public" value={publicFolders} />
        <SummaryCard icon={<FileKey2 size={20} className="text-brand-500" />} label="Upload URL TTL" value="300s" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Presign Upload</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Generate a direct browser-to-R2 PUT URL.</p>
              </div>
              <UploadCloud size={20} className="text-brand-500" />
            </div>
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={createUploadUrl}>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Folder</span>
                <select value={uploadForm.folder} onChange={(event) => updateUploadForm('folder', event.target.value)} className={textInputClass}>
                  {fileFolderPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>{policy.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Owner ID</span>
                <input value={uploadForm.ownerId} onChange={(event) => updateUploadForm('ownerId', event.target.value)} placeholder="owner id" className={textInputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">File</span>
                <input type="file" accept={acceptedTypesForFolder(uploadForm.folder)} onChange={(event) => chooseFile(event.target.files?.[0] || null)} className={textInputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Filename</span>
                <input value={uploadForm.filename} onChange={(event) => updateUploadForm('filename', event.target.value)} placeholder="file.pdf" className={textInputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Content Type</span>
                <input value={uploadForm.contentType} onChange={(event) => updateUploadForm('contentType', event.target.value)} placeholder="application/pdf" className={textInputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Size Bytes</span>
                <input type="number" value={uploadForm.sizeBytes} onChange={(event) => updateUploadForm('sizeBytes', event.target.value)} placeholder="1024" className={textInputClass} />
              </label>
              <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-3">
                <button type="submit" disabled={busyAction === 'presign-upload'} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-70">
                  {busyAction === 'presign-upload' ? <Loader2 size={16} className="animate-spin" /> : <FileKey2 size={16} />} Generate URL
                </button>
                <button type="button" onClick={uploadSelectedFile} disabled={!selectedFile || !uploadResult?.uploadUrl || busyAction === 'upload-file'} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-slate-50 disabled:opacity-70">
                  {busyAction === 'upload-file' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Upload File
                </button>
                {uploaded && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase text-emerald-700">Uploaded</span>}
              </div>
            </form>
          </section>

          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Download / Resolve / Delete</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Operate on an existing R2 object key.</p>
              </div>
              <Download size={20} className="text-brand-500" />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <form className="rounded-2xl bg-slate-50 border border-slate-100 p-4" onSubmit={createDownloadUrl}>
                <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">Presign Download</h3>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-500">Key</span>
                  <input value={downloadForm.key} onChange={(event) => setDownloadForm((current) => ({ ...current, key: event.target.value }))} className={textInputClass} />
                </label>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-500">Download Name</span>
                  <input value={downloadForm.name} onChange={(event) => setDownloadForm((current) => ({ ...current, name: event.target.value }))} className={textInputClass} />
                </label>
                <button type="submit" disabled={busyAction === 'presign-download'} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-70">
                  {busyAction === 'presign-download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Generate
                </button>
              </form>

              <form className="rounded-2xl bg-slate-50 border border-slate-100 p-4" onSubmit={resolveKeyUrl}>
                <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">Resolve URL</h3>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-500">Key</span>
                  <input value={resolveKey} onChange={(event) => setResolveKey(event.target.value)} className={textInputClass} />
                </label>
                <button type="submit" disabled={busyAction === 'resolve'} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-70">
                  {busyAction === 'resolve' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />} Resolve
                </button>
              </form>

              <form className="rounded-2xl bg-slate-50 border border-slate-100 p-4" onSubmit={deleteKeyObject}>
                <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">Delete Object</h3>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-500">Key</span>
                  <input value={deleteKey} onChange={(event) => setDeleteKey(event.target.value)} className={textInputClass} />
                </label>
                <button type="submit" disabled={busyAction === 'delete'} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-70">
                  {busyAction === 'delete' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
                </button>
              </form>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Folder Policy</h2>
              <ShieldCheck size={19} className="text-brand-500" />
            </div>
            {selectedPolicy ? (
              <div className="space-y-3 text-sm font-semibold text-slate-500">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] font-bold uppercase">Visibility</div>
                  <div className="mt-1 text-slate-900">{selectedPolicy.public ? 'Public URL' : 'Private presigned URL'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] font-bold uppercase">Max Size</div>
                  <div className="mt-1 text-slate-900">{formatBytes(selectedPolicy.maxBytes)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] font-bold uppercase">Allowed Types</div>
                  <div className="mt-1 break-words text-slate-900">{selectedPolicy.types.join(', ')}</div>
                </div>
              </div>
            ) : <EmptyState message="Select a folder." />}
          </section>

          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Latest Upload Response</h2>
              <FileKey2 size={19} className="text-brand-500" />
            </div>
            {uploadResult?.key && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => applyKeyToTools(uploadResult.key)} className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-700 px-3 text-xs font-bold text-white">Use Key</button>
                <button type="button" onClick={() => copyText(uploadResult.key)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700 hover:bg-slate-50"><Clipboard size={14} /> Copy Key</button>
                {uploadResult.publicUrl && <button type="button" onClick={() => openUrl(uploadResult.publicUrl)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700 hover:bg-slate-50"><ExternalLink size={14} /> Open</button>}
              </div>
            )}
            <ResultBox result={uploadSummary.key ? uploadSummary : null} />
          </section>

          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Key Tools Response</h2>
              <Files size={19} className="text-brand-500" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase text-slate-500">Download</div>
                {downloadResult?.url && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openUrl(downloadResult.url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white"><ExternalLink size={14} /> Open</button>
                    <button type="button" onClick={() => copyText(downloadResult.url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700 hover:bg-slate-50"><Clipboard size={14} /> Copy URL</button>
                  </div>
                )}
                <ResultBox result={downloadResult} />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase text-slate-500">Resolve</div>
                {resolveResult?.url && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openUrl(resolveResult.url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white"><ExternalLink size={14} /> Open</button>
                    <button type="button" onClick={() => copyText(resolveResult.url)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700 hover:bg-slate-50"><Clipboard size={14} /> Copy URL</button>
                  </div>
                )}
                <ResultBox result={resolveResult ? { ...resolveResult, folder: keyFolder(resolveResult.key) } : null} />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase text-slate-500">Delete</div>
                <ResultBox result={deleteResult} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
