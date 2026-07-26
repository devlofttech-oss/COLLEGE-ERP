import * as service from './students.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const students = await service.listStudents(req.query);
  res.json({ students, count: students.length });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ student: await service.getStudent(req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ student: await service.createStudent(req.body || {}, req.user) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ student: await service.updateStudent(req.params.id, req.body || {}, req.user) });
});

export const archive = asyncHandler(async (req, res) => {
  res.json({ student: await service.archiveStudent(req.params.id, req.user) });
});

export const restore = asyncHandler(async (req, res) => {
  res.json({ student: await service.restoreStudent(req.params.id, req.user) });
});

// ── Promotion / transfer ──
export const promote = asyncHandler(async (req, res) => {
  res.json({ student: await service.promoteStudent(req.params.id, req.body || {}, req.user) });
});

export const transfer = asyncHandler(async (req, res) => {
  res.json({ student: await service.transferStudent(req.params.id, req.body || {}, req.user) });
});

export const placementHistory = asyncHandler(async (req, res) => {
  res.json({ history: await service.listPlacementHistory(req.params.id) });
});

// ── Documents ──
export const listDocuments = asyncHandler(async (req, res) => {
  res.json({ documents: await service.listDocuments(req.params.id) });
});

export const addDocument = asyncHandler(async (req, res) => {
  res.status(201).json({ document: await service.addDocument(req.params.id, req.body || {}, req.user) });
});

export const verifyDocument = asyncHandler(async (req, res) => {
  res.json({ document: await service.setDocumentStatus(req.params.docId, 'verified', req.body?.remarks, req.user) });
});

export const rejectDocument = asyncHandler(async (req, res) => {
  res.json({ document: await service.setDocumentStatus(req.params.docId, 'rejected', req.body?.remarks, req.user) });
});

// ── Bulk import / export / ID card ──
export const bulkImport = asyncHandler(async (req, res) => {
  res.json(await service.bulkImport(req.body?.rows, req.user));
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await service.exportStudentsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send(csv);
});

export const idCard = asyncHandler(async (req, res) => {
  res.json({ idCard: await service.idCardData(req.params.id) });
});
