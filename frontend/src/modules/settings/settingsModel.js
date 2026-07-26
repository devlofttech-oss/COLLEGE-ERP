export function normalizeInstituteSettings(institute = {}) {
  return {
    ...emptyInstituteSettings,
    ...institute,
    name: institute.name || '',
    instituteId: institute.instituteId || institute.code || '',
    code: institute.code || institute.instituteId || '',
  };
}

const emptyInstituteSettings = {
  id: 'institute',
  name: '',
  instituteId: '',
  code: '',
  logoUrl: '',
  logoFileName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  status: '',
  updatedAtText: '',
};

export const emptyAcademicYearSettings = {
  id: 'academic-year',
  name: '',
  startsOn: '',
  endsOn: '',
  status: '',
  updatedAtText: '',
};

export const emptyIdFormatSettings = {
  id: 'id-formats',
  student: '',
  admission: '',
  employee: '',
  receipt: '',
  updatedAtText: '',
};

export const emptyModuleDefaultSettings = {
  id: 'module-defaults',
  studentAdmissions: false,
  staffLeave: false,
  timetablePublishing: false,
  parentPortal: false,
  onlinePayments: false,
  receiptGeneration: false,
  communicationModule: false,
  updatedAtText: '',
};
