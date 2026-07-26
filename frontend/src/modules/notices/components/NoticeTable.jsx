import { Archive, Edit3, Eye, Send } from 'lucide-react';
import StatusBadge from '../../students/components/StatusBadge';
import { getNoticeDisplayStatus } from '../noticeUtils';

export default function NoticeTable({ notices, canArchive = false, canEdit = false, showActions = true, onEdit, onPreview, onArchive, onPublish }) {
  const columnCount = showActions ? 6 : 5;

  return (
    <div className="overflow-hidden border border-slate-100 rounded-lg bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f6] text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Announcement</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Audience</th>
              <th className="text-left px-4 py-3 font-semibold">Publish</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              {showActions && <th className="text-right px-4 py-3 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notices.map((item) => (
              <tr key={item.id} onClick={() => onPreview(item)} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.referenceNo || 'No reference'} | {item.priority}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.type}</td>
                <td className="px-4 py-3 text-slate-600">{item.audience}</td>
                <td className="px-4 py-3 text-slate-600">{item.publishDate}</td>
                <td className="px-4 py-3"><StatusBadge value={getNoticeDisplayStatus(item)} /></td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={(event) => { event.stopPropagation(); onPreview(item); }} className="h-8 w-8 rounded-md bg-white border border-slate-200 inline-flex items-center justify-center"><Eye size={14} /></button>
                      <button onClick={(event) => { event.stopPropagation(); onEdit(item); }} disabled={!canEdit} className="h-8 w-8 rounded-md bg-white border border-slate-200 inline-flex items-center justify-center disabled:text-slate-300"><Edit3 size={14} /></button>
                      <button onClick={(event) => { event.stopPropagation(); onPublish(item); }} disabled={!canEdit || item.status !== 'Draft'} className="h-8 w-8 rounded-md bg-white border border-slate-200 inline-flex items-center justify-center disabled:text-slate-300" title="Publish"><Send size={14} /></button>
                      <button onClick={(event) => { event.stopPropagation(); onArchive(item); }} disabled={!canArchive || item.status === 'Archived'} className="h-8 w-8 rounded-md bg-white border border-slate-200 inline-flex items-center justify-center disabled:text-slate-300"><Archive size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!notices.length && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">No announcements found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
