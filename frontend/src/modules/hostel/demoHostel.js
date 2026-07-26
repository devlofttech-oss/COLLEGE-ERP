export const demoHostelRooms = [
  { id: 'demo-hostel-room-101', roomNo: '101', hostelName: 'Main Hostel', blockName: 'A Block', floor: '1', capacity: 4, occupiedCount: 3, status: 'Available', academicYear: '2025-2026', wardenName: 'Anusha Shine', createdAtText: '19 Jun 2026' },
  { id: 'demo-hostel-room-102', roomNo: '102', hostelName: 'Main Hostel', blockName: 'A Block', floor: '1', capacity: 4, occupiedCount: 4, status: 'Full', academicYear: '2025-2026', wardenName: 'Anusha Shine', createdAtText: '19 Jun 2026' },
  { id: 'demo-hostel-room-201', roomNo: '201', hostelName: 'Main Hostel', blockName: 'B Block', floor: '2', capacity: 3, occupiedCount: 1, status: 'Available', academicYear: '2025-2026', wardenName: 'Chaitra B', createdAtText: '19 Jun 2026' },
];

export const demoHostelAllocations = [
  { id: 'demo-hostel-allocation-1', studentName: 'Asha Rao', studentId: 'STU-00001', courseName: 'B Sc Nursing', roomNo: '101', hostelName: 'Main Hostel', allocatedOn: '2025-06-20', academicYear: '2025-2026', status: 'Active', guardianPhone: '+91 98765 00001', createdAtText: '20 Jun 2026' },
  { id: 'demo-hostel-allocation-2', studentName: 'Vivek Sharma', studentId: 'STU-00002', courseName: 'B Sc MLT', roomNo: '102', hostelName: 'Main Hostel', allocatedOn: '2025-06-21', academicYear: '2025-2026', status: 'Active', guardianPhone: '+91 98765 00002', createdAtText: '21 Jun 2026' },
];

export const demoHostelRecords = [
  { id: 'demo-hostel-record-1', recordType: 'Inspection', title: 'Monthly room inspection', hostelName: 'Main Hostel', roomNo: '101', recordDate: '2025-06-25', status: 'Open', notes: 'Minor maintenance noted.', academicYear: '2025-2026', createdAtText: '25 Jun 2026' },
  { id: 'demo-hostel-record-2', recordType: 'Maintenance', title: 'Fan repair completed', hostelName: 'Main Hostel', roomNo: '102', recordDate: '2025-06-26', status: 'Closed', notes: 'Work completed by maintenance team.', academicYear: '2025-2026', createdAtText: '26 Jun 2026' },
];
