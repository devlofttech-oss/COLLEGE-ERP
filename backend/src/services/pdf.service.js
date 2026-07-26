// PDF generation (Spec §13: receipts/report cards/ID cards from backend
// templates). Uses pdfkit (pure JS — works on Vercel serverless). Each generator
// returns a Buffer; callers stream it and/or store it to R2.
//
// Designs are intentionally clean and generic. Institution branding (name, colors)
// is passed in from settings; per-institution template customization can layer on
// top later.

import PDFDocument from 'pdfkit';

const BRAND = '#1e3a8a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

// Render a pdfkit document to a Buffer.
function render(drawFn, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, ...options });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      drawFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function header(doc, institution, title) {
  const name = institution?.name || 'Institution';
  doc.fillColor(BRAND).fontSize(20).font('Helvetica-Bold').text(name, { align: 'center' });
  if (institution?.address) {
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(institution.address, { align: 'center' });
  }
  const contact = [institution?.phone, institution?.email].filter(Boolean).join('  •  ');
  if (contact) doc.fillColor(MUTED).fontSize(9).text(contact, { align: 'center' });
  doc.moveDown(0.6);
  doc.fillColor(BRAND).fontSize(13).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.4);
  doc.strokeColor(LINE).lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.8);
}

function row(doc, label, value) {
  const y = doc.y;
  doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(label, 48, y, { width: 160 });
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(value ?? '—', 210, y, { width: 337 });
  doc.moveDown(0.5);
}

function money(n) {
  const v = Number(n || 0);
  return `₹ ${v.toLocaleString('en-IN')}`;
}

// ── Fee receipt ──
export function generateReceipt(payment, institution) {
  return render((doc) => {
    header(doc, institution, 'FEE RECEIPT');
    row(doc, 'Receipt No', payment.receiptNumber);
    row(doc, 'Date', formatDate(payment.paidAt || payment.createdAt));
    row(doc, 'Student', payment.studentName);
    if (payment.feeHeadName) row(doc, 'Fee Head', payment.feeHeadName);
    doc.moveDown(0.4);
    doc.strokeColor(LINE).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.6);
    row(doc, 'Amount Paid', money(payment.amount));
    if (payment.discount) row(doc, 'Discount', money(payment.discount));
    if (payment.fine) row(doc, 'Fine', money(payment.fine));
    row(doc, 'Payment Mode', payment.paymentMode);
    if (payment.referenceNumber) row(doc, 'Reference No', payment.referenceNumber);
    if (payment.remarks) row(doc, 'Remarks', payment.remarks);
    doc.moveDown(2);
    doc.fillColor(MUTED).fontSize(9).text(`Collected by: ${payment.collectedByName || '—'}`, { align: 'left' });
    doc.moveDown(3);
    doc.fillColor('#0f172a').fontSize(10).text('Authorized Signature', 400, doc.y, { align: 'right' });
    footer(doc);
  });
}

// ── Report card ──
export function generateReportCard(result, institution) {
  return render((doc) => {
    header(doc, institution, 'REPORT CARD');
    row(doc, 'Student', result.studentName);
    row(doc, 'Class', result.className || result.classId);
    if (result.academicYear) row(doc, 'Academic Year', result.academicYear);
    doc.moveDown(0.5);

    // Subject table
    const startX = 48;
    let y = doc.y;
    const cols = [{ t: 'Subject', w: 250 }, { t: 'Max', w: 80 }, { t: 'Obtained', w: 100 }, { t: 'Result', w: 100 }];
    doc.fillColor('#fff').rect(startX, y, 530, 22).fill(BRAND);
    let x = startX + 8;
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
    cols.forEach((c) => { doc.text(c.t, x, y + 6, { width: c.w }); x += c.w; });
    y += 22;

    (result.subjects || []).forEach((s, i) => {
      if (i % 2) doc.fillColor('#f8fafc').rect(startX, y, 530, 20).fill();
      x = startX + 8;
      const pass = !s.absent && s.maxMarks && (s.marksObtained / s.maxMarks) * 100 >= 35;
      const vals = [s.subjectName || s.subjectId, String(s.maxMarks ?? '—'), s.absent ? 'AB' : String(s.marksObtained ?? '—'), s.absent ? 'Absent' : (pass ? 'Pass' : 'Fail')];
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica');
      cols.forEach((c, ci) => { doc.text(vals[ci], x, y + 5, { width: c.w }); x += c.w; });
      y += 20;
    });
    doc.y = y + 12;

    row(doc, 'Total', `${result.marksObtained} / ${result.totalMarks}`);
    row(doc, 'Percentage', `${result.percentage}%`);
    row(doc, 'Grade', result.grade);
    if (result.rank) row(doc, 'Rank', String(result.rank));
    row(doc, 'Result', result.status);
    footer(doc);
  });
}

// ── ID card (compact card on an A6-ish canvas) ──
export function generateIdCard(card, institution) {
  return render((doc) => {
    doc.fillColor(BRAND).rect(0, 0, doc.page.width, 70).fill();
    doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold').text(institution?.name || 'Institution', 20, 22, { align: 'center', width: doc.page.width - 40 });
    doc.fillColor(BRAND).fontSize(12).font('Helvetica-Bold').text('STUDENT IDENTITY CARD', 0, 90, { align: 'center', width: doc.page.width });
    doc.moveDown(1.5);
    doc.fillColor('#0f172a');
    row(doc, 'Name', card.name);
    row(doc, 'Admission No', card.admissionNumber);
    row(doc, 'Class', card.className);
    if (card.section) row(doc, 'Section', card.section);
    if (card.rollNumber) row(doc, 'Roll No', String(card.rollNumber));
    if (card.academicYear) row(doc, 'Academic Year', card.academicYear);
    if (card.bloodGroup) row(doc, 'Blood Group', card.bloodGroup);
    if (card.guardianMobile) row(doc, 'Contact', card.guardianMobile);
    footer(doc);
  }, { size: 'A5' });
}

function footer(doc) {
  const y = doc.page.height - 60;
  doc.strokeColor(LINE).moveTo(48, y).lineTo(doc.page.width - 48, y).stroke();
  doc.fillColor(MUTED).fontSize(8).text(`Generated on ${new Date().toLocaleString('en-IN')}`, 48, y + 8, { align: 'center', width: doc.page.width - 96 });
}

function formatDate(v) {
  if (!v) return '—';
  const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}
