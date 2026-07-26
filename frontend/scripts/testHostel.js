import assert from 'node:assert/strict';
import {
  filterHostelItems,
  summarizeHostel,
  validateHostelAllocation,
  validateHostelRecord,
  validateHostelRoom,
} from '../src/modules/hostel/hostelUtils.js';

const rooms = [
  { id: 'r1', roomNo: '101', hostelName: 'Main Hostel', capacity: 4, occupiedCount: 3, status: 'Available' },
  { id: 'r2', roomNo: '102', hostelName: 'Main Hostel', capacity: 4, occupiedCount: 4, status: 'Full' },
  { id: 'r3', roomNo: '103', hostelName: 'Main Hostel', capacity: 2, occupiedCount: 0, status: 'Archived' },
];
const allocations = [
  { id: 'a1', studentName: 'Asha Rao', studentId: 'STU-1', status: 'Active' },
  { id: 'a2', studentName: 'Vivek Sharma', studentId: 'STU-2', status: 'Vacated' },
];
const records = [
  { id: 'n1', title: 'Inspection', recordType: 'Inspection', status: 'Open' },
  { id: 'n2', title: 'Repair', recordType: 'Maintenance', status: 'Closed' },
];

assert.deepEqual(summarizeHostel(rooms, allocations, records), {
  rooms: 2,
  totalCapacity: 8,
  occupied: 7,
  available: 1,
  occupancyRate: 88,
  activeAllocations: 1,
  openRecords: 1,
});
assert.equal(filterHostelItems([...rooms, ...allocations, ...records], 'vivek').length, 1);
assert.equal(validateHostelRoom({}), 'Room number is required.');
assert.equal(validateHostelRoom({ roomNo: '101', hostelName: 'Main', capacity: 2, occupiedCount: 3 }), 'Occupied count cannot exceed capacity.');
assert.equal(validateHostelRoom({ roomNo: '101', hostelName: 'Main', capacity: 2, occupiedCount: 1 }), '');
assert.equal(validateHostelAllocation({}), 'Student name is required.');
assert.equal(validateHostelAllocation({ studentName: 'Asha', studentId: 'STU-1', roomNo: '101', hostelName: 'Main' }), '');
assert.equal(validateHostelRecord({}), 'Record title is required.');
assert.equal(validateHostelRecord({ title: 'Inspection', recordType: 'Inspection' }), '');

console.log('Hostel tests passed.');
