export const demoClassrooms = [
  { id: 'demo-room-101', roomNo: 'Room 101', building: 'Main Block', capacity: 45, status: 'Active' },
  { id: 'demo-lab-201', roomNo: 'Lab 201', building: 'Science Block', capacity: 30, status: 'Active' },
  { id: 'demo-room-204', roomNo: 'Room 204', building: 'Commerce Block', capacity: 40, status: 'Active' },
];

export const demoTimetableEntries = [
  {
    id: 'demo-tt-1',
    classKey: 'Class XII - A',
    subject: 'Physics',
    facultyId: 'demo-staff-1001',
    facultyName: 'Dr. Kavita Menon',
    classroomId: 'demo-lab-201',
    classroomName: 'Lab 201',
    day: 'Monday',
    timeSlot: '09:00 - 10:00',
    startTime: '09:00',
    endTime: '10:00',
    status: 'Draft',
    createdAtText: '18 Jun 2026',
  },
  {
    id: 'demo-tt-2',
    classKey: 'Class XI - B',
    subject: 'Accountancy',
    facultyId: 'demo-staff-1002',
    facultyName: 'Prof. Ramesh Iyer',
    classroomId: 'demo-room-204',
    classroomName: 'Room 204',
    day: 'Tuesday',
    timeSlot: '10:00 - 11:00',
    startTime: '10:00',
    endTime: '11:00',
    status: 'Draft',
    createdAtText: '18 Jun 2026',
  },
];

export const demoTimetablePublications = [
  {
    id: 'demo-pub-1',
    classKey: 'Class XII - A',
    publishedAtText: '18 Jun 2026',
    status: 'Published',
  },
];
