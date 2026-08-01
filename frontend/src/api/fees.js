import { API_BASE_URL, api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listFeeHeads(params) {
  const data = await api.get(`/fees/heads${queryString(params)}`);
  return data.heads || [];
}

export async function createFeeHead(payload) {
  const data = await api.post('/fees/heads', payload);
  return data.head;
}

export async function updateFeeHead(id, payload) {
  const data = await api.patch(`/fees/heads/${id}`, payload);
  return data.head;
}

export async function archiveFeeHead(id) {
  const data = await api.post(`/fees/heads/${id}/archive`, {});
  return data.head;
}

export async function listFeeStructures(params) {
  const data = await api.get(`/fees/structures${queryString(params)}`);
  return data.structures || [];
}

export async function createFeeStructure(payload) {
  const data = await api.post('/fees/structures', payload);
  return data.structure;
}

export async function updateFeeStructure(id, payload) {
  const data = await api.patch(`/fees/structures/${id}`, payload);
  return data.structure;
}

export async function archiveFeeStructure(id) {
  const data = await api.post(`/fees/structures/${id}/archive`, {});
  return data.structure;
}

export async function listFeeAssignments(params) {
  const data = await api.get(`/fees/assignments${queryString(params)}`);
  return data.assignments || [];
}

export async function assignFee(payload) {
  const data = await api.post('/fees/assignments', payload);
  return data.assignment;
}

export async function collectFee(payload) {
  return api.post('/fees/collect', payload);
}

export async function listFeePayments(params) {
  const data = await api.get(`/fees/payments${queryString(params)}`);
  return data.payments || [];
}

export async function getFeeReceipt(paymentId) {
  const data = await api.get(`/fees/receipts/${paymentId}`);
  return data.receipt;
}

export function feeReceiptPdfUrl(paymentId) {
  return `${API_BASE_URL}/fees/receipts/${paymentId}/pdf`;
}

export async function getFeeDues(params) {
  return api.get(`/fees/dues${queryString(params)}`);
}

export async function sendFeeReminders(payload) {
  return api.post('/fees/remind', payload);
}

export async function createPaymentOrder(payload) {
  return api.post('/fees/pay/order', payload);
}
