export const medicalConditionOptions = [
  'High blood pressure',
  'Asthma',
  'Migraine or severe headaches',
  'Arthritis',
  'Hepatitis',
  'Back Injuries',
  'Bronchitis or Chronic cough',
  'Chest pains',
  'Psychiatric disorder',
  'Chronic back pain',
  'Heart disease',
  'Convulsions',
  'Tuberculosis',
  'Diabetes',
  'Dizzy spells or fainting',
  'Epilepsy',
  'Hearing problems',
  'Skin Disease',
];

export const vaccineStatusFields = [
  ['hepatitisA', 'Hepatitis A'],
  ['hepatitisB', 'Hepatitis B'],
  ['tt', 'T.T'],
  ['varicella', 'Varicella'],
  ['influenza', 'Influenza'],
  ['pneumococcal', 'Pneumococcal'],
];

export const immunizationTemplate = [
  ['BCG', 'Birth'],
  ['Hep B', 'Birth'],
  ['Polio', 'Birth'],
  ['DPT', '6 weeks'],
  ['Hib', '6 weeks'],
  ['PCV', '6 weeks'],
  ['Typhoid', '9 months'],
  ['MMR', '9 months'],
  ['Varicella', '1 years'],
  ['HepA', '1 years'],
  ['Tdap', '7 years'],
  ['HPV', '9 years'],
];

export const familyHistoryTemplate = ['Father', 'Mother', 'Brothers', 'Sisters'];

export const monthlyRecordMonths = [
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
];

export const monthlyRecordYears = [
  ['year1', '1st Year'],
  ['year2', '2nd Year'],
  ['year3', '3rd Year'],
  ['year4', '4th Year'],
];

export const medicalExamFindings = [
  'Height',
  'Weight',
  'Pulse',
  'Respiration',
  'BP',
  'Skin',
  'Hair',
  'Chest',
  'High Vision',
  'Ear',
  'Nose',
  'Mouth',
  'Neck & Throat',
  'Dental Examination',
  'Lung Examination',
  'Heart Examination',
  'Chest X-ray',
  'Neurological',
  'Extremities movement',
  'Abdomen Examination',
  'Hb',
  'ESR',
  'TLC',
  'DLC',
  'Urine',
  'Cholesterol',
  'Any other',
  "Physician's Signature & Date",
];

export function isHealthRecordManager(roleId = '') {
  return roleId === 'admin' || roleId === 'super-admin';
}

function createYearCells() {
  return monthlyRecordYears.reduce((map, [key]) => {
    map[key] = { wt: '', bp: '', lmp: '' };
    return map;
  }, {});
}

function createTextYearCells() {
  return monthlyRecordYears.reduce((map, [key]) => {
    map[key] = '';
    return map;
  }, {});
}

export function createEmptyHealthRecord(student = {}, academicYear = '') {
  return {
    identification: {
      studentName: student.name || '',
      fatherName: student.fatherName || student.guardianName || '',
      academicYear: academicYear || student.academicYear || '',
      rollNo: student.rollNo || student.studentId || '',
      courseYear: student.courseYear || student.className || '',
      dateOfBirth: student.dateOfBirth || '',
      age: student.age || '',
      gender: student.gender || '',
      dateOfAdmission: student.admissionDate || '',
      dateOfCompletion: '',
      permanentAddress: student.address || '',
      emergencyContact: student.guardianName || '',
      emergencyPhone: student.phone || '',
    },
    personalHistory: {
      medicalConditions: [],
      conditionExplanation: '',
      seriousIllnessInjurySurgery: '',
      currentMedications: '',
      confinementTreatment: '',
      bloodGroupType: student.bloodGroup || '',
      physicalAbnormalities: '',
      allergies: '',
      allergyMedicines: '',
      menstrualHistory: '',
      ageOfMenarche: '',
      cycleDuration: '',
      frequency: '',
      painOrDiscomfort: '',
      vaccinations: Object.fromEntries(vaccineStatusFields.map(([key]) => [key, ''])),
      sleepSchedule: '',
      sleepNormal: '',
      sleepDisturbed: '',
      sleepDisturbanceDetails: '',
    },
    immunizations: immunizationTemplate.map(([vaccine, minimumAge]) => ({
      vaccine,
      minimumAge,
      ageReceived: '',
      notReceived: false,
      remarks: '',
    })),
    familyHistory: familyHistoryTemplate.map((relation) => ({
      relation,
      ageIfLiving: '',
      disease: '',
      ageAtDeath: '',
      causeOfDeath: '',
      remarks: '',
    })),
    finalRemarks: '',
    coordinatorSignatures: {
      semester1And2: '',
      semester3And4: '',
      semester5And6: '',
      semester7And8: '',
      principal: '',
    },
    sicknessDetails: [
      { date: '', diagnosis: '', treatment: '', investigation: '', sickDays: '', signature: '' },
    ],
    monthlyRecords: monthlyRecordMonths.map((month) => ({
      month,
      ...createYearCells(),
    })),
    medicalExaminations: medicalExamFindings.map((finding) => ({
      finding,
      ...createTextYearCells(),
    })),
  };
}

export function normalizeHealthRecordForm(form = {}, student = {}, academicYear = '') {
  const base = createEmptyHealthRecord(student, academicYear);
  return {
    ...base,
    ...form,
    identification: { ...base.identification, ...(form.identification || {}) },
    personalHistory: {
      ...base.personalHistory,
      ...(form.personalHistory || {}),
      vaccinations: {
        ...base.personalHistory.vaccinations,
        ...(form.personalHistory?.vaccinations || {}),
      },
      medicalConditions: form.personalHistory?.medicalConditions || base.personalHistory.medicalConditions,
    },
    immunizations: immunizationTemplate.map(([vaccine, minimumAge], index) => ({
      vaccine,
      minimumAge,
      ...(form.immunizations?.[index] || {}),
    })),
    familyHistory: familyHistoryTemplate.map((relation, index) => ({
      relation,
      ...(form.familyHistory?.[index] || {}),
    })),
    coordinatorSignatures: {
      ...base.coordinatorSignatures,
      ...(form.coordinatorSignatures || {}),
    },
    sicknessDetails: form.sicknessDetails?.length ? form.sicknessDetails : base.sicknessDetails,
    monthlyRecords: monthlyRecordMonths.map((month, index) => ({
      month,
      ...createYearCells(),
      ...(form.monthlyRecords?.[index] || {}),
    })),
    medicalExaminations: medicalExamFindings.map((finding, index) => ({
      finding,
      ...createTextYearCells(),
      ...(form.medicalExaminations?.[index] || {}),
    })),
  };
}
