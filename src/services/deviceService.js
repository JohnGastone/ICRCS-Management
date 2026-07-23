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
export async function pollUntilTerminal(jobId, onTick, intervalMs = 150) {
  for (;;) {
    const job = await getCaptureJob(jobId);
    if (onTick) onTick(job);
    if (TERMINAL_STATUSES.has(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Open the live-preview WebSocket for an in-progress capture job. The agent
 * relays RSWAS's own CanvasInfo feed (base64 PNG, ~30ms cadence - matching
 * RSWAS's own reference sample) while the job is IN_PROGRESS, plus RSWAS's
 * own real-time guidance text (its msg/cmsg fields, e.g. what to do next),
 * then sends one final frameless status message and closes the socket itself
 * once the job reaches a terminal state - this function does not need to
 * poll or close proactively, only listen.
 * @param {string} jobId
 * @param {(frame: string) => void} onFrame   called with a base64 PNG each time a live frame arrives
 * @param {(status: JobStatus) => void} [onStatus]  called with every status the socket reports, frame or not
 * @param {(text: string) => void} [onMessage]  called with RSWAS's own live guidance text, when present
 * @param {(count: number) => void} [onDetectedCount]  called with how many fingers RSWAS currently sees well enough to score
 * @returns {() => void} call to close the socket early (e.g. on unmount/cancel)
 */
export function openPreviewStream(jobId, onFrame, onStatus, onMessage, onDetectedCount) {
  const wsUrl = `${DEVICE_SERVICE_URL.replace(/^http/, 'ws')}/ws/fingerprint/${jobId}`;
  const socket = new WebSocket(wsUrl);
  const openedAt = Date.now();
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      // Diagnostic: RSWAS's own timing of detectedFingerCount/message/status
      // relative to each other is what determines whether an early "buzzer"
      // signal is even observable before the blocking /Capture call returns.
      // Check DevTools console during a real capture to see whether
      // detectedFingerCount actually climbs before status flips to COMPLETED.
      // eslint-disable-next-line no-console
      console.debug(`[fp ${jobId}] +${Date.now() - openedAt}ms status=${message.status} detectedFingerCount=${message.detectedFingerCount} message=${JSON.stringify(message.message || '')} frame=${message.frame ? 'yes' : 'no'}`);
      if (message.frame) onFrame(message.frame);
      if (onStatus && message.status) onStatus(message.status);
      if (onMessage && message.message) onMessage(message.message);
      if (onDetectedCount && typeof message.detectedFingerCount === 'number') onDetectedCount(message.detectedFingerCount);
    } catch {
      // ignore malformed frames - the next one will self-correct
    }
  };
  return () => socket.close();
}

/**
 * Start receiving live frames for a job AND resolve as soon as it finishes -
 * whichever arrives first, the WebSocket's own status push (near-instant,
 * since it's the same signal that ends the live-preview feed) or the HTTP
 * poll (a safety net in case the socket drops). This is what removes the lag
 * between the live view visibly finishing and the app rendering the result:
 * without it, the app only found out via pollUntilTerminal's next tick.
 * @param {string} jobId
 * @param {(frame: string) => void} onFrame
 * @param {(text: string) => void} [onMessage]  RSWAS's own live guidance text, when present
 * @param {(count: number) => void} [onDetectedCount]  how many fingers RSWAS currently sees well enough to score
 * @param {number} [pollIntervalMs]
 * @returns {{ result: Promise<CaptureJob>, close: () => void }}
 */
export function awaitCapture(jobId, onFrame, onMessage, onDetectedCount, pollIntervalMs = 150) {
  let settled = false;
  let fastResolve;
  const fast = new Promise((resolve) => { fastResolve = resolve; });
  const close = openPreviewStream(jobId, onFrame, (status) => {
    if (settled || !TERMINAL_STATUSES.has(status)) return;
    settled = true;
    fastResolve(getCaptureJob(jobId));
  }, onMessage, onDetectedCount);
  const polled = pollUntilTerminal(jobId, null, pollIntervalMs).then((job) => {
    settled = true;
    return job;
  });
  return { result: Promise.race([fast, polled]), close };
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

// --- Camera (Canon EDSDK bridge) and Signature pad (Wacom STU-430 bridge) ---
//
// Unlike fingerprint capture, neither of these is an async job: a DSLR
// shutter press is fast, and a signature is just read back from whatever the
// live view already shows - see icrcs-device-service's camera/signature
// modules. Both follow the same shape: GET .../status, WS /ws/<device> for a
// continuously-running live view (open the socket to start it, close to stop),
// and POST .../capture to take the shot/read back the current drawing.

/** @returns {Promise<{connected: boolean, message: string}>} */
export function getCameraStatus() {
  return fetch(`${DEVICE_SERVICE_URL}/api/v1/camera/status`).then((res) => asJson(res, 'Camera status check'));
}

/** @returns {Promise<{connected: boolean, message: string}>} */
export function getSignaturePadStatus() {
  return fetch(`${DEVICE_SERVICE_URL}/api/v1/signature/status`).then((res) => asJson(res, 'Signature pad status check'));
}

/** Takes a photo now. @returns {Promise<string>} base64 PNG/JPEG */
export async function captureCameraPhoto() {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/camera/capture`, { method: 'POST' });
  const body = await asJson(response, 'Camera capture');
  return body.image;
}

/** Reads back whatever is currently signed on the pad. @returns {Promise<string>} base64 PNG */
export async function captureSignature() {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/signature/capture`, { method: 'POST' });
  const body = await asJson(response, 'Signature capture');
  return body.image;
}

/** Clears whatever is currently drawn on the physical pad. */
export async function clearSignaturePad() {
  const response = await fetch(`${DEVICE_SERVICE_URL}/api/v1/signature/clear`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Signature pad clear failed (${response.status})`);
  }
}

/**
 * Opens a live-view WebSocket for the camera or signature pad. The socket's
 * own open/close lifecycle starts and stops the device's live view - close()
 * MUST be called (e.g. on unmount, or when leaving the capture step) or the
 * bridge is left streaming indefinitely.
 * @param {'camera'|'signature'} device
 * @param {(frame: string) => void} onFrame  called with a base64 frame each time one arrives
 * @returns {() => void} call to close the socket
 */
export function openLiveView(device, onFrame) {
  const wsUrl = `${DEVICE_SERVICE_URL.replace(/^http/, 'ws')}/ws/${device}`;
  const socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.frame) onFrame(message.frame);
    } catch {
      // ignore malformed frames - the next one will self-correct
    }
  };
  return () => socket.close();
}
