import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

// ── Queues ─────────────────────────────────────────────────────────────────

export async function getEnrollmentQueue({ page = 0, size = 20, search } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search) params.set('search', search);
  const res = await apiClient(`${API_ENDPOINTS.MANAGEMENT.ENROLLMENT}?${params}`);
  return res.data;
}

export async function getAssessmentQueue({ page = 0, size = 20, search, status, priority } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search)   params.set('search', search);
  if (status)   params.set('status', status);
  if (priority) params.set('priority', priority);
  const res = await apiClient(`${API_ENDPOINTS.MANAGEMENT.ASSESSMENT}?${params}`);
  return res.data;
}

export async function getApprovalQueue({ page = 0, size = 20, search, status, priority } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search)   params.set('search', search);
  if (status)   params.set('status', status);
  if (priority) params.set('priority', priority);
  const res = await apiClient(`${API_ENDPOINTS.MANAGEMENT.APPROVAL}?${params}`);
  return res.data;
}

export async function getEscalatedQueue({ page = 0, size = 20, search, priority } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search)   params.set('search', search);
  if (priority) params.set('priority', priority);
  const res = await apiClient(`${API_ENDPOINTS.MANAGEMENT.ESCALATED}?${params}`);
  return res.data;
}

export async function getAdjudicationQueue({ page = 0, size = 20, search, priority } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search)   params.set('search', search);
  if (priority) params.set('priority', priority);
  const res = await apiClient(`${API_ENDPOINTS.MANAGEMENT.ADJUDICATION}?${params}`);
  return res.data;
}

// ── Case detail & lookup ────────────────────────────────────────────────────

export async function getApplicantReview(caseNo) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.APPLICANT(caseNo));
  return res.data;
}

export async function getAssessmentHistory(caseNo) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ASSESSMENT_HISTORY(caseNo));
  return res.data;
}

export async function getCaseBySubject(subjectId) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.BY_SUBJECT(subjectId));
  return res.data;
}

export async function getCaseDetail(caseNo) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.DETAIL(caseNo));
  return res.data;
}

export async function getAdjudicationDetail(id) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ADJUDICATION_DETAIL(id));
  return res.data;
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function assignCase(caseNo, { officerUserId, officerName, priority }) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ASSIGN(caseNo), {
    method: 'POST',
    body: JSON.stringify({ officerUserId, officerName, priority }),
  });
  return res.data;
}

/**
 * @param {string} caseNo
 * @param {{
 *   photo: string|null,
 *   signature: string|null,
 *   signatureMethod: string|null,
 *   fingerprints: Array<{
 *     position: string,
 *     exception: boolean,
 *     exceptionReason: string|null,
 *     template: string|null,
 *     rawImage: string|null,
 *     qualityScore: number|null
 *   }>
 * }} [biometrics]  omit for the waive-biometrics flow, which still just marks the case enrolled
 */
export async function enrollCase(caseNo, biometrics) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ENROLL(caseNo), {
    method: 'POST',
    ...(biometrics ? { body: JSON.stringify(biometrics) } : {}),
  });
  return res.data;
}

export async function startAssessment(caseNo) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.START_ASSESSMENT(caseNo), { method: 'POST' });
  return res.data;
}

/**
 * @param {string} caseNo
 * @param {{
 *   checklist: number[],
 *   findings: string,
 *   notes: string,
 *   recommendation: 'APPROVE'|'REJECT'|'ESCALATE',
 *   proposedFinalStatus?: string,
 *   reason?: string,
 *   escalateToDepartment?: string
 * }} data
 */
export async function assessCase(caseNo, data) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ASSESS(caseNo), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

/**
 * @param {string} caseNo
 * @param {{
 *   decision: 'APPROVE'|'REJECT'|'RETURN_TO_ASSESSMENT'|'ESCALATE',
 *   finalStatus?: string,
 *   documentType?: string,
 *   reason?: string,
 *   notes?: string
 * }} data
 */
export async function decideCase(caseNo, data) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.DECIDE(caseNo), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

/**
 * @param {string} id
 * @param {{ decision: 'SAME_APPLICANT'|'DIFFERENT_APPLICANTS'|'SUSPECTED_FRAUD'|'INSUFFICIENT_EVIDENCE', remarks: string }} data
 */
export async function resolveAdjudication(id, data) {
  const res = await apiClient(API_ENDPOINTS.MANAGEMENT.ADJUDICATION_RESOLVE(id), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}
