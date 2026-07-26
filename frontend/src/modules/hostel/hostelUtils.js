export function formatDisplayDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function summarizeHostel(rooms = [], allocations = [], records = []) {
  const activeRooms = rooms.filter((item) => item.status !== 'Archived');
  const totalCapacity = activeRooms.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
  const occupied = activeRooms.reduce((sum, item) => sum + Number(item.occupiedCount || 0), 0);
  const activeAllocations = allocations.filter((item) => item.status === 'Active').length;
  const openRecords = records.filter((item) => !['Closed', 'Archived'].includes(item.status)).length;
  return {
    rooms: activeRooms.length,
    totalCapacity,
    occupied,
    available: Math.max(totalCapacity - occupied, 0),
    occupancyRate: totalCapacity ? Math.round((occupied / totalCapacity) * 100) : 0,
    activeAllocations,
    openRecords,
  };
}

export function filterHostelItems(items = [], search = '') {
  const term = search.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    [
      item.roomNo,
      item.hostelName,
      item.blockName,
      item.wardenName,
      item.studentName,
      item.studentId,
      item.courseName,
      item.recordType,
      item.title,
      item.status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  );
}

export function validateHostelRoom(form = {}) {
  if (!form.roomNo?.trim()) return 'Room number is required.';
  if (!form.hostelName?.trim()) return 'Hostel name is required.';
  if (Number(form.capacity || 0) < 1) return 'Room capacity must be at least 1.';
  if (Number(form.occupiedCount || 0) > Number(form.capacity || 0)) return 'Occupied count cannot exceed capacity.';
  return '';
}

export function validateHostelAllocation(form = {}) {
  if (!form.studentName?.trim()) return 'Student name is required.';
  if (!form.studentId?.trim()) return 'Student ID is required.';
  if (!form.roomNo?.trim()) return 'Room number is required.';
  if (!form.hostelName?.trim()) return 'Hostel name is required.';
  return '';
}

export function validateHostelRecord(form = {}) {
  if (!form.title?.trim()) return 'Record title is required.';
  if (!form.recordType?.trim()) return 'Record type is required.';
  return '';
}
