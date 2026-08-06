import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportReport, listReports, runReport } from '../../api/reports';
import {
  buildReportList,
  buildReportQuery,
  formatReportValue,
  getReportDefinition,
  labelize,
  normalizeReportResult,
  reportFilterFields,
  summarizeReportResult,
} from './reportUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const textInputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-70';

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || ADMIN_ROLES.has(user?.role) || permissions.includes(permission);
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="tt-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? '-' : value}</div>
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ReportCard({ active, report, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(report.name)}
      className={`min-h-32 rounded-2xl border p-4 text-left transition ${
        active ? 'is-active border-brand-500 bg-white shadow-[0_8px_24px_rgba(0,0,0,.10)]' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-500">
          <FileText size={18} />
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-brand-500">
          {report.group}
        </span>
      </span>
      <span className="mt-4 block text-sm font-bold text-slate-900">{report.label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{report.name}</span>
      <span className="mt-3 block text-xs font-semibold text-slate-500">{report.description}</span>
    </button>
  );
}

function ReportFilters({ definition, disabled, filters, onChange, onRun }) {
  const fields = definition.filters || [];
  return (
    <section className="tt-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Filters</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{fields.length ? 'Report parameters.' : 'No parameters for this report.'}</p>
        </div>
        <SlidersHorizontal size={19} className="text-brand-500" />
      </div>
      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onRun();
        }}
      >
        {fields.map((field) => {
          const meta = reportFilterFields[field] || { label: labelize(field), placeholder: field };
          return (
            <label key={field}>
              <span className="mb-1.5 block text-xs font-bold text-slate-500">{meta.label}</span>
              <input
                value={filters[field] || ''}
                onChange={(event) => onChange(field, event.target.value)}
                placeholder={meta.placeholder}
                disabled={disabled}
                className={textInputClass}
              />
            </label>
          );
        })}
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-70"
        >
          {disabled ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Run
        </button>
      </form>
    </section>
  );
}

function SummaryPanel({ summary }) {
  const entries = Object.entries(summary || {});
  if (!entries.length) return null;
  return (
    <section className="tt-card p-5">
      <h2 className="mb-4 text-sm font-bold text-slate-900">Summary</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <div className="text-[11px] font-bold uppercase text-slate-500">{labelize(key)}</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{formatReportValue(key, value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportTable({ loading, result }) {
  const normalized = normalizeReportResult(result);
  const hasRows = normalized.rows.length > 0;
  return (
    <section className="tt-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Result</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{normalized.rows.length} rows and {normalized.columns.length} columns.</p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-brand-500">
          {normalized.name || 'Report'}
        </span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm font-semibold text-slate-500">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Running report...
        </div>
      ) : hasRows && normalized.columns.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                {normalized.columns.map((column) => (
                  <th key={column} className="px-5 py-3">{labelize(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalized.rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="border-t border-slate-100">
                  {normalized.columns.map((column) => (
                    <td key={`${row.id || rowIndex}-${column}`} className="px-5 py-4 font-semibold text-slate-500">
                      {formatReportValue(column, row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState message="No rows returned for this report." />
        </div>
      )}
    </section>
  );
}

export default function ReportsManagement({ currentUser }) {
  const [reports, setReports] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'reports.view');
  const canExport = hasPermission(currentUser, 'reports.export');
  const reportList = useMemo(() => buildReportList(reports), [reports]);
  const selectedReport = reportList.find((report) => report.name === selectedName) || reportList[0] || null;
  const selectedDefinition = selectedReport ? getReportDefinition(selectedReport.name) : { filters: [] };
  const normalizedResult = useMemo(() => normalizeReportResult(result || {}), [result]);
  const resultSummary = useMemo(() => summarizeReportResult(normalizedResult), [normalizedResult]);

  const executeReport = useCallback(async (name, nextFilters = {}) => {
    if (!canView || !name) return;
    const definition = getReportDefinition(name);
    const query = buildReportQuery(nextFilters, definition);
    setRunning(true);
    try {
      const data = await runReport(name, query);
      setResult(normalizeReportResult(data));
      setLoadError('');
    } catch (error) {
      console.error('Unable to run report.', error);
      setLoadError(error?.message || 'Unable to run report.');
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, [canView]);

  const loadReportList = useCallback(async () => {
    if (!canView) return;
    setLoadingList(true);
    try {
      const names = await listReports();
      setReports(names);
      const nextSelected = names[0] || '';
      setSelectedName(nextSelected);
      setFilters({});
      setLoadError('');
      if (nextSelected) await executeReport(nextSelected, {});
    } catch (error) {
      console.error('Unable to load reports.', error);
      setLoadError(error?.message || 'Unable to load reports.');
    } finally {
      setLoadingList(false);
    }
  }, [canView, executeReport]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadReportList();
    });
    return () => {
      active = false;
    };
  }, [loadReportList]);

  const selectReport = (name) => {
    if (name === selectedName) return;
    setSelectedName(name);
    setFilters({});
    executeReport(name, {});
  };

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const exportSelectedReport = async () => {
    if (!canExport || !selectedName) {
      toast.error('You do not have permission to export reports.');
      return;
    }
    setExporting(true);
    try {
      const query = buildReportQuery(filters, selectedDefinition);
      const { blob, filename } = await exportReport(selectedName, query);
      downloadBlob(blob, filename);
      toast.success('Report exported');
    } catch (error) {
      toast.error(error?.message || 'Report was not exported.');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <div className="min-w-0">
        <EmptyState message="You do not have permission to view reports." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={loadReportList}
            disabled={loadingList || running}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-slate-50 disabled:opacity-70"
          >
            {loadingList ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          {canExport && (
            <button
              type="button"
              onClick={exportSelectedReport}
              disabled={exporting || !selectedName}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-70"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<FileText size={20} className="text-brand-500" />} label="Reports" loading={loadingList} value={reports.length} />
        <SummaryCard icon={<BarChart3 size={20} className="text-brand-500" />} label="Rows" loading={running} value={resultSummary.rows} />
        <SummaryCard icon={<SlidersHorizontal size={20} className="text-brand-500" />} label="Columns" loading={running} value={resultSummary.columns} />
        <SummaryCard icon={<Download size={20} className="text-brand-500" />} label="Summary Fields" loading={running} value={resultSummary.summaryFields} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="tt-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-bold text-slate-900">Available Reports</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-brand-500">{reports.length}</span>
          </div>
          <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
            {loadingList && (
              <div className="p-6 text-center text-sm font-semibold text-slate-500">
                <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading reports...
              </div>
            )}
            {!loadingList && reportList.map((report) => (
              <ReportCard
                key={report.name}
                active={selectedReport?.name === report.name}
                report={report}
                onSelect={selectReport}
              />
            ))}
            {!loadingList && !reportList.length && <EmptyState message="No reports available." />}
          </div>
        </section>

        <div className="space-y-5">
          {selectedReport && (
            <section className="tt-card p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-brand-500">{selectedReport.group}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedReport.label}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{selectedReport.description}</p>
                </div>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase text-emerald-700">
                  {selectedReport.name}
                </span>
              </div>
            </section>
          )}

          {selectedReport && (
            <ReportFilters
              definition={selectedDefinition}
              disabled={running}
              filters={filters}
              onChange={updateFilter}
              onRun={() => executeReport(selectedName, filters)}
            />
          )}

          <SummaryPanel summary={normalizedResult.summary} />
          <ReportTable loading={running} result={normalizedResult} />
        </div>
      </div>
    </div>
  );
}
