// Typed client for icrcs-device-service - the local office agent that drives the
// Suprema RealScan-G10 fingerprint scanner (see icrcs-device-service/README.md).
//
// This talks DIRECTLY to the local agent on 127.0.0.1:8090 and deliberately does
// NOT go through services/apiClient.js: the agent is a different origin and must
// never receive this app's bearer token. Capture is asynchronous - you start a
// job, get a jobId back immediately (HTTP 202), then poll until it reaches a
// terminal state.
//
// CORS: the agent allowlists exactly ONE browser origin (not "*"). Start it with
// ICRCS_DEVICE_ALLOWED_ORIGIN set to this app's dev origin, or every request is
// blocked. See DEVICE_SERVICE_URL in config/apiConfig.js.

import { DEVICE_SERVICE_URL } from '../config/apiConfig';

/**
 * @typedef {'RIGHT_THUMB'|'RIGHT_INDEX'|'RIGHT_MIDDLE'|'RIGHT_RING'|'RIGHT_LITTLE'
 *   |'LEFT_THUMB'|'LEFT_INDEX'|'LEFT_MIDDLE'|'LEFT_RING'|'LEFT_LITTLE'
 *   |'RIGHT_FOUR_SLAP'|'LEFT_FOUR_SLAP'|'TWO_THUMBS'} FingerPosition
 */

/**
 * One physical placement on the scanner glass that captures several fingers at
 * once - the agent segments the response into one result per finger.
 * @typedef {'RIGHT_HAND'|'LEFT_HAND'|'THUMBS'} FingerGroup
 */

/** @typedef {'PENDING'|'IN_PROGRESS'|'COMPLETED'|'FAILED'|'CANCELLED'} JobStatus */

/** Job statuses after which polling should stop. @type {ReadonlySet<JobStatus>} */
export const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

/**
 * @typedef {Object} DeviceStatus
 * @property {boolean} connected
 * @property {string} make
 * @property {string} model
 * @property {string} serialNumber
 */

/**
 * @typedef {Object} FingerResult
 * @property {FingerPosition} position
 * @property {string} template   base64 ISO/IEC 19794-2 FMR template
 * @property {string} rawImage   base64 PNG of the fingerprint image
 * @property {number} qualityScore
 */

/**
 * @typedef {Object} CaptureJob
 * @property {string} jobId
 * @property {FingerPosition[]} requestedPositions
 * @property {JobStatus} status
 * @property {FingerResult[]} results
 * @property {string|null} errorMessage
 * @property {string} createdAt
 * @property {string} updatedAt
 */

async function asJson(response, action) {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${action} failed (${response.status}): ${body || response.statusText}`);
  }
  return response.json();
}

/** Live scanner status, proxied from RSWAS DeviceInfo. @returns {Promise<DeviceStatus>} */
export function getDeviceStatus() {
  return fetch(`${DEVICE_SERVICE_URL}/api/v1/devices`).then((res) => asJson(res, 'Device status check'));
}

/**
 * Start a group capture (one physical placement). Returns a jobId immediately.
 * @param {FingerGroup} group
 * @returns {Promise<string>} jobId
 */
export async function startGroupCapture(group) {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/fingerprint/capture-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group }),
  });
  const accepted = await asJson(response, 'Group capture request');
  return accepted.jobId;
}

/**
 * Start a single-finger capture. Returns a jobId immediately.
 * @param {FingerPosition} fingerPosition
 * @returns {Promise<string>} jobId
 */
export async function startCapture(fingerPosition) {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/fingerprint/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerPosition }),
  });
  const accepted = await asJson(response, 'Capture request');
  return accepted.jobId;
}

/** Poll a capture job's status/result(s). @param {string} jobId @returns {Promise<CaptureJob>} */
export function getCaptureJob(jobId) {
  return fetch(`${DEVICE_SERVICE_URL}/api/v1/fingerprint/capture/${jobId}`).then((res) => asJson(res, 'Job fetch'));
}

/** Abort an in-flight capture. @param {string} jobId @returns {Promise<void>} */
export async function cancelCapture(jobId) {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/fingerprint/cancel/${jobId}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Cancel failed (${response.status})`);
  }
}

/**
 * Poll a job every `intervalMs` until it reaches a terminal status.
 * @param {string} jobId
 * @param {(job: CaptureJob) => void} [onTick]  called on every poll, e.g. to update UI status
 * @param {number} [intervalMs]
 * @returns {Promise<CaptureJob>} the terminal job
 */
export async function pollUntilTerminal(jobId, onTick, intervalMs = 300) {
  for (;;) {
    const job = await getCaptureJob(jobId);
    if (onTick) onTick(job);
    if (TERMINAL_STATUSES.has(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// --- Mapping between the device's enum and this page's {hand, name} finger model ---

/**
 * Device FingerPosition -> the Biometric page's finger key.
 * @type {Record<FingerPosition, {hand: 'left'|'right'|'thumbs', name: string}>}
 */
export const POSITION_TO_FINGER = {
  RIGHT_INDEX: { hand: 'right', name: 'index' },
  RIGHT_MIDDLE: { hand: 'right', name: 'middle' },
  RIGHT_RING: { hand: 'right', name: 'ring' },
  RIGHT_LITTLE: { hand: 'right', name: 'pinky' },
  LEFT_INDEX: { hand: 'left', name: 'index' },
  LEFT_MIDDLE: { hand: 'left', name: 'middle' },
  LEFT_RING: { hand: 'left', name: 'ring' },
  LEFT_LITTLE: { hand: 'left', name: 'pinky' },
  RIGHT_THUMB: { hand: 'thumbs', name: 'right' },
  LEFT_THUMB: { hand: 'thumbs', name: 'left' },
};

/**
 * The Biometric page's "hand.name" key -> device FingerPosition (reverse of
 * POSITION_TO_FINGER), for single-finger capture/retry.
 * @type {Record<string, FingerPosition>}
 */
export const FINGER_TO_POSITION = Object.fromEntries(
  Object.entries(POSITION_TO_FINGER).map(([position, { hand, name }]) => [`${hand}.${name}`, position]),
);

/**
 * This page's group key -> the device FingerGroup.
 * @type {Record<'left'|'right'|'thumbs', FingerGroup>}
 */
export const GROUP_KEY_TO_DEVICE = {
  left: 'LEFT_HAND',
  right: 'RIGHT_HAND',
  thumbs: 'THUMBS',
};
