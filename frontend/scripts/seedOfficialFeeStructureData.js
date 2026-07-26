import { existsSync, readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function getCredential() {
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const localPath = './serviceAccountKey.json';
  if (explicitPath && existsSync(explicitPath)) return cert(readJson(explicitPath));
  if (existsSync(localPath)) return cert(readJson(localPath));
  throw new Error('Missing service account. Add serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS.');
}

function getArgValue(name, fallback = '') {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const academicYear = getArgValue('--academic-year', '2025-2026');
const dueDate = getArgValue('--due-date', '2026-07-31');
const dryRun = process.argv.includes('--dry-run');
const seedSource = 'Official 2026-27 Fee Structure';
const createdAtText = '07 Jul 2026';
const extraChargesNote = 'Books (1st Year), full set uniform, pocket articles, eligibility certificate, and university examination fees are extra. Food, accommodation, and transportation: Rs. 6,500 per month. Hostel caution deposit: Rs. 10,000. Hostel fee hike: 5% every year.';

initializeApp({ credential: getCredential() });
const db = getFirestore();

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function classNameForYear(year) {
  return {
    1: '1 St Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year',
  }[year] || `${year}th Year`;
}

function feeStatus(totalAmount, paidAmount = 0, adjustmentAmount = 0) {
  const dueAmount = Math.max(0, Number(totalAmount || 0) - Number(paidAmount || 0) - Number(adjustmentAmount || 0));
  if (dueAmount <= 0) return 'Paid';
  if (Number(paidAmount || 0) > 0 || Number(adjustmentAmount || 0) > 0) return 'Partially Paid';
  return 'Due';
}

const courseFeePlans = {
  BSCN: {
    title: 'B.Sc Nursing',
    admissionFee: 50000,
    yearFees: { 1: 285000, 2: 110000, 3: 110000, 4: 110000 },
    courseTotalAmount: 665000,
    collegeName: 'Maurya College Of Nursing',
  },
  BPT: {
    title: 'BPT',
    admissionFee: 50000,
    yearFees: { 1: 235000, 2: 60000, 3: 60000, 4: 60000 },
    courseTotalAmount: 465000,
    collegeName: 'Maurya College Of Physiotherapy',
  },
  BOT: {
    title: 'BOT Bachelor Of Occupational Therapy',
    admissionFee: 50000,
    yearFees: { 1: 240000, 2: 65000, 3: 65000, 4: 65000 },
    courseTotalAmount: 485000,
    collegeName: 'Maurya College Of Allied Health Sciences',
  },
  ATOT: {
    title: 'B.Sc AT & OT (Anesthesia Technology and Operation Theatre Technology)',
    admissionFee: 25000,
    yearFees: { 1: 230000, 2: 65000, 3: 65000 },
    courseTotalAmount: 385000,
    collegeName: 'Maurya College Of Allied Health Sciences',
  },
  MIT: {
    title: 'B.Sc MIT (Medical Imaging Technology)',
    admissionFee: 25000,
    yearFees: { 1: 220000, 2: 60000, 3: 60000 },
    courseTotalAmount: 365000,
    collegeName: 'Maurya College Of Allied Health Sciences',
  },
  MLT: {
    title: 'B.Sc MLT (Medical Laboratory Technology)',
    admissionFee: 25000,
    yearFees: { 1: 185000, 2: 50000, 3: 50000 },
    courseTotalAmount: 310000,
    collegeName: 'Maurya College Of Allied Health Sciences',
  },
};

const courseVariants = [
  { planKey: 'BSCN', courseCode: 'BSCN', courseName: 'BSC Nursing', section: 'Regular', years: [1, 2, 3, 4], admissionYear: 1 },
  { planKey: 'BPT', courseCode: 'BPT', courseName: 'BPT', section: 'Regular', years: [1, 2, 3, 4], admissionYear: 1 },
  { planKey: 'BOT', courseCode: 'BOT', courseName: 'I B.Sc (Occupational Therapy)', section: 'Regular', years: [1, 2, 3, 4], admissionYear: 1 },
  { planKey: 'ATOT', courseCode: 'ATOTREG', courseName: 'I B Sc Anaesthesia and Operation Theater Technology', section: 'Regular', years: [1, 2, 3], admissionYear: 1 },
  { planKey: 'ATOT', courseCode: 'ATOTLAT', courseName: 'II B Sc Anaesthesia and Operation Theater Technology', section: 'Lateral', years: [2, 3], admissionYear: 2 },
  { planKey: 'MIT', courseCode: 'MITREG', courseName: 'I B Sc Imaging Technology', section: 'Regular', years: [1, 2, 3], admissionYear: 1 },
  { planKey: 'MIT', courseCode: 'MITLAT', courseName: 'II B Sc Medical Imaging Technology', section: 'Lateral', years: [2, 3], admissionYear: 2 },
  { planKey: 'MLT', courseCode: 'MLTREG', courseName: 'I B Sc MLT', section: 'Regular', years: [1, 2, 3], admissionYear: 1 },
  { planKey: 'MLT', courseCode: 'MLTLAT', courseName: 'II B Sc MLT', section: 'Lateral', years: [2, 3], admissionYear: 2 },
];

function buildStructureId(courseCode, year, section) {
  return `official-fee-structure-${academicYear}-${slugify(courseCode)}-year${year}-${slugify(section)}`;
}

function buildAssignmentId(student) {
  return `official-fee-assignment-${academicYear}-${slugify(student.id || student.studentId)}`;
}

function buildFeeStructures() {
  const structures = {};

  for (const variant of courseVariants) {
    const plan = courseFeePlans[variant.planKey];
    for (const year of variant.years) {
      const admissionFee = year === variant.admissionYear ? plan.admissionFee : 0;
      const tuitionFee = plan.yearFees[year] || 0;
      const className = classNameForYear(year);
      const classKey = `${className} - ${variant.section}`;
      const totalAmount = admissionFee + tuitionFee;
      const id = buildStructureId(variant.courseCode, year, variant.section);
      structures[id] = {
        name: `${plan.title} ${className} ${variant.section} Fee 2025-26`,
        classKey,
        academicYear,
        admissionFee,
        applicationFee: 0,
        pocketArticleFee: 0,
        tuitionFee,
        libraryFee: 0,
        labFee: 0,
        transportFee: 0,
        totalAmount,
        dueDate,
        status: 'Active',
        createdAtText,
        updatedAtText: createdAtText,
        courseCode: variant.courseCode,
        courseName: variant.courseName,
        programName: plan.title,
        collegeName: plan.collegeName,
        feeYear: year,
        feeYearLabel: className,
        admissionFeeApplies: admissionFee > 0,
        annualYearFee: tuitionFee,
        courseTotalAmount: plan.courseTotalAmount,
        sourceFile: '2026-27 Fee Structure image',
        extraChargesNote,
        seedSource,
      };
    }
  }

  return structures;
}

async function getActiveStudents() {
  const snapshot = await db.collection('students').where('status', '==', 'Active').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function getStudentClassKey(student) {
  return [student.className, student.section].filter(Boolean).join(' - ');
}

async function buildFeeAssignments(structures) {
  const students = await getActiveStudents();
  const structureList = Object.entries(structures).map(([id, data]) => ({ id, ...data }));
  const assignments = {};
  const skippedStudents = [];

  for (const student of students) {
    const classKey = getStudentClassKey(student);
    const structure = structureList.find((item) => item.courseCode === student.courseCode && item.classKey === classKey);
    if (!structure) {
      skippedStudents.push({
        studentId: student.studentId,
        name: student.name,
        courseCode: student.courseCode,
        classKey,
      });
      continue;
    }

    const assignmentId = buildAssignmentId(student);
    const existingSnapshot = await db.collection('feeAssignments').doc(assignmentId).get();
    const existing = existingSnapshot.exists ? existingSnapshot.data() : {};
    const paidAmount = Number(existing.paidAmount || 0);
    const adjustmentAmount = Number(existing.adjustmentAmount || 0);
    const dueAmount = Math.max(0, Number(structure.totalAmount || 0) - paidAmount - adjustmentAmount);

    assignments[assignmentId] = {
      feeStructureId: structure.id,
      studentRecordId: student.id,
      studentId: student.studentId,
      studentName: student.name,
      classKey: structure.classKey,
      academicYear,
      studentAcademicYear: student.academicYear || '',
      courseCode: student.courseCode || structure.courseCode,
      courseName: student.courseName || student.program || structure.courseName,
      admissionFee: structure.admissionFee,
      applicationFee: structure.applicationFee,
      pocketArticleFee: structure.pocketArticleFee,
      tuitionFee: structure.tuitionFee,
      libraryFee: structure.libraryFee,
      labFee: structure.labFee,
      transportFee: structure.transportFee,
      totalAmount: structure.totalAmount,
      paidAmount,
      adjustmentAmount,
      dueAmount,
      dueDate: structure.dueDate,
      manualDueItems: existing.manualDueItems || [],
      status: feeStatus(structure.totalAmount, paidAmount, adjustmentAmount),
      assignedAtText: existing.assignedAtText || createdAtText,
      updatedAtText: createdAtText,
      feeYear: structure.feeYear,
      feeYearLabel: structure.feeYearLabel,
      admissionFeeApplies: structure.admissionFeeApplies,
      courseTotalAmount: structure.courseTotalAmount,
      sourceFile: structure.sourceFile,
      extraChargesNote,
      seedSource,
    };
  }

  return { assignments, skippedStudents, studentCount: students.length };
}

async function writeDocs(collectionName, docs) {
  let batch = db.batch();
  let count = 0;

  for (const [id, data] of Object.entries(docs)) {
    batch.set(db.collection(collectionName).doc(id), {
      ...data,
      seededAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) await batch.commit();
  return count;
}

const structures = buildFeeStructures();
const { assignments, skippedStudents, studentCount } = await buildFeeAssignments(structures);

console.log(`Official fee seed target academic year: ${academicYear}`);
console.log(`Due date used: ${dueDate}`);
console.log(`feeStructures: ${Object.keys(structures).length}`);
console.log(`active students scanned: ${studentCount}`);
console.log(`feeAssignments: ${Object.keys(assignments).length}`);
if (skippedStudents.length) {
  console.log('Skipped students without matching official fee row:');
  skippedStudents.forEach((student) => console.log(JSON.stringify(student)));
}

if (dryRun) {
  console.log('Dry run complete. No Firestore writes were made.');
} else {
  const structureCount = await writeDocs('feeStructures', structures);
  const assignmentCount = await writeDocs('feeAssignments', assignments);
  console.log(`Official fee seed complete. ${structureCount} fee structures and ${assignmentCount} fee assignments written or merged.`);
}
