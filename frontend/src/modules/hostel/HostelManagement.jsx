import { useEffect, useMemo, useState } from 'react';
import { BedDouble, ClipboardList, Home, Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createHostelAllocation,
  createHostelRecord,
  createHostelRoom,
  getHostelManagementData,
  updateHostelRoom,
} from '../../firebase/db';
import { isFirebaseConfigured } from '../../firebase/config';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';
import StatusBadge from '../students/components/StatusBadge';
import {
  filterHostelItems,
  formatDisplayDate,
  summarizeHostel,
  validateHostelAllocation,
  validateHostelRecord,
  validateHostelRoom,
} from './hostelUtils';
import { filterStudentScopedRecords } from '../shared/courseFilters';

const tabs = [
  ['rooms', 'Rooms'],
  ['allocations', 'Allocations'],
  ['records', 'Records'],
];

function HostelEntryModal({ activeTab, rooms, allocations, scopedStudents, academicYear, onClose, onSave }) {
  const [form, setForm] = useState({
    roomId: '',
    roomNo: '',
    hostelName: '',
    blockName: '',
    floor: '',
    capacity: '',
    occupiedCount: '',
    wardenName: '',
    studentRecordId: '',
    allocatedOn: '',
    recordType: '',
    title: '',
    recordDate: '',
    notes: '',
    status: activeTab === 'records' ? 'Open' : 'Active',
  });
  const label = tabs.find(([id]) => id === activeTab)?.[1].slice(0, -1) || 'Record';
  const allocatedKeys = new Set(
    allocations
      .filter((item) => item.status === 'Active')
      .flatMap((item) => [item.studentRecordId, item.studentId].filter(Boolean))
  );
  const availableStudents = scopedStudents.filter((student) => !allocatedKeys.has(student.id) && !allocatedKeys.has(student.studentId));
  const availableRooms = rooms.filter((room) => room.status !== 'Archived' && Number(room.occupiedCount || 0) < Number(room.capacity || 0));
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const selectRoom = (roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    setForm((prev) => ({
      ...prev,
      roomId,
      roomNo: room?.roomNo || prev.roomNo,
      hostelName: room?.hostelName || prev.hostelName,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New {label}</h2>
            <p className="text-sm text-slate-500">Save a live hostel record for {academicYear}.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500">x</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          {activeTab === 'rooms' && (
            <>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Room Number</span>
                <input value={form.roomNo} onChange={(event) => update('roomNo', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Hostel Name</span>
                <input value={form.hostelName} onChange={(event) => update('hostelName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Block</span>
                <input value={form.blockName} onChange={(event) => update('blockName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Floor</span>
                <input value={form.floor} onChange={(event) => update('floor', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Capacity</span>
                <input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Occupied Count</span>
                <input type="number" min="0" value={form.occupiedCount} onChange={(event) => update('occupiedCount', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Warden Name</span>
                <input value={form.wardenName} onChange={(event) => update('wardenName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Status</span>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                  {['Available', 'Full', 'Maintenance', 'Archived'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </>
          )}

          {activeTab === 'allocations' && (
            <>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Student</span>
                <select value={form.studentRecordId} onChange={(event) => update('studentRecordId', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus>
                  <option value="">Select student</option>
                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.name} ({student.studentId})</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Room</span>
                <select value={form.roomId} onChange={(event) => selectRoom(event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">Select room</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.hostelName} / {room.roomNo}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Allocated On</span>
                <input type="date" value={form.allocatedOn} onChange={(event) => update('allocatedOn', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Status</span>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                  {['Active', 'Released'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </>
          )}

          {activeTab === 'records' && (
            <>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Record Type</span>
                <input value={form.recordType} onChange={(event) => update('recordType', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" autoFocus />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Title</span>
                <input value={form.title} onChange={(event) => update('title', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Linked Room</span>
                <select value={form.roomId} onChange={(event) => selectRoom(event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">No linked room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.hostelName} / {room.roomNo}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Record Date</span>
                <input type="date" value={form.recordDate} onChange={(event) => update('recordDate', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Hostel Name</span>
                <input value={form.hostelName} onChange={(event) => update('hostelName', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Room Number</span>
                <input value={form.roomNo} onChange={(event) => update('roomNo', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Status</span>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                  {['Open', 'Closed', 'Archived'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</span>
                <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="w-full min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">Cancel</button>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#33373e] text-white font-semibold text-sm">Save {label}</button>
        </div>
      </form>
    </div>
  );
}

export default function HostelManagement({ currentUser, academicYear = '', scopedStudents = [], selectedCourse = null, selectedCourseCode = 'all' }) {
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('rooms');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);

  useEffect(() => {
    const loadHostel = async () => {
      if (!isFirebaseConfigured) {
        setLoadError('Live Firebase data is not configured.');
        return;
      }
      try {
        const data = await getHostelManagementData(academicYear);
        setRooms(data.hostelRooms);
        setAllocations(data.hostelAllocations);
        setRecords(data.hostelRecords);
        setLoadError('');
      } catch (error) {
        console.warn('Unable to load live hostel data.', error);
        setLoadError('Unable to load live hostel records.');
      }
    };
    loadHostel();
  }, [academicYear]);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canManage = canAccess(defaultRoles, currentRoleId, 'hostel.manage');
  const visibleAllocations = useMemo(
    () => filterStudentScopedRecords(allocations, scopedStudents, selectedCourseCode, selectedCourse),
    [allocations, scopedStudents, selectedCourse, selectedCourseCode]
  );
  const summary = useMemo(() => summarizeHostel(rooms, visibleAllocations, records), [rooms, records, visibleAllocations]);

  const activeRows = useMemo(() => {
    const source = activeTab === 'rooms' ? rooms : activeTab === 'allocations' ? visibleAllocations : records;
    return filterHostelItems(source, search);
  }, [activeTab, records, rooms, search, visibleAllocations]);

  const saveHostelEntry = async (form) => {
    if (!canManage) {
      toast.error('You do not have permission to manage hostel records.');
      return;
    }

    const createdAtText = formatDisplayDate();
    try {
      if (activeTab === 'rooms') {
        const payload = {
          roomNo: form.roomNo.trim(),
          hostelName: form.hostelName.trim(),
          blockName: form.blockName.trim(),
          floor: form.floor.trim(),
          capacity: Number(form.capacity || 0),
          occupiedCount: Number(form.occupiedCount || 0),
          status: form.status || 'Available',
          academicYear,
          wardenName: form.wardenName.trim(),
          createdAtText,
        };
        const message = validateHostelRoom(payload);
        if (message) return toast.error(message);
        const id = await createHostelRoom(payload);
        if (!id) throw new Error('Live hostel room was not created.');
        setRooms((prev) => [{ id, ...payload }, ...prev]);
      } else if (activeTab === 'allocations') {
        const room = rooms.find((item) => item.id === form.roomId);
        if (!room) {
          toast.error('Select an available hostel room.');
          return;
        }
        if (Number(room.occupiedCount || 0) >= Number(room.capacity || 0)) {
          toast.error('Selected hostel room is already full.');
          return;
        }
        const student = scopedStudents.find((item) => item.id === form.studentRecordId);
        if (!student) {
          toast.error('Select a student to allocate.');
          return;
        }
        const payload = {
          studentRecordId: student.id,
          studentName: student.name,
          studentId: student.studentId,
          courseName: student.courseName || student.program || selectedCourse?.courseName || selectedCourse?.name || '',
          courseCode: student.courseCode || (selectedCourseCode === 'all' ? '' : selectedCourseCode),
          roomNo: room.roomNo,
          hostelName: room.hostelName,
          allocatedOn: form.allocatedOn || '',
          academicYear,
          status: form.status || 'Active',
          guardianPhone: student.phone || '',
          createdAtText,
        };
        const message = validateHostelAllocation(payload);
        if (message) return toast.error(message);
        const id = await createHostelAllocation(payload);
        if (!id) throw new Error('Live hostel allocation was not created.');
        const occupiedCount = Number(room.occupiedCount || 0) + 1;
        const roomUpdates = {
          occupiedCount,
          status: occupiedCount >= Number(room.capacity || 0) ? 'Full' : 'Available',
        };
        await updateHostelRoom(room.id, roomUpdates);
        setAllocations((prev) => [{ id, ...payload }, ...prev]);
        setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, ...roomUpdates } : item));
      } else {
        const room = rooms.find((item) => item.id === form.roomId);
        const payload = {
          recordType: form.recordType.trim(),
          title: form.title.trim(),
          hostelName: (room?.hostelName || form.hostelName).trim(),
          roomNo: (room?.roomNo || form.roomNo).trim(),
          recordDate: form.recordDate || '',
          status: form.status || 'Open',
          notes: form.notes.trim(),
          academicYear,
          createdAtText,
        };
        const message = validateHostelRecord(payload);
        if (message) return toast.error(message);
        const id = await createHostelRecord(payload);
        if (!id) throw new Error('Live hostel record was not created.');
        setRecords((prev) => [{ id, ...payload }, ...prev]);
      }
      toast.success('Record created');
      setShowEntryModal(false);
    } catch (error) {
      console.error('Unable to create live hostel record.', error);
      toast.error('Record was not saved to live data.');
    }
  };

  const renderRow = (item) => {
    if (activeTab === 'rooms') {
      return [
        `${item.hostelName} / ${item.roomNo}`,
        `${item.blockName || '-'} - Floor ${item.floor || '-'}`,
        `${Number(item.occupiedCount || 0)} / ${Number(item.capacity || 0)} occupied`,
        item.status,
      ];
    }
    if (activeTab === 'allocations') {
      return [
        item.studentName,
        item.studentId,
        `${item.hostelName || '-'} / ${item.roomNo || '-'}`,
        item.status,
      ];
    }
    return [
      item.title,
      item.recordType,
      `${item.hostelName || '-'} ${item.roomNo || ''}`.trim(),
      item.status,
    ];
  };

  const metricCards = [
    ['Rooms', summary.rooms, <Home size={20} />],
    ['Capacity', summary.totalCapacity, <BedDouble size={20} />],
    ['Occupied', `${summary.occupancyRate}%`, <Users size={20} />],
    ['Open Records', summary.openRecords, <ClipboardList size={20} />],
  ];

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="text-sm font-bold text-slate-500 mb-2">Campus Services / <span className="text-[#f39a5f]">Hostel Management</span></div>
          <h1 className="text-2xl font-bold text-slate-900">Hostel Management</h1>
          <p className="text-sm text-slate-500 mt-1">Room allocation, hostel occupancy tracking, and hostel records management.</p>
          {!isFirebaseConfigured && <p className="text-xs text-rose-600 mt-2">Live Firebase data is not configured.</p>}
          {loadError && <p className="text-xs text-rose-600 mt-2">{loadError}</p>}
        </div>
        <button onClick={() => setShowEntryModal(true)} disabled={!canManage} className="h-10 px-5 rounded-full bg-[#fb9a5b] text-white font-semibold text-sm flex items-center gap-2 disabled:bg-slate-300">
          <Plus size={16} /> New {tabs.find(([id]) => id === activeTab)?.[1].slice(0, -1)}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 py-5">
        {metricCards.map(([label, value, icon]) => (
          <div key={label} className="rounded-lg bg-white border border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="h-11 w-11 rounded-lg bg-[#f5f5f6] text-[#fb8d49] flex items-center justify-center">{icon}</span>
              <span className="text-2xl font-extrabold text-slate-900">{value}</span>
            </div>
            <div className="text-xs font-bold text-slate-500 mt-3">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`h-10 px-4 rounded-md border text-sm font-semibold ${activeTab === id ? 'bg-[#33373e] text-white border-[#33373e]' : 'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rooms, students, records..." className="w-full h-11 rounded-lg bg-[#f0f0f2] border-0 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
      </div>
      <div className="overflow-hidden border border-slate-100 rounded-lg bg-white">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-[#f5f5f6] text-slate-500">
            <tr>{['Name', 'Details', 'Room / Occupancy', 'Status'].map((item) => <th key={item} className="text-left px-4 py-3 font-semibold">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeRows.map((item) => {
              const [a, b, c, d] = renderRow(item);
              return <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{a}</td><td className="px-4 py-3">{b}</td><td className="px-4 py-3">{c}</td><td className="px-4 py-3"><StatusBadge value={d} /></td></tr>;
            })}
            {!activeRows.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500">No hostel records found.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      {showEntryModal && (
        <HostelEntryModal
          activeTab={activeTab}
          rooms={rooms}
          allocations={allocations}
          scopedStudents={scopedStudents}
          academicYear={academicYear}
          onClose={() => setShowEntryModal(false)}
          onSave={saveHostelEntry}
        />
      )}
    </div>
  );
}
