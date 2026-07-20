import React, { useState, useEffect, useCallback } from 'react';
import { getEnrollmentQueue, getCaseBySubject, enrollCase } from '../../../services/managementService';
import { Search, Globe, AlertCircle, Loader2, Eye, Camera, CheckCircle, X, XCircle, Fingerprint, ChevronDown, Filter, FileCheck, SendHorizontal, StickyNote, Upload, Pen, RefreshCw, AlertTriangle, Sun, Image, User, FolderOpen, ClipboardList, MessageSquare, ArrowLeft, Download, FileText, Clock, ArrowUpDown } from 'lucide-react';
import ApplicantInfoView from '../../../components/common/ApplicantInfoView';
import { buildApplicant } from '../../../data/mockApplicantData';
import { useAuth } from '../../../app/providers/AuthProvider';
import {
  startCapture,
  startGroupCapture,
  pollUntilTerminal,
  openPreviewStream,
  POSITION_TO_FINGER,
  FINGER_TO_POSITION,
  GROUP_KEY_TO_DEVICE,
} from '../../../services/deviceService';

// Maximum scanner qualityScore to accept a finger. Confirmed on real RealScan-G10
// hardware: RSWAS/UFExtractor returns the legacy NFIQ scale (1 = best, 5 = worst),
// NOT a 0-100 score where higher is better. 3 is the "Acceptable" ceiling used by
// getQualityLabel below - NFIQ 1-3 accepted, 4-5 rejected.
const MAX_ACCEPTABLE_NFIQ = 3;

// Fingers that make up each physical placement group on the RealScan-G10. Shared
// by capture and group-recapture so both operate on exactly the same set.
const GROUP_FINGERS = {
  left: [{ hand: 'left', name: 'index' }, { hand: 'left', name: 'middle' }, { hand: 'left', name: 'ring' }, { hand: 'left', name: 'pinky' }],
  thumbs: [{ hand: 'thumbs', name: 'left' }, { hand: 'thumbs', name: 'right' }],
  right: [{ hand: 'right', name: 'index' }, { hand: 'right', name: 'middle' }, { hand: 'right', name: 'ring' }, { hand: 'right', name: 'pinky' }],
};
const GROUP_LABELS = { left: 'Left Hand', thumbs: 'Thumbs', right: 'Right Hand' };

const viewNotesHistory = [
  {id:1,ts:'12-Jun-2026 10:15 AM',officer:'J. Smith',text:'Initial assessment started. Documents reviewed and applicant identity verified.',recommendation:null},
  {id:2,ts:'12-Jun-2026 11:05 AM',officer:'J. Smith',text:'Biometric verification confirmed successful. Applicant meets initial eligibility criteria.',recommendation:null},
  {id:3,ts:'12-Jun-2026 12:30 PM',officer:'A. Mwenda',text:'Recommendation updated: Further verification required due to minor document discrepancy on entry records.',recommendation:'escalate'},
];

let nextCaseSeq = 246;

const statusBadge = (s) => {
  if (s === 'Forwarded to Assessment') return 'bg-purple-50 text-purple-700 border-purple-100';
  if (s === 'Biometric Enrollment Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'Biometric In Progress') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (s === 'Verification Failed') return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

const buildDetails = (row) => ({
  caseNo: row.caseNo,
  appNo: row.appNo,
  appType: 'Status Determination',
  submissionDate: row.dateReceived,
  currentStatus: row.status,
  fullName: row.fullName,
  gender: 'Not specified',
  dob: 'Not specified',
  nationality: row.nationality,
  passportNo: 'Not on record',
  countryOfIssue: 'Not on record',
  entryPoint: 'Not on record',
  dateOfEntry: 'Not on record',
  attachments: ['Passport Copy', 'Birth Certificate', 'Supporting Documents'],
  officer: row.officer,
  dateReceived: row.dateReceived,
});

export default function Biometric() {
  const { user } = useAuth();
  const [appNumber, setAppNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedApp, setFetchedApp] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const data = await getEnrollmentQueue({ page: 0, size: 100 });
      const items = (data?.items || []).map(c => ({
        caseNo: c.caseNo,
        appNo: c.subjectId,
        fullName: c.fullName,
        nationality: c.nationalityCode,
        status: 'Pending Biometric Capture',
        officer: c.assignedOfficerName || '',
        dateReceived: c.assignedDate || c.createdAt,
      }));
      setQueue(items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState('info');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [releaseRemarksError, setReleaseRemarksError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureTarget, setCaptureTarget] = useState(null);
  const [captureStep, setCaptureStep] = useState(1);
  const [waveMsg, setWaveMsg] = useState({ text: '', type: '' });
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [photoQuality, setPhotoQuality] = useState({ score: 0, checks: { faceCentered: false, neutralExpression: false, goodLighting: false, eyesVisible: false, noShadows: false, noObstruction: false, plainBackground: false } });
  const [photoTimestamp, setPhotoTimestamp] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const fileInputRef = React.useRef(null);
  const [fingerprints, setFingerprints] = useState({
    left: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' },
    right: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' },
    thumbs: { left: 'pending', right: 'pending' },
  });
  const [signatureCaptured, setSignatureCaptured] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [signatureTimestamp, setSignatureTimestamp] = useState('');
  const [signatureMethod, setSignatureMethod] = useState('');
  const [signatureQuality, setSignatureQuality] = useState({ score: 0, checks: { visible: false, complete: false, noCropping: false, goodContrast: false, noExcessMarks: false, confirmed: false } });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigStrokes, setSigStrokes] = useState([]);
  const sigCanvasRef = React.useRef(null);
  const sigFileInputRef = React.useRef(null);
  const [fpQuality, setFpQuality] = useState({
    left: { index: 0, middle: 0, ring: 0, pinky: 0 },
    right: { index: 0, middle: 0, ring: 0, pinky: 0 },
    thumbs: { left: 0, right: 0 },
  });
  const [fpComments, setFpComments] = useState({
    left: { index: '', middle: '', ring: '', pinky: '' },
    right: { index: '', middle: '', ring: '', pinky: '' },
    thumbs: { left: '', right: '' },
  });
  const [selectedFinger, setSelectedFinger] = useState(null);
  const [scanningFinger, setScanningFinger] = useState(null);
  // Latest base64 PNG frame from the scanner's live-preview WebSocket, shown in
  // the viewfinder panel while scanningFinger is set. Cleared once the job ends.
  const [livePreviewFrame, setLivePreviewFrame] = useState(null);
  // base64 image + ISO template per captured finger, keyed [hand][name] - held in
  // a ref so it survives re-renders without triggering them; read at enrollment.
  const capturedArtifactsRef = React.useRef({ left: {}, right: {}, thumbs: {} });
  const [commentModal, setCommentModal] = useState({ open: false, hand: '', name: '', label: '', comment: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const rowsPerPageOptions = [5, 20, 50, 100];
  const [sortField, setSortField] = useState('dateReceived');
  const [sortDir, setSortDir] = useState('desc');

  const [showQuickServeModal, setShowQuickServeModal] = useState(false);
  const [quickServeTarget, setQuickServeTarget] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('info');
  const [viewPreviewDoc, setViewPreviewDoc] = useState(null);
  const [showForwardConfirm, setShowForwardConfirm] = useState(false);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [forwardCheck, setForwardCheck] = useState(false);
  const [forwardComment, setForwardComment] = useState('');

  const clearSuccess = () => setSuccessMsg('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setFetchedApp(null);
    clearSuccess();
    if (!appNumber.trim()) { setError('Please enter the Subject ID.'); return; }
    setLoading(true);
    try {
      const c = await getCaseBySubject(appNumber.trim());
      if (!c) { setError('No case found for that Subject ID.'); return; }
      const existingRow = queue.find(q => q.appNo === c.subjectId || q.caseNo === c.caseNo);
      if (existingRow) {
        const sexId = c.person?.sexId;
        const photoUrl = c.applicantData?.attachments?.find(
          a => a.attachmentType === 'Applicant Passport Size Photo'
        )?.fileUrl || null;
        setQuickServeTarget({
          queueRow: existingRow,
          fullName: c.person?.fullName || existingRow.fullName || c.subjectId,
          sex: sexId === 1 ? 'Male' : sexId === 2 ? 'Female' : 'N/A',
          dob: c.person?.dateOfBirth || 'N/A',
          nationality: c.person?.nationalityCode || existingRow.nationality,
          caseNo: c.caseNo || existingRow.caseNo,
          appNo: c.subjectId,
          photoUrl,
        });
        setShowQuickServeModal(true);
        return;
      }
      setFetchedApp({
        appNo: c.subjectId,
        caseNo: c.caseNo,
        appType: c.registrationType,
        fullName: c.person?.fullName || c.subjectId,
        nationality: c.person?.nationalityCode,
        dob: c.person?.dateOfBirth,
        currentStatus: c.status,
      });
      setReviewRemarks('');
      setReleaseRemarksError('');
      setShowReviewModal(true);
    } catch (err) {
      setError(err.message || 'No case found for that Subject ID.');
    } finally {
      setLoading(false);
    }
  };

  const closeReviewModal = () => { setShowReviewModal(false); setFetchedApp(null); setReviewRemarks(''); setReleaseRemarksError(''); setActiveReviewTab('info'); setPreviewDoc(null); };
  const closeQuickServeModal = () => { setShowQuickServeModal(false); setQuickServeTarget(null); };

  const saveToBiometricEnrollment = () => {
    if (!fetchedApp) return;
    const caseNo = `ICRCS-BIO-2026-${String(nextCaseSeq++).padStart(5, '0')}`;
    const dateReceived = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newItem = {
      caseNo, appNo: fetchedApp.appNo, fullName: fetchedApp.fullName, nationality: fetchedApp.nationality,
      status: 'Pending Biometric Capture', officer: user?.name || '', dateReceived,
      details: { ...fetchedApp, caseNo, currentStatus: 'Pending Biometric Capture', officer: user?.name || '', dateReceived }
    };
    setQueue(prev => [newItem, ...prev]);
    closeReviewModal();
    setAppNumber('');
    setCurrentPage(1);
    setSuccessMsg('Application successfully received into Biometric Enrollment.');
    setTimeout(clearSuccess, 5000);
  };

  const releaseApplication = () => {
    if (!reviewRemarks.trim()) { setReleaseRemarksError('Remarks are required when releasing an application.'); return; }
    closeReviewModal();
    setAppNumber('');
    setSuccessMsg('Application has been released back to the Online Application Portal.');
    setTimeout(clearSuccess, 5000);
  };

  const filteredQueue = queue.filter(q => {
    const matchesSearch = q.caseNo.toLowerCase().includes(search.toLowerCase()) || q.appNo.toLowerCase().includes(search.toLowerCase()) || q.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedQueue = [...filteredQueue].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'dateReceived') cmp = new Date(a.dateReceived) - new Date(b.dateReceived);
    else if (sortField === 'caseNo') cmp = a.caseNo.localeCompare(b.caseNo);
    else if (sortField === 'appNo') cmp = a.appNo.localeCompare(b.appNo);
    else if (sortField === 'fullName') cmp = a.fullName.localeCompare(b.fullName);
    else if (sortField === 'nationality') cmp = a.nationality.localeCompare(b.nationality);
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortField === 'officer') cmp = a.officer.localeCompare(b.officer);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedQueue.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, sortedQueue.length);
  const paginatedQueue = sortedQueue.slice(startIndex, endIndex);

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goFirst = () => goToPage(1);
  const goLast = () => goToPage(totalPages);
  const goNext = () => goToPage(safePage + 1);
  const goPrev = () => goToPage(safePage - 1);

  const openCapture = (row) => {
    setCaptureTarget(row);
    setCaptureStep(1);
    setPhotoCaptured(false);
    setPhotoSaved(false);
    setCameraStarted(false);
    setPhotoQuality({ score: 0, checks: { faceCentered: false, neutralExpression: false, goodLighting: false, eyesVisible: false, noShadows: false, noObstruction: false, plainBackground: false } });
    setPhotoTimestamp('');
    setPhotoPreview('');
    setShowRetakeConfirm(false);
    setAuditLog([]);
    setFingerprints({ left: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' }, right: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' }, thumbs: { left: 'pending', right: 'pending' } });
    setFpQuality({ left: { index: 0, middle: 0, ring: 0, pinky: 0 }, right: { index: 0, middle: 0, ring: 0, pinky: 0 }, thumbs: { left: 0, right: 0 } });
    setFpComments({ left: { index: '', middle: '', ring: '', pinky: '' }, right: { index: '', middle: '', ring: '', pinky: '' }, thumbs: { left: '', right: '' } });
    capturedArtifactsRef.current = { left: {}, right: {}, thumbs: {} };
    setSelectedFinger(null);
    setScanningFinger(null);
    setCommentModal({ open: false, hand: '', name: '', label: '', comment: '' });
    setSignatureCaptured(false);
    setSignaturePreview('');
    setSignatureTimestamp('');
    setSignatureMethod('');
    setSignatureQuality({ score: 0, checks: { visible: false, complete: false, noCropping: false, goodContrast: false, noExcessMarks: false, confirmed: false } });
    setShowClearConfirm(false);
    setIsDrawing(false);
    setSigStrokes([]);
    setShowCaptureModal(true);
    if (row.status === 'Pending Biometric Capture') {
      setQueue(prev => prev.map(q => q.caseNo === row.caseNo ? { ...q, status: 'Biometric In Progress' } : q));
      setSuccessMsg('Biometric capture session started successfully.');
      setTimeout(clearSuccess, 4000);
    }
  };
  const closeCapture = () => { setShowCaptureModal(false); setCaptureTarget(null); setCaptureStep(1); };

  const getFingerLabel = (hand, name) => {
    const handLabel = hand === 'left' ? 'Left' : hand === 'right' ? 'Right' : name === 'left' ? 'Left' : 'Right';
    const fingerName = name === 'index' ? 'Index' : name === 'middle' ? 'Middle' : name === 'ring' ? 'Ring' : name === 'pinky' ? 'Little' : 'Thumb';
    return `${handLabel} ${fingerName}`;
  };
  const getScanningLabel = () => {
    if (!scanningFinger) return '';
    if (scanningFinger.group) {
      return scanningFinger.group === 'left' ? 'Left Four Fingers' : scanningFinger.group === 'right' ? 'Right Four Fingers' : 'Two Thumbs';
    }
    return getFingerLabel(scanningFinger.hand, scanningFinger.name);
  };
  // NFIQ scale: 1 = best, 5 = worst.
  const getQualityLabel = (q) => {
    if (q <= 2) return { label: 'Excellent', badgeClass: 'bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30' };
    if (q <= 3) return { label: 'Acceptable', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: 'Poor', badgeClass: 'bg-red-50 text-red-600 border-red-200' };
  };
  const setGroupStatus = (fingers, status) => {
    setFingerprints(fp => {
      const next = { ...fp };
      fingers.forEach(f => { next[f.hand] = { ...next[f.hand], [f.name]: status }; });
      return next;
    });
  };
  const recaptureFinger = (hand, name) => {
    setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'pending' } }));
    setFpQuality(q => ({ ...q, [hand]: { ...q[hand], [name]: 0 } }));
    setFpComments(c => ({ ...c, [hand]: { ...c[hand], [name]: '' } }));
    delete capturedArtifactsRef.current[hand][name];
  };
  // Reset only one placement group (left hand / right hand / thumbs) back to
  // pending, leaving every other group's captured prints untouched.
  const recaptureGroup = (groupKey) => {
    if (scanningFinger) return;
    const fingers = GROUP_FINGERS[groupKey];
    setFingerprints(fp => {
      const next = { ...fp };
      fingers.forEach(f => { next[f.hand] = { ...next[f.hand], [f.name]: 'pending' }; });
      return next;
    });
    setFpQuality(q => {
      const next = { ...q };
      fingers.forEach(f => { next[f.hand] = { ...next[f.hand], [f.name]: 0 }; });
      return next;
    });
    setFpComments(c => {
      const next = { ...c };
      fingers.forEach(f => { next[f.hand] = { ...next[f.hand], [f.name]: '' }; });
      return next;
    });
    fingers.forEach(f => { delete capturedArtifactsRef.current[f.hand][f.name]; });
    if (selectedFinger && fingers.some(f => f.hand === selectedFinger.hand && f.name === selectedFinger.name)) {
      setSelectedFinger(null);
    }
  };
  const openCommentModal = (hand, name) => {
    const label = getFingerLabel(hand, name);
    setCommentModal({ open: true, hand, name, label, comment: fpComments[hand][name] || '' });
  };
  const saveCommentAndMarkException = () => {
    const { hand, name, comment } = commentModal;
    setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'exception' } }));
    setFpQuality(q => ({ ...q, [hand]: { ...q[hand], [name]: 0 } }));
    setFpComments(c => ({ ...c, [hand]: { ...c[hand], [name]: comment } }));
    setCommentModal({ open: false, hand: '', name: '', label: '', comment: '' });
  };
  // One physical placement on the RealScan-G10 captures a whole group at once;
  // icrcs-device-service returns one result per finger. We start the job, poll
  // until it's terminal, then fan the per-finger results back into the UI state.
  const captureGroup = async (groupKey) => {
    if (scanningFinger) return;
    const fingers = GROUP_FINGERS[groupKey];
    const pending = fingers.filter(f => fingerprints[f.hand][f.name] === 'pending');
    if (pending.length === 0) return;

    setScanningFinger({ group: groupKey });
    setGroupStatus(pending, 'capturing');
    let closePreview = () => {};
    try {
      const jobId = await startGroupCapture(GROUP_KEY_TO_DEVICE[groupKey]);
      closePreview = openPreviewStream(jobId, setLivePreviewFrame);
      const job = await pollUntilTerminal(jobId);
      if (job.status !== 'COMPLETED') {
        setGroupStatus(pending, 'failed');
        setSuccessMsg(`Fingerprint capture ${job.status.toLowerCase()}${job.errorMessage ? `: ${job.errorMessage}` : ''}.`);
        setTimeout(clearSuccess, 4000);
        return;
      }
      const seen = new Set();
      job.results.forEach(result => {
        const slot = POSITION_TO_FINGER[result.position];
        if (!slot) return; // ignore composite/slap entries the device may also return
        seen.add(`${slot.hand}.${slot.name}`);
        const quality = Math.round(result.qualityScore);
        const finalStatus = quality <= MAX_ACCEPTABLE_NFIQ ? 'captured' : 'failed';
        capturedArtifactsRef.current[slot.hand][slot.name] = { rawImage: result.rawImage, template: result.template, quality };
        setFingerprints(fp => ({ ...fp, [slot.hand]: { ...fp[slot.hand], [slot.name]: finalStatus } }));
        setFpQuality(q => ({ ...q, [slot.hand]: { ...q[slot.hand], [slot.name]: quality } }));
      });
      // any requested finger the scanner didn't return couldn't be read
      setGroupStatus(pending.filter(f => !seen.has(`${f.hand}.${f.name}`)), 'failed');
    } catch (e) {
      setGroupStatus(pending, 'failed');
      setSuccessMsg(`Scanner error: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 5000);
    } finally {
      closePreview();
      setLivePreviewFrame(null);
      setScanningFinger(null);
    }
  };
  const captureAllPending = async () => {
    if (scanningFinger) return;
    for (const groupKey of ['right', 'left', 'thumbs']) {
      // eslint-disable-next-line no-await-in-loop -- one physical placement at a time
      await captureGroup(groupKey);
    }
  };
  // Single-finger capture/retry for the currently selected finger.
  const captureSingleFinger = async (hand, name) => {
    if (scanningFinger) return;
    const position = FINGER_TO_POSITION[`${hand}.${name}`];
    if (!position) return;
    setScanningFinger({ hand, name });
    setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'capturing' } }));
    let closePreview = () => {};
    try {
      const jobId = await startCapture(position);
      closePreview = openPreviewStream(jobId, setLivePreviewFrame);
      const job = await pollUntilTerminal(jobId);
      if (job.status !== 'COMPLETED') {
        setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
        setSuccessMsg(`Fingerprint capture ${job.status.toLowerCase()}${job.errorMessage ? `: ${job.errorMessage}` : ''}.`);
        setTimeout(clearSuccess, 4000);
        return;
      }
      const result = job.results.find(r => POSITION_TO_FINGER[r.position]?.hand === hand && POSITION_TO_FINGER[r.position]?.name === name) || job.results[0];
      if (!result) {
        setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
        return;
      }
      const quality = Math.round(result.qualityScore);
      const finalStatus = quality <= MAX_ACCEPTABLE_NFIQ ? 'captured' : 'failed';
      capturedArtifactsRef.current[hand][name] = { rawImage: result.rawImage, template: result.template, quality };
      setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: finalStatus } }));
      setFpQuality(q => ({ ...q, [hand]: { ...q[hand], [name]: quality } }));
    } catch (e) {
      setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
      setSuccessMsg(`Scanner error: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 5000);
    } finally {
      closePreview();
      setLivePreviewFrame(null);
      setScanningFinger(null);
    }
  };
  const getFpProgress = () => {
    const all = [...Object.values(fingerprints.left), ...Object.values(fingerprints.right), ...Object.values(fingerprints.thumbs)];
    const completed = all.filter(s => s === 'captured' || s === 'exception').length;
    const total = all.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  };

  const renderFingerCard = (hand, name) => {
    const status = fingerprints[hand][name];
    const isSelected = selectedFinger && selectedFinger.hand === hand && selectedFinger.name === name;
    const quality = fpQuality[hand][name];
    const qInfo = getQualityLabel(quality);
    const label = getFingerLabel(hand, name);
    const baseClasses = 'relative p-3 rounded-2xl border-2 text-center transition-all min-h-[110px] flex flex-col items-center justify-center gap-1.5 select-none';
    const selectedClasses = isSelected ? 'ring-2 ring-icrcs-navy ring-offset-1' : '';
    const statusClasses = status === 'pending' ? 'border-gray-200 bg-blue-50/40 hover:border-icrcs-navy/40' :
      status === 'capturing' ? 'border-sky-400 bg-sky-50 animate-pulse' :
      status === 'captured' ? 'border-green-300 bg-green-50' :
      status === 'failed' ? 'border-red-300 bg-red-50' :
      'border-amber-300 bg-amber-50';
    const statusText = status === 'pending' ? 'Not Captured' : status === 'capturing' ? 'Capturing...' : status === 'captured' ? 'Captured' : status === 'failed' ? 'Capture Failed' : 'Unavailable';
    const statusColor = status === 'pending' ? 'text-gray-400' : status === 'capturing' ? 'text-sky-600' : status === 'captured' ? 'text-green-700' : status === 'failed' ? 'text-red-600' : 'text-amber-700';
    return (
      <button key={name} onClick={() => setSelectedFinger({ hand, name })} className={`${baseClasses} ${selectedClasses} ${statusClasses}`}>
        <div className="h-9 w-9 rounded-full flex items-center justify-center">
          {status === 'pending' && <Fingerprint className="h-5 w-5 text-gray-300" />}
          {status === 'capturing' && <Loader2 className="h-5 w-5 text-sky-600 animate-spin" />}
          {status === 'captured' && <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={2.5} />}
          {status === 'failed' && <X className="h-5 w-5 text-red-500" strokeWidth={2.5} />}
          {status === 'exception' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
        </div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-medium ${statusColor}`}>{statusText}</p>
        {status === 'captured' && quality > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${qInfo.badgeClass}`}>NFIQ {quality} — {qInfo.label}</span>
        )}
      </button>
    );
  };

  const addAuditEntry = (action) => {
    const entry = { action, officer: user?.name || '', timestamp: new Date().toLocaleString('en-GB'), caseNo: captureTarget?.caseNo || '', appNo: captureTarget?.appNo || '' };
    setAuditLog(prev => [entry, ...prev]);
    console.log('[Audit]', entry);
  };
  const getPhotoQualityLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', badgeClass: 'bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30' };
    if (score >= 60) return { label: 'Acceptable', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: 'Poor', badgeClass: 'bg-red-50 text-red-600 border-red-200' };
  };
  const handleStartCamera = () => {
    setCameraStarted(true);
    addAuditEntry('Camera started');
    setSuccessMsg('Camera initialized successfully.');
    setTimeout(clearSuccess, 3000);
  };
  const handleCapturePhoto = () => {
    const now = new Date();
    const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setPhotoTimestamp(ts);
    setPhotoCaptured(true);
    setPhotoSaved(false);
    // Simulate quality assessment
    const score = Math.floor(Math.random() * 25) + 70;
    setPhotoQuality({
      score,
      checks: { faceCentered: true, neutralExpression: true, goodLighting: score > 75, eyesVisible: true, noShadows: score > 70, noObstruction: true, plainBackground: score > 65 }
    });
    addAuditEntry('Photograph captured');
    setSuccessMsg('Photograph captured successfully.');
    setTimeout(clearSuccess, 3000);
  };
  const handleRetake = () => {
    setPhotoCaptured(false);
    setPhotoSaved(false);
    setPhotoQuality({ score: 0, checks: { faceCentered: false, neutralExpression: false, goodLighting: false, eyesVisible: false, noShadows: false, noObstruction: false, plainBackground: false } });
    setPhotoTimestamp('');
    setPhotoPreview('');
    setShowRetakeConfirm(false);
    addAuditEntry('Photograph retaken');
  };
  const handleSavePhoto = () => {
    setPhotoSaved(true);
    addAuditEntry('Photograph saved');
    setSuccessMsg('Photograph saved successfully.');
    setTimeout(clearSuccess, 3000);
  };
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const now = new Date();
      const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setPhotoPreview(ev.target.result);
      setPhotoTimestamp(ts);
      setPhotoCaptured(true);
      setPhotoSaved(false);
      const score = Math.floor(Math.random() * 25) + 70;
      setPhotoQuality({
        score,
        checks: { faceCentered: true, neutralExpression: true, goodLighting: score > 75, eyesVisible: true, noShadows: score > 70, noObstruction: true, plainBackground: score > 65 }
      });
      addAuditEntry('Photograph uploaded from disk');
      setSuccessMsg('Photograph uploaded from disk successfully.');
      setTimeout(clearSuccess, 3000);
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };
  const getSignatureQualityLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', badgeClass: 'bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30' };
    if (score >= 60) return { label: 'Acceptable', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: 'Poor', badgeClass: 'bg-red-50 text-red-600 border-red-200' };
  };
  const redrawSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    sigStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };
  const getCanvasPoint = (e) => {
    const canvas = sigCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };
  const handleStartDrawing = (e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setSigStrokes(prev => [...prev, [point]]);
  };
  const handleDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    setSigStrokes(prev => {
      const next = [...prev];
      next[next.length - 1] = [...next[next.length - 1], point];
      return next;
    });
  };
  const handleEndDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setTimeout(redrawSigCanvas, 0);
  };
  const handleUndoStroke = () => {
    setSigStrokes(prev => {
      const next = prev.slice(0, -1);
      setTimeout(() => {
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        next.forEach((stroke) => {
          if (stroke.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          ctx.stroke();
        });
      }, 0);
      return next;
    });
    addAuditEntry('Signature undo');
  };
  const handleClearSignature = () => {
    setSigStrokes([]);
    setSignatureCaptured(false);
    setSignaturePreview('');
    setSignatureTimestamp('');
    setSignatureMethod('');
    setSignatureQuality({ score: 0, checks: { visible: false, complete: false, noCropping: false, goodContrast: false, noExcessMarks: false, confirmed: false } });
    setShowClearConfirm(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    addAuditEntry('Signature cleared');
  };
  const handleSaveSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas || sigStrokes.length === 0) return;
    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date();
    const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setSignaturePreview(dataUrl);
    setSignatureTimestamp(ts);
    setSignatureMethod('Digital Pad');
    setSignatureCaptured(true);
    const score = Math.floor(Math.random() * 25) + 70;
    setSignatureQuality({
      score,
      checks: { visible: true, complete: true, noCropping: true, goodContrast: score > 75, noExcessMarks: score > 70, confirmed: true }
    });
    addAuditEntry('Signature saved');
    setSuccessMsg('Signature saved successfully.');
    setTimeout(clearSuccess, 3000);
  };
  const handleSigUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setSuccessMsg('Invalid signature file. Please upload PNG, JPG, or JPEG images only.');
      setTimeout(clearSuccess, 4000);
      e.target.value = '';
      addAuditEntry('Signature upload failed: invalid file type');
      return;
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setSuccessMsg('Signature file exceeds the maximum size of 2 MB.');
      setTimeout(clearSuccess, 4000);
      e.target.value = '';
      addAuditEntry('Signature upload failed: file too large');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const now = new Date();
      const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setSignaturePreview(ev.target.result);
      setSignatureTimestamp(ts);
      setSignatureMethod('Upload');
      setSignatureCaptured(true);
      const score = Math.floor(Math.random() * 25) + 70;
      setSignatureQuality({
        score,
        checks: { visible: true, complete: true, noCropping: score > 65, goodContrast: score > 75, noExcessMarks: score > 70, confirmed: true }
      });
      addAuditEntry('Signature uploaded from disk');
      setSuccessMsg('Signature uploaded successfully.');
      setTimeout(clearSuccess, 3000);
      // Also draw uploaded image onto canvas if visible
      setTimeout(() => {
        const canvas = sigCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = ev.target.result;
        }
      }, 0);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const canProceedFromStep1 = () => photoCaptured && photoSaved;
  const canProceedFromStep2 = () => {
    const allLeft = Object.values(fingerprints.left).every(s => s === 'captured' || s === 'exception');
    const allRight = Object.values(fingerprints.right).every(s => s === 'captured' || s === 'exception');
    const allThumbs = Object.values(fingerprints.thumbs).every(s => s === 'captured' || s === 'exception');
    return allLeft && allRight && allThumbs;
  };
  const canCompleteEnrollment = () => signatureCaptured;

  const completeEnrollment = () => {
    if (!captureTarget) return;
    setQueue(prev => prev.map(q => q.caseNo === captureTarget.caseNo ? { ...q, status: 'Biometric Enrollment Completed' } : q));
    setSuccessMsg('Biometric enrollment completed successfully. Application is ready for assessment.');
    setTimeout(clearSuccess, 5000);
    closeCapture();
  };

  const openViewDetails = (row) => { setViewTarget(row.details || buildDetails(row)); setActiveViewTab('info'); setViewPreviewDoc(null); setShowViewModal(true); };
  const closeViewDetails = () => { setShowViewModal(false); setViewTarget(null); setActiveViewTab('info'); setViewPreviewDoc(null); };

  const verifyBiometrics = (row) => {
    if (row.status === 'Pending Biometric Capture') {
      setSuccessMsg('Biometric verification failed. Biometric capture is required before verification.');
      setTimeout(clearSuccess, 4000);
      return;
    }
    if (row.status === 'Biometric Enrollment Completed') {
      setSuccessMsg('Biometrics already verified for this application.');
      setTimeout(clearSuccess, 4000);
      return;
    }
    const passed = Math.random() > 0.1;
    if (passed) {
      setQueue(prev => prev.map(q => q.caseNo === row.caseNo ? { ...q, status: 'Biometric Enrollment Completed' } : q));
      setSuccessMsg('Biometric verification completed successfully.');
    } else {
      setQueue(prev => prev.map(q => q.caseNo === row.caseNo ? { ...q, status: 'Verification Failed' } : q));
      setSuccessMsg('Biometric verification failed. Please review and recapture if necessary.');
    }
    setTimeout(clearSuccess, 4000);
  };

  const confirmForward = (row) => { setForwardTarget(row); setForwardCheck(false); setForwardComment(''); setShowForwardConfirm(true); };
  const cancelForward = () => { setShowForwardConfirm(false); setForwardTarget(null); setForwardCheck(false); setForwardComment(''); };
  const doForward = async () => {
    if (!forwardTarget || !forwardCheck) return;
    try {
      await enrollCase(forwardTarget.caseNo);
      setQueue(prev => prev.filter(q => q.caseNo !== forwardTarget.caseNo));
      setSuccessMsg('Application forwarded to Assessment queue.');
      setTimeout(clearSuccess, 4000);
    } catch (err) {
      setError(err.message);
    }
    cancelForward();
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safePage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (safePage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = safePage - 1; i <= safePage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biometric Enrollment</h1>
          <p className="text-sm text-gray-500 mt-1">Receive applications, capture and verify applicant biometrics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-sm font-semibold border border-icrcs-navy/10">{queue.length} in Queue</span>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="h-4 w-4 text-green-600" /> {successMsg}
        </div>
      )}

      {/* Receive Application Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-icrcs-navy/10 flex items-center justify-center"><Globe className="h-5 w-5 text-icrcs-navy" /></div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Receive Application from Online Portal</h2>
            <p className="text-xs text-gray-500">Enter an application number to retrieve the submission for biometric enrollment.</p>
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Application Number</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={appNumber} onChange={(e) => { setAppNumber(e.target.value); setError(''); clearSuccess(); }} placeholder="e.g. APP-2026-000145" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all" />
            </div>
            {error && <p className="mt-2 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
          </div>
          <div className="sm:self-end">
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search Application
            </button>
          </div>
        </form>
      </div>

      {/* Review Modal */}
      {showReviewModal && fetchedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={closeReviewModal} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft className="h-4 w-4 text-gray-500"/></button>
                <div>
                  <h2 className="text-base font-bold text-gray-800">Review Online Application</h2>
                  <p className="text-sm text-gray-400 font-mono">{fetchedApp.appNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{fetchedApp.appType}</span>
                <button onClick={closeReviewModal} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 bg-white">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  {id:'info',label:'Applicant Info',icon:<User className="h-4 w-4"/>},
                  {id:'attachments',label:'Attachments',icon:<FolderOpen className="h-4 w-4"/>},
                  {id:'actions',label:'Review Actions',icon:<ClipboardList className="h-4 w-4"/>},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setActiveReviewTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeReviewTab===t.id?'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeReviewTab==='info'&&<ApplicantInfoView data={buildApplicant(fetchedApp)}/>}

              {activeReviewTab==='attachments'&&(
                <div className="flex flex-col lg:flex-row gap-5 h-full">
                  <div className="lg:w-[55%] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-800">Uploaded Attachments ({fetchedApp.attachments?.length||0})</h3>
                      <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                    </div>
                    <div className="space-y-2">
                      {(fetchedApp.attachments||[]).map((att,i)=>{
                        const name = att.includes('.') ? att : `${att}.pdf`;
                        const ext = name.split('.').pop().toLowerCase();
                        return(
                          <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-red-600 uppercase">{ext}</span></div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{name}</div>
                                <div className="text-[10px] text-gray-400">Uploaded via Online Portal</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={()=>setPreviewDoc({name,ext})} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                              <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="lg:w-[45%] space-y-4">
                    {previewDoc?(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Document Preview</span></div>
                          <button onClick={()=>setPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                        </div>
                        <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><span className="text-sm font-bold text-red-600 uppercase">{previewDoc.ext}</span></div>
                          <p className="text-sm font-medium text-gray-700 mb-1">{previewDoc.name}</p>
                          <p className="text-xs text-gray-400 mb-4">Uploaded via Online Portal</p>
                          <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1"><Download className="h-3 w-3"/>Download</button>
                            <button className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy-light transition-colors">Open in Viewer</button>
                          </div>
                        </div>
                      </div>
                    ):(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
                        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><FileText className="h-6 w-6 text-gray-300"/></div>
                        <p className="text-sm font-medium text-gray-500">Select a document to preview</p>
                        <p className="text-xs text-gray-400 mt-1">Click the eye icon on any document</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeReviewTab==='actions'&&(
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-icrcs-navy"/>Review Remarks</h4>
                    <textarea value={reviewRemarks} onChange={(e) => { setReviewRemarks(e.target.value); setReleaseRemarksError(''); }} placeholder="Enter review remarks here..." rows={5} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none transition-all" />
                    {releaseRemarksError && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {releaseRemarksError}</p>}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-icrcs-navy"/>Application Summary</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Application Number</span><span className="font-mono text-sm text-gray-900">{fetchedApp.appNo}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Application Type</span><span className="text-sm text-gray-900">{fetchedApp.appType}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Submission Date</span><span className="text-sm text-gray-900">{fetchedApp.submissionDate}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Current Status</span><span className="text-sm text-gray-900">{fetchedApp.currentStatus}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button onClick={closeReviewModal} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
                    <button onClick={releaseApplication} className="px-5 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"><X className="h-4 w-4" /> Release Application</button>
                    <button onClick={saveToBiometricEnrollment} className="px-5 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Save to Biometric Enrollment</button>
                  </div>
                </div>
              )}
            </div>
            {activeReviewTab!=='actions'&&(
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button onClick={closeReviewModal} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick-Serve Modal — applicant already in queue */}
      {showQuickServeModal && quickServeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">Applicant Found</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{quickServeTarget.caseNo}</p>
              </div>
              <button onClick={closeQuickServeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col items-center gap-4">
              {/* Passport-size photo */}
              <div className="h-32 w-26 rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center" style={{ width: '6.5rem', height: '8rem' }}>
                {quickServeTarget.photoUrl ? (
                  <img
                    src={quickServeTarget.photoUrl}
                    alt="Passport photo"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div className={`w-full h-full flex-col items-center justify-center gap-1 ${quickServeTarget.photoUrl ? 'hidden' : 'flex'}`}>
                  <User className="h-12 w-12 text-gray-300" />
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">No Photo</span>
                </div>
              </div>

              {/* Info rows */}
              <div className="w-full divide-y divide-gray-50 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Full Name</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[60%] leading-tight">{quickServeTarget.fullName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Gender</span>
                  <span className="font-semibold text-gray-900">{quickServeTarget.sex}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Date of Birth</span>
                  <span className="font-semibold text-gray-900">{quickServeTarget.dob}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Nationality</span>
                  <span className="font-semibold text-gray-900">{quickServeTarget.nationality}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">App No</span>
                  <span className="font-mono text-xs font-semibold text-gray-700">{quickServeTarget.appNo}</span>
                </div>
              </div>

              {/* Status note */}
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-full text-center">
                Already in enrollment queue — ready for biometric capture.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={closeQuickServeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                Close
              </button>
              <button
                onClick={() => { closeQuickServeModal(); openCapture(quickServeTarget.queueRow); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Camera className="h-4 w-4" /> Start Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Fingerprint className="h-4 w-4 text-icrcs-navy" /> Applications in Biometric Enrollment Stage</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search by case, app no or name..." className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy w-56 transition-all" />
            </div>
            <div className="relative">
              <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy appearance-none transition-all">
                <option>All</option>
                <option>Pending Biometric Capture</option>
                <option>Biometric In Progress</option>
                <option>Biometric Enrollment Completed</option>
                <option>Verification Failed</option>
                <option>Forwarded to Assessment</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        {/* Desktop/Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider cursor-pointer" onClick={() => { setSortField('caseNo'); setSortDir(sortField === 'caseNo' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Case No<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider hidden lg:table-cell cursor-pointer" onClick={() => { setSortField('appNo'); setSortDir(sortField === 'appNo' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Application No<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider cursor-pointer" onClick={() => { setSortField('fullName'); setSortDir(sortField === 'fullName' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Applicant Name<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider hidden md:table-cell cursor-pointer" onClick={() => { setSortField('nationality'); setSortDir(sortField === 'nationality' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Nationality<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider cursor-pointer" onClick={() => { setSortField('status'); setSortDir(sortField === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Status<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider cursor-pointer" onClick={() => { setSortField('dateReceived'); setSortDir(sortField === 'dateReceived' && sortDir === 'asc' ? 'desc' : 'asc'); }}><div className="flex items-center gap-1">Date Received<ArrowUpDown className="h-3 w-3"/></div></th>
                <th className="text-right px-5 py-3 font-semibold text-gray-500 text-sm tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedQueue.map((row) => (
                <tr key={row.caseNo} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-sm text-gray-800">{row.caseNo}</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-gray-500 hidden lg:table-cell">{row.appNo}</td>
                  <td className="px-5 py-3.5 font-medium text-sm text-gray-800">{row.fullName}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">{row.nationality}</td>
                  <td className="px-5 py-3.5"><span className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusBadge(row.status)}`}>{row.status}</span></td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{row.dateReceived}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openViewDetails(row)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="View Application Details"><Eye className="h-3.5 w-3.5" strokeWidth={3} /></button>
                      {(row.status === 'Pending Biometric Capture' || row.status === 'Biometric In Progress' || row.status === 'Verification Failed') && (
                        <button onClick={() => openCapture(row)} className="p-1.5 rounded-lg hover:bg-icrcs-navy/10 text-gray-400 hover:text-icrcs-navy transition-colors" title="Start Biometric Capture"><Camera className="h-3.5 w-3.5" strokeWidth={3} /></button>
                      )}
                      {(row.status === 'Biometric In Progress' || row.status === 'Verification Failed') && (
                        <button onClick={() => verifyBiometrics(row)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Verify Biometrics"><CheckCircle className="h-3.5 w-3.5" strokeWidth={3} /></button>
                      )}
                      {row.status === 'Biometric Enrollment Completed' && (
                        <button onClick={() => confirmForward(row)} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors" title="Forward to Assessments"><SendHorizontal className="h-3.5 w-3.5" strokeWidth={3} /></button>
                      )}
                      <button onClick={() => setQueue(prev => prev.filter(q => q.caseNo !== row.caseNo))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Release Application"><X className="h-3.5 w-3.5" strokeWidth={3} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQueue.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No applications match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedQueue.map((row) => (
            <div key={row.caseNo} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-gray-400">{row.caseNo}</p>
                  <p className="font-semibold text-sm text-gray-900 mt-0.5">{row.fullName}</p>
                </div>
                <span className={`shrink-0 text-sm px-2 py-0.5 rounded-full border font-medium ${statusBadge(row.status)}`}>{row.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{row.appNo}</span>
                <span>{row.dateReceived}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => openViewDetails(row)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"><Eye className="h-3.5 w-3.5" strokeWidth={3} /> View</button>
                {(row.status === 'Pending Biometric Capture' || row.status === 'Biometric In Progress' || row.status === 'Verification Failed') && (
                  <button onClick={() => openCapture(row)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-icrcs-navy/5 text-sm font-medium text-icrcs-navy hover:bg-icrcs-navy/10 transition-colors"><Camera className="h-3.5 w-3.5" strokeWidth={3} /> Capture</button>
                )}
                {(row.status === 'Biometric In Progress' || row.status === 'Verification Failed') && (
                  <button onClick={() => verifyBiometrics(row)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"><CheckCircle className="h-3.5 w-3.5" strokeWidth={3} /> Verify</button>
                )}
                {row.status === 'Biometric Enrollment Completed' && (
                  <button onClick={() => confirmForward(row)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"><SendHorizontal className="h-3.5 w-3.5" strokeWidth={3} /> Forward</button>
                )}
                <button onClick={() => setQueue(prev => prev.filter(q => q.caseNo !== row.caseNo))} className="px-3 py-2 rounded-lg bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"><X className="h-3.5 w-3.5" strokeWidth={3} /></button>
              </div>
            </div>
          ))}
          {filteredQueue.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-400">No applications match your search.</div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>Rows:</span>
            <div className="relative">
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="appearance-none pl-2 pr-6 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-600 focus:outline-none cursor-pointer">
                {rowsPerPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="h-3 w-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span>Showing {filteredQueue.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredQueue.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={goFirst} disabled={safePage <= 1} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">First</button>
            <button onClick={goPrev} disabled={safePage <= 1} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Prev</button>
            <span className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-semibold text-gray-700">{safePage}/{totalPages}</span>
            <button onClick={goNext} disabled={safePage >= totalPages} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Next</button>
            <button onClick={goLast} disabled={safePage >= totalPages} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Last</button>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {showViewModal && viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={closeViewDetails} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft className="h-4 w-4 text-gray-500"/></button>
                <div>
                  <h2 className="text-base font-bold text-gray-800">Application Details</h2>
                  <p className="text-sm text-gray-400 font-mono">{viewTarget.caseNo} / {viewTarget.appNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{viewTarget.appType}</span>
                <button onClick={closeViewDetails} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 bg-white">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  {id:'info',label:'Applicant Info',icon:<User className="h-4 w-4"/>},
                  {id:'attachments',label:'Attachments',icon:<FolderOpen className="h-4 w-4"/>},
                  {id:'remarks',label:'Review Remarks',icon:<MessageSquare className="h-4 w-4"/>},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setActiveViewTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeViewTab===t.id?'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeViewTab==='info'&&<ApplicantInfoView data={buildApplicant(viewTarget)}/>}

              {activeViewTab==='attachments'&&(
                <div className="flex flex-col lg:flex-row gap-5 h-full">
                  <div className="lg:w-[55%] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-800">Uploaded Attachments ({viewTarget.attachments?.length||0})</h3>
                      <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                    </div>
                    <div className="space-y-2">
                      {(viewTarget.attachments||[]).map((att,i)=>{
                        const name = att.includes('.') ? att : `${att}.pdf`;
                        const ext = name.split('.').pop().toLowerCase();
                        return(
                          <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-red-600 uppercase">{ext}</span></div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{name}</div>
                                <div className="text-[10px] text-gray-400">Uploaded via Online Portal</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={()=>setViewPreviewDoc({name,ext})} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                              <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="lg:w-[45%] space-y-4">
                    {viewPreviewDoc?(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Document Preview</span></div>
                          <button onClick={()=>setViewPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                        </div>
                        <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><span className="text-sm font-bold text-red-600 uppercase">{viewPreviewDoc.ext}</span></div>
                          <p className="text-sm font-medium text-gray-700 mb-1">{viewPreviewDoc.name}</p>
                          <p className="text-xs text-gray-400 mb-4">Uploaded via Online Portal</p>
                          <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1"><Download className="h-3 w-3"/>Download</button>
                            <button className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy-light transition-colors">Open in Viewer</button>
                          </div>
                        </div>
                      </div>
                    ):(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
                        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><FileText className="h-6 w-6 text-gray-300"/></div>
                        <p className="text-sm font-medium text-gray-500">Select a document to preview</p>
                        <p className="text-xs text-gray-400 mt-1">Click the eye icon on any document</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeViewTab==='remarks'&&(
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-icrcs-navy"/>Assessment Notes & Recommendations History</h4>
                    <div className="space-y-4">
                      {viewNotesHistory.map(h=>{
                        const recBadge=h.recommendation==='approve'?{cls:'bg-green-50 text-green-700 border-green-200',label:'Approved'}:h.recommendation==='reject'?{cls:'bg-red-50 text-red-700 border-red-200',label:'Rejected'}:h.recommendation==='escalate'?{cls:'bg-amber-50 text-amber-700 border-amber-200',label:'Escalated'}:null;
                        return(
                          <div key={h.id} className="border-l-2 border-gray-200 pl-4 py-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-icrcs-navy">{h.ts}</span>
                              <span className="text-xs text-gray-400">Officer: {h.officer}</span>
                              {recBadge&&<span className={`text-xs px-2 py-0.5 rounded-full border ${recBadge.cls}`}>{recBadge.label}</span>}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{h.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button onClick={closeViewDetails} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Confirmation Dialog */}
      {showForwardConfirm && forwardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelForward} />
          <div className="relative bg-white rounded-none sm:rounded-2xl shadow-xl border border-gray-100 w-full sm:max-w-md m-0 sm:m-4 p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <SendHorizontal className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Forward to Assessments</h3>
                <p className="text-xs text-gray-500">{forwardTarget.caseNo}</p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={forwardCheck} onChange={(e)=>{setForwardCheck(e.target.checked);setForwardComment('');}} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0" />
              <span className="text-sm text-gray-600">Are you sure you want to forward this application to Assessments? This action will transfer the case and create an audit trail entry.</span>
            </label>
            {forwardCheck && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Comment</label>
                <textarea value={forwardComment} onChange={(e)=>setForwardComment(e.target.value)} placeholder="Enter your comment..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all" />
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={cancelForward} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={doForward} disabled={!forwardCheck} className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Enrollment Modal */}
      {showCaptureModal && captureTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900">Biometric Enrollment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Capture and verify applicant biometric information</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span><span className="text-gray-400">Application No.:</span> <span className="font-mono font-medium">{captureTarget.appNo}</span></span>
                  <span><span className="text-gray-400">Case No.:</span> <span className="font-mono font-medium">{captureTarget.caseNo}</span></span>
                  <span><span className="text-gray-400">Applicant:</span> <span className="font-medium">{captureTarget.fullName}</span></span>
                  <span><span className="text-gray-400">Nationality:</span> <span className="font-medium">{captureTarget.nationality}</span></span>
                </div>
              </div>
              <button onClick={closeCapture} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors shrink-0"><X className="h-4 w-4" /></button>
            </div>

            {/* Step Navigation */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                {[
                  { n: 1, label: 'Photo', icon: Camera },
                  { n: 2, label: 'Fingerprints', icon: Fingerprint },
                  { n: 3, label: 'Signature', icon: Pen },
                ].map((step, idx) => {
                  const isActive = captureStep === step.n;
                  const isCompleted = captureStep > step.n || (step.n === 1 && photoSaved) || (step.n === 2 && canProceedFromStep2()) || (step.n === 3 && signatureCaptured);
                  return (
                    <React.Fragment key={step.n}>
                      {idx > 0 && <div className={`hidden sm:block flex-1 h-0.5 max-w-16 ${isCompleted ? 'bg-icrcs-gold' : 'bg-gray-200'}`} />}
                      <button onClick={() => { if (isCompleted) setCaptureStep(step.n); }} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isActive ? 'bg-icrcs-navy text-white shadow-sm' : isCompleted ? 'text-icrcs-gold' : 'text-gray-400'}`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white text-icrcs-navy' : isCompleted ? 'bg-icrcs-gold text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {isCompleted && !isActive ? <CheckCircle className="h-3.5 w-3.5" strokeWidth={3} /> : step.n}
                        </div>
                        <span className="text-sm font-semibold hidden sm:inline">{step.label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="relative flex-1 overflow-y-auto p-5 sm:p-6 min-h-[320px]">
              {/* Step 1: Photo Capture */}
              {captureStep === 1 && (
                <div className="space-y-5 max-w-5xl mx-auto">
                  {/* Row 1: Live Camera Preview + Captured Photo Preview */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Card 1: Live Camera Preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-icrcs-navy" />
                        Live Camera Preview
                      </h4>
                      <div className="flex-1 min-h-[160px] rounded-xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center justify-center overflow-hidden relative">
                        {photoCaptured ? (
                          photoPreview ? (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <img src={photoPreview} alt="Captured" className="max-h-[180px] w-auto object-contain rounded-lg" />
                              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                                <CheckCircle className="h-3 w-3 text-green-600" strokeWidth={2.5} />
                                <span className="text-xs font-medium text-green-700">Captured</span>
                              </div>
                              <div className="absolute bottom-3 right-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-lg">{photoTimestamp}</div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-green-50/30 p-6">
                              <div className="inline-flex h-14 w-14 rounded-full bg-green-100 items-center justify-center">
                                <CheckCircle className="h-7 w-7 text-green-600" strokeWidth={2} />
                              </div>
                              <p className="text-xs font-medium text-gray-700">Photograph captured</p>
                              <p className="text-sm text-gray-400">{photoTimestamp}</p>
                            </div>
                          )
                        ) : cameraStarted ? (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <svg viewBox="0 0 120 100" className="w-16 h-auto text-gray-300">
                              <rect x="15" y="10" width="70" height="80" rx="12" fill="none" stroke="currentColor" strokeWidth="3" />
                              <path d="M 85 35 L 110 20 L 110 80 L 85 65 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                              <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-24 h-32 border-2 border-dashed border-icrcs-navy/25 rounded-[50%]" />
                            </div>
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-xs font-medium text-green-700">Camera Active</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3 p-6">
                            <svg viewBox="0 0 120 100" className="w-16 h-auto text-gray-300">
                              <rect x="15" y="10" width="70" height="80" rx="12" fill="none" stroke="currentColor" strokeWidth="3" />
                              <path d="M 85 35 L 110 20 L 110 80 L 85 65 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                              <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
                            </svg>
                            <p className="text-sm text-gray-400 font-medium">Camera preview will appear here</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {!cameraStarted && !photoCaptured && (
                          <button onClick={handleStartCamera} className="px-4 py-2 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5" /> Start Camera
                          </button>
                        )}
                        {cameraStarted && !photoCaptured && (
                          <button onClick={handleCapturePhoto} className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5" /> Capture Photo
                          </button>
                        )}
                        {photoCaptured && (
                          <span className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Captured
                          </span>
                        )}
                        <span className="ml-auto text-sm text-gray-400">
                          {cameraStarted ? 'Status: Ready' : 'Status: Standby'}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Captured Photo Preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" strokeWidth={2.5} />
                        Captured Photo Preview
                      </h4>
                      <div className="flex-1 min-h-[160px] rounded-xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                        {photoCaptured ? (
                          photoPreview ? (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <img src={photoPreview} alt="Captured preview" className="max-h-[180px] w-auto object-contain rounded-lg" />
                              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                                <CheckCircle className="h-3 w-3 text-green-600" strokeWidth={2.5} />
                                <span className="text-xs font-medium text-green-700">Captured</span>
                              </div>
                              <div className="absolute top-3 right-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-lg">{photoTimestamp}</div>
                              {photoSaved && (
                                <div className="absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">Saved</div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-green-50/30 p-6">
                              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={2} />
                              </div>
                              <p className="text-xs font-medium text-gray-700">Photo captured</p>
                              {photoTimestamp && <p className="text-sm text-gray-400">{photoTimestamp}</p>}
                              {photoQuality.score > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getPhotoQualityLabel(photoQuality.score).badgeClass}`}>
                                  {getPhotoQualityLabel(photoQuality.score).label} ({photoQuality.score}%)
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-6">
                            <svg viewBox="0 0 120 140" className="w-16 h-auto text-gray-200">
                              <g fill="currentColor">
                                <ellipse cx="60" cy="35" rx="22" ry="26" />
                                <path d="M 20 130 C 20 90, 100 90, 100 130 L 100 140 L 20 140 Z" />
                              </g>
                            </svg>
                            <p className="text-sm text-gray-400 font-medium">No photograph captured.</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {photoCaptured && (
                          <>
                            {!showRetakeConfirm ? (
                              <button onClick={() => setShowRetakeConfirm(true)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                <RefreshCw className="h-3.5 w-3.5" /> Retake
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                                <span className="text-xs text-amber-700 font-medium">Retake?</span>
                                <button onClick={() => setShowRetakeConfirm(false)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                                <button onClick={handleRetake} className="text-xs px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Retake</button>
                              </div>
                            )}
                            {!photoSaved && (
                              <button onClick={handleSavePhoto} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" /> Save Photo
                              </button>
                            )}
                            {photoSaved && (
                              <span className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700 flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Photo Saved
                              </span>
                            )}
                          </>
                        )}
                        <button onClick={() => fileInputRef.current?.click()} className={`ml-auto px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5 ${!photoCaptured ? 'opacity-50' : ''}`}>
                          <Upload className="h-3.5 w-3.5" /> Upload from Disk
                        </button>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Applicant Information + Photo Quality Checklist */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Card 3: Applicant Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="h-4 w-4 text-icrcs-navy" />
                        Applicant Information
                      </h4>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div><span className="text-gray-400">Case No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.caseNo}</span></div>
                          <div><span className="text-gray-400">Application No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.appNo}</span></div>
                          <div><span className="text-gray-400">Full Name:</span> <span className="font-medium text-gray-800">{captureTarget.fullName}</span></div>
                          <div><span className="text-gray-400">Nationality:</span> <span className="font-medium text-gray-800">{captureTarget.nationality}</span></div>
                          <div><span className="text-gray-400">Gender:</span> <span className="font-medium text-gray-800">{captureTarget.details?.gender || '—'}</span></div>
                          <div><span className="text-gray-400">Passport No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.details?.passportNo || '—'}</span></div>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Enrollment Status:</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30">In Progress</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Photo Quality Checklist */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" strokeWidth={2.5} />
                        Photo Quality Checklist
                      </h4>
                      <div className="flex-1 space-y-0">
                        {[
                          { key: 'faceCentered', label: 'Face centered' },
                          { key: 'neutralExpression', label: 'Neutral expression' },
                          { key: 'eyesVisible', label: 'Eyes clearly visible' },
                          { key: 'goodLighting', label: 'Adequate lighting' },
                          { key: 'plainBackground', label: 'Plain background' },
                          { key: 'noObstruction', label: 'No obstructions' },
                          { key: 'noShadows', label: 'No excessive shadows' },
                        ].map((item) => {
                          const passed = photoQuality.checks[item.key];
                          return (
                            <div key={item.key} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                              <span className="text-sm text-gray-600">{item.label}</span>
                              {photoCaptured ? (
                                passed ? (
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                                    <span className="text-xs text-green-600 font-semibold">Pass</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="text-xs text-amber-600 font-semibold">Attention</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-gray-300">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {photoCaptured && photoQuality.score > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Photo Quality Score</p>
                            <p className="text-sm font-bold text-gray-800">{photoQuality.score}%</p>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getPhotoQualityLabel(photoQuality.score).badgeClass}`}>
                            {getPhotoQualityLabel(photoQuality.score).label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {photoSaved && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5} />
                      <span className="text-xs font-medium text-green-700">Photograph saved successfully. You may proceed to the next step.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Fingerprints */}
              {captureStep === 2 && (() => {
                const progress = getFpProgress();
                const selStatus = selectedFinger ? fingerprints[selectedFinger.hand][selectedFinger.name] : null;
                const allFingers = [
                  { hand: 'left', name: 'index', label: 'Left Index' },
                  { hand: 'left', name: 'middle', label: 'Left Middle' },
                  { hand: 'left', name: 'ring', label: 'Left Ring' },
                  { hand: 'left', name: 'pinky', label: 'Left Little' },
                  { hand: 'thumbs', name: 'left', label: 'Left Thumb' },
                  { hand: 'thumbs', name: 'right', label: 'Right Thumb' },
                  { hand: 'right', name: 'index', label: 'Right Index' },
                  { hand: 'right', name: 'middle', label: 'Right Middle' },
                  { hand: 'right', name: 'ring', label: 'Right Ring' },
                  { hand: 'right', name: 'pinky', label: 'Right Little' },
                ];
                const FingerPrintSVG = ({ color = '#0f2b5c', opacity = 0.4 }) => (
                  <svg viewBox="0 0 100 120" className="w-full h-full">
                    <g fill="none" stroke={color} strokeWidth="1.2" opacity={opacity}>
                      <ellipse cx="50" cy="55" rx="28" ry="32" />
                      <ellipse cx="50" cy="55" rx="22" ry="26" />
                      <ellipse cx="50" cy="55" rx="16" ry="20" />
                      <ellipse cx="50" cy="55" rx="10" ry="14" />
                      <ellipse cx="50" cy="55" rx="5" ry="7" />
                      <path d="M 50 23 Q 65 25 72 40" />
                      <path d="M 50 23 Q 35 25 28 40" />
                      <path d="M 76 48 Q 82 55 78 65" />
                      <path d="M 24 48 Q 18 55 22 65" />
                      <path d="M 50 87 Q 60 90 68 82" />
                      <path d="M 50 87 Q 40 90 32 82" />
                      <path d="M 72 72 Q 76 78 70 84" />
                      <path d="M 28 72 Q 24 78 30 84" />
                      <line x1="50" y1="23" x2="50" y2="30" />
                      <line x1="50" y1="80" x2="50" y2="87" />
                    </g>
                  </svg>
                );
                // Renders the actual black-and-white fingerprint image returned by
                // the scanner. Falls back to the ridge illustration only if the raw
                // image is missing (older capture / device without image payload).
                const FpImage = ({ hand, name, className = 'w-full h-full object-contain' }) => {
                  const raw = capturedArtifactsRef.current?.[hand]?.[name]?.rawImage;
                  if (!raw) return <FingerPrintSVG color="#10b981" opacity={0.5} />;
                  const src = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
                  return <img src={src} alt={getFingerLabel(hand, name)} className={className} />;
                };
                const GroupResultRow = ({ hand, name, label }) => {
                  const status = fingerprints[hand][name];
                  const quality = fpQuality[hand][name];
                  const qInfo = getQualityLabel(quality);
                  const comment = fpComments[hand][name];
                  return (
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${status === 'captured' ? 'text-green-600' : status === 'failed' ? 'text-red-500' : status === 'exception' ? 'text-amber-600' : 'text-gray-400'}`}>{label}</span>
                        {status === 'captured' && quality > 0 && (
                          <span className={`text-xs px-1 py-0.5 rounded-full border font-bold ${qInfo.badgeClass}`}>NFIQ {quality} {qInfo.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {status === 'pending' && <span className="text-sm text-gray-400">Pending</span>}
                        {status === 'capturing' && <Loader2 className="h-3 w-3 text-sky-500 animate-spin" />}
                        {status === 'captured' && <CheckCircle className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />}
                        {status === 'failed' && <X className="h-3.5 w-3.5 text-red-400" strokeWidth={2.5} />}
                        {status === 'exception' && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            {comment && <span className="text-xs text-amber-600 italic max-w-[100px] truncate" title={comment}>{comment}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };
                const PreviewBox = ({ title, groupKey, fingers }) => {
                  const statuses = fingers.map(f => fingerprints[f.hand][f.name]);
                  const allCaptured = statuses.every(s => s === 'captured');
                  const anyCapturing = statuses.some(s => s === 'capturing');
                  const anyPending = statuses.some(s => s === 'pending');
                  const anyFailed = statuses.some(s => s === 'failed');
                  const allException = statuses.every(s => s === 'exception');
                  let previewStatus = 'pending';
                  if (allCaptured) previewStatus = 'captured';
                  else if (anyCapturing) previewStatus = 'capturing';
                  else if (allException) previewStatus = 'exception';
                  else if (anyFailed) previewStatus = 'failed';
                  const canCapture = anyPending && !scanningFinger;
                  return (
                    <div className="flex flex-col items-center gap-1.5">
                      <button onClick={() => canCapture && captureGroup(groupKey)} disabled={!canCapture} className={`h-[140px] w-[140px] rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all ${previewStatus === 'captured' ? 'border-green-300 bg-green-50' : previewStatus === 'capturing' ? 'border-sky-400 bg-sky-50 animate-pulse' : previewStatus === 'failed' ? 'border-red-300 bg-red-50' : previewStatus === 'exception' ? 'border-amber-300 bg-amber-50' : canCapture ? 'border-gray-300 bg-gray-50 hover:border-icrcs-navy hover:bg-blue-50/30 cursor-pointer' : 'border-gray-200 bg-gray-50'} disabled:opacity-60 disabled:cursor-not-allowed`}>
                        {previewStatus === 'captured' && (
                          <div className={`w-full h-full p-1.5 grid gap-1 bg-white ${fingers.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                            {fingers.map(f => (
                              <div key={f.name} className="rounded overflow-hidden bg-white flex items-center justify-center">
                                <FpImage hand={f.hand} name={f.name} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        {previewStatus === 'pending' && (
                          <div className="flex flex-col items-center justify-center gap-1 p-2">
                            <Fingerprint className="h-12 w-12 text-gray-300" />
                            <span className="text-xs text-gray-400 font-medium">Click to Capture</span>
                          </div>
                        )}
                        {previewStatus === 'capturing' && (
                          <div className="flex flex-col items-center justify-center gap-1 p-2">
                            <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
                            <span className="text-xs text-sky-500 font-medium">Scanning...</span>
                          </div>
                        )}
                        {previewStatus === 'failed' && (
                          <div className="flex flex-col items-center justify-center gap-1 p-2">
                            <X className="h-10 w-10 text-red-400" strokeWidth={2.5} />
                            <span className="text-xs text-red-400 font-medium">Failed</span>
                          </div>
                        )}
                        {previewStatus === 'exception' && (
                          <div className="flex flex-col items-center justify-center gap-1 p-2">
                            <AlertTriangle className="h-10 w-10 text-amber-400" />
                            <span className="text-xs text-amber-500 font-medium">Exception</span>
                          </div>
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500">{title}</span>
                    </div>
                  );
                };
                const MiniFingerBox = ({ hand, name, label }) => {
                  const status = fingerprints[hand][name];
                  const isSelected = selectedFinger && selectedFinger.hand === hand && selectedFinger.name === name;
                  return (
                    <button onClick={() => setSelectedFinger({ hand, name })} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all h-[140px] w-[140px] ${isSelected ? 'ring-2 ring-icrcs-navy ring-offset-1 border-icrcs-navy' : status === 'captured' ? 'border-green-300' : status === 'capturing' ? 'border-sky-400' : status === 'failed' ? 'border-red-300' : status === 'exception' ? 'border-amber-300' : 'border-gray-200 hover:border-icrcs-navy/40'}`}>
                      <div className={`w-full flex-1 rounded-lg flex items-center justify-center ${status === 'captured' ? 'bg-green-50' : status === 'capturing' ? 'bg-sky-50' : status === 'failed' ? 'bg-red-50' : status === 'exception' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        {status === 'pending' && <Fingerprint className="h-8 w-8 text-gray-300" />}
                        {status === 'capturing' && <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />}
                        {status === 'captured' && <div className="w-full h-full p-1 bg-white rounded-lg overflow-hidden"><FpImage hand={hand} name={name} /></div>}
                        {status === 'failed' && <X className="h-8 w-8 text-red-400" strokeWidth={2.5} />}
                        {status === 'exception' && <AlertTriangle className="h-8 w-8 text-amber-400" />}
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap">{label}</span>
                    </button>
                  );
                };
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800">Fingerprint Enrollment</h4>
                      <span className="text-sm font-semibold text-icrcs-navy">{progress.completed} / {progress.total} Captured</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-800">Enrollment Progress</p>
                        <span className="text-sm font-medium text-icrcs-navy">{progress.pct}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-icrcs-navy rounded-full transition-all duration-500" style={{ width: `${progress.pct}%` }} />
                      </div>
                    </div>

                    {/* Missing Fingers Checkboxes */}
                    <div className="bg-gray-50/60 rounded-2xl border border-gray-200 p-4 space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Missing Fingers — Click to mark exception and add comment</p>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {allFingers.map(f => {
                          const isException = fingerprints[f.hand][f.name] === 'exception';
                          const isCaptured = fingerprints[f.hand][f.name] === 'captured';
                          return (
                            <button key={f.label} onClick={() => isException ? recaptureFinger(f.hand, f.name) : openCommentModal(f.hand, f.name)} disabled={isCaptured || scanningFinger} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isException ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                              <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${isException ? 'bg-amber-500 border-amber-500' : 'border-gray-300 bg-white'}`}>
                                {isException && <CheckCircle className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <span className="hidden sm:inline">{f.label}</span>
                              <span className="sm:hidden">{f.label.replace('Left ', 'L ').replace('Right ', 'R ')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Finger Banner */}
                    {selectedFinger && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-icrcs-navy/5 border border-icrcs-navy/10">
                        <span className="text-xs text-icrcs-navy font-semibold">Selected: {getFingerLabel(selectedFinger.hand, selectedFinger.name)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${selStatus === 'pending' ? 'bg-gray-50 text-gray-500 border-gray-200' : selStatus === 'capturing' ? 'bg-sky-50 text-sky-600 border-sky-200' : selStatus === 'captured' ? 'bg-green-50 text-green-700 border-green-200' : selStatus === 'failed' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {selStatus === 'pending' ? 'Awaiting Capture' : selStatus === 'capturing' ? 'Capturing...' : selStatus === 'captured' ? 'Captured' : selStatus === 'failed' ? 'Capture Failed' : 'Exception Recorded'}
                        </span>
                      </div>
                    )}

                    {/* Live Scanner Preview - mirrors RSWAS's own CanvasInfo feed over
                        the WebSocket opened in captureGroup/captureSingleFinger, so the
                        operator sees the finger on the glass instantly instead of a bare
                        spinner while the capture is in progress. */}
                    {scanningFinger && (
                      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-900 border border-gray-800">
                        <div className="flex items-center justify-between w-full max-w-sm">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live
                          </span>
                          <span className="text-xs font-medium text-gray-300">Scanning: {getScanningLabel()}</span>
                        </div>
                        <div className="w-full max-w-sm h-[220px] rounded-xl bg-black flex items-center justify-center overflow-hidden">
                          {livePreviewFrame ? (
                            <img
                              src={livePreviewFrame.startsWith('data:') ? livePreviewFrame : `data:image/png;base64,${livePreviewFrame}`}
                              alt="Live scanner preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-500">
                              <Fingerprint className="h-10 w-10 animate-pulse" />
                              <span className="text-xs font-medium">Place your hand on the scanner...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Row 1: Left Four Fingers */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Left Four Fingers</h5>
                      <div className="flex gap-3 sm:gap-4 items-start justify-center flex-wrap">
                        <PreviewBox title="Group" groupKey="left" fingers={[{ hand: 'left', name: 'index' }, { hand: 'left', name: 'middle' }, { hand: 'left', name: 'ring' }, { hand: 'left', name: 'pinky' }]} />
                        <MiniFingerBox hand="left" name="index" label="Left Index" />
                        <MiniFingerBox hand="left" name="middle" label="Left Middle" />
                        <MiniFingerBox hand="left" name="ring" label="Left Ring" />
                        <MiniFingerBox hand="left" name="pinky" label="Left Little" />
                      </div>
                    </div>

                    {/* Row 2: Two Thumbs */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Two Thumbs</h5>
                      <div className="flex gap-3 sm:gap-4 items-start justify-center flex-wrap">
                        <PreviewBox title="Thumbs" groupKey="thumbs" fingers={[{ hand: 'thumbs', name: 'left' }, { hand: 'thumbs', name: 'right' }]} />
                        <MiniFingerBox hand="thumbs" name="left" label="Left Thumb" />
                        <MiniFingerBox hand="thumbs" name="right" label="Right Thumb" />
                      </div>
                    </div>

                    {/* Row 3: Right Four Fingers */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Right Four Fingers</h5>
                      <div className="flex gap-3 sm:gap-4 items-start justify-center flex-wrap">
                        <PreviewBox title="Group" groupKey="right" fingers={[{ hand: 'right', name: 'index' }, { hand: 'right', name: 'middle' }, { hand: 'right', name: 'ring' }, { hand: 'right', name: 'pinky' }]} />
                        <MiniFingerBox hand="right" name="index" label="Right Index" />
                        <MiniFingerBox hand="right" name="middle" label="Right Middle" />
                        <MiniFingerBox hand="right" name="ring" label="Right Ring" />
                        <MiniFingerBox hand="right" name="pinky" label="Right Little" />
                      </div>
                    </div>

                    {/* Fingerprint Quality Summary */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">Fingerprint Quality Summary</p>
                        <span className="text-sm font-bold text-icrcs-navy">{progress.completed} / {progress.total} Captured</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                        {allFingers.map(f => (
                          <GroupResultRow key={f.label} hand={f.hand} name={f.name} label={f.label} />
                        ))}
                      </div>
                    </div>

                    {/* Capture Controls */}
                    <div className="bg-gray-50/60 rounded-2xl border border-gray-200 p-4 space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capture Controls</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={captureAllPending} disabled={scanningFinger} className="px-4 py-2 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">Start Capture</button>
                        {selectedFinger && selStatus === 'pending' && (
                          <button onClick={() => captureSingleFinger(selectedFinger.hand, selectedFinger.name)} disabled={scanningFinger} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Capture Selected</button>
                        )}
                        {selectedFinger && selStatus === 'failed' && (
                          <button onClick={() => captureSingleFinger(selectedFinger.hand, selectedFinger.name)} disabled={scanningFinger} className="px-4 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><RefreshCw className="h-3 w-3" /> Retry</button>
                        )}
                        {selectedFinger && (selStatus === 'captured' || selStatus === 'exception') && (
                          <button onClick={() => recaptureFinger(selectedFinger.hand, selectedFinger.name)} disabled={scanningFinger} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Recapture</button>
                        )}
                        {selectedFinger && selStatus !== 'exception' && (
                          <button onClick={() => openCommentModal(selectedFinger.hand, selectedFinger.name)} disabled={scanningFinger} className="px-4 py-2 rounded-xl border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><AlertTriangle className="h-3 w-3" /> Mark Exception</button>
                        )}
                        <button onClick={() => { setFingerprints({ left: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' }, right: { index: 'pending', middle: 'pending', ring: 'pending', pinky: 'pending' }, thumbs: { left: 'pending', right: 'pending' } }); setFpQuality({ left: { index: 0, middle: 0, ring: 0, pinky: 0 }, right: { index: 0, middle: 0, ring: 0, pinky: 0 }, thumbs: { left: 0, right: 0 } }); setFpComments({ left: { index: '', middle: '', ring: '', pinky: '' }, right: { index: '', middle: '', ring: '', pinky: '' }, thumbs: { left: '', right: '' } }); capturedArtifactsRef.current = { left: {}, right: {}, thumbs: {} }; setSelectedFinger(null); }} disabled={scanningFinger} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Recapture All</button>
                      </div>
                      {/* Per-group recapture — resets only the chosen placement, keeping other captured groups intact */}
                      {(['left', 'thumbs', 'right']).some(g => GROUP_FINGERS[g].some(f => fingerprints[f.hand][f.name] !== 'pending')) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs font-medium text-gray-400">Recapture group:</span>
                          {(['left', 'thumbs', 'right']).map(g => {
                            const hasCaptured = GROUP_FINGERS[g].some(f => fingerprints[f.hand][f.name] !== 'pending');
                            return (
                              <button key={g} onClick={() => recaptureGroup(g)} disabled={scanningFinger || !hasCaptured} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                                <RefreshCw className="h-3 w-3" /> {GROUP_LABELS[g]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {canProceedFromStep2() && (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5} />
                        <span className="text-xs font-medium text-green-700">Fingerprint enrollment completed successfully. You may proceed to the next step.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Step 3: Signature */}
              {captureStep === 3 && (
                <div className="space-y-5 max-w-5xl mx-auto">
                  {/* Row 1: Signature Capture Area + Signature Preview */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Card 1: Signature Capture Area */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Pen className="h-4 w-4 text-icrcs-navy" />
                        Signature Capture
                      </h4>
                      <div className="flex-1 min-h-[220px] rounded-xl border-2 border-gray-100 bg-gray-50 overflow-hidden relative">
                        <canvas
                          ref={sigCanvasRef}
                          width={600}
                          height={220}
                          className="w-full h-full cursor-crosshair touch-none"
                          onMouseDown={handleStartDrawing}
                          onMouseMove={handleDraw}
                          onMouseUp={handleEndDrawing}
                          onMouseLeave={handleEndDrawing}
                          onTouchStart={handleStartDrawing}
                          onTouchMove={handleDraw}
                          onTouchEnd={handleEndDrawing}
                        />
                        {sigStrokes.length === 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <Pen className="h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400 font-medium">Draw Signature Here</p>
                            <p className="text-xs text-gray-300 mt-1">Mouse, touch, or stylus</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {!showClearConfirm ? (
                          <button onClick={() => setShowClearConfirm(true)} disabled={sigStrokes.length === 0} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" /> Clear
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-xs text-amber-700 font-medium">Clear signature?</span>
                            <button onClick={() => setShowClearConfirm(false)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                            <button onClick={handleClearSignature} className="text-xs px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Clear</button>
                          </div>
                        )}
                        <button onClick={handleUndoStroke} disabled={sigStrokes.length === 0} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5" /> Undo
                        </button>
                        {!signatureCaptured && (
                          <button onClick={handleSaveSignature} disabled={sigStrokes.length === 0} className="px-4 py-2 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" /> Save Signature
                          </button>
                        )}
                        {signatureCaptured && (
                          <span className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Saved
                          </span>
                        )}
                        <button onClick={() => sigFileInputRef.current?.click()} className="ml-auto px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5" /> Upload
                        </button>
                        <input type="file" accept="image/png,image/jpeg,image/jpg" ref={sigFileInputRef} onChange={handleSigUpload} className="hidden" />
                      </div>
                    </div>

                    {/* Card 2: Signature Preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-green-500" />
                        Signature Preview
                      </h4>
                      <div className="flex-1 min-h-[220px] rounded-xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                        {signatureCaptured && signaturePreview ? (
                          <div className="w-full h-full relative">
                            <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain bg-white" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                              <CheckCircle className="h-3 w-3 text-green-600" strokeWidth={2.5} />
                              <span className="text-xs font-medium text-green-700">Saved</span>
                            </div>
                            <div className="absolute top-3 right-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-lg">{signatureTimestamp}</div>
                            {signatureMethod && (
                              <div className="absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full bg-icrcs-navy/10 text-icrcs-navy font-semibold border border-icrcs-navy/20">{signatureMethod}</div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-6">
                            <Pen className="h-10 w-10 text-gray-200" />
                            <p className="text-sm text-gray-400 font-medium">No signature available.</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {signatureCaptured ? `Saved: ${signatureTimestamp}` : 'Status: Pending capture'}
                        </span>
                        <span className="text-sm text-gray-400">
                          {signatureMethod ? `Method: ${signatureMethod}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Applicant Information + Signature Requirements */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Card 3: Applicant Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="h-4 w-4 text-icrcs-navy" />
                        Applicant Information
                      </h4>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div><span className="text-gray-400">Case No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.caseNo}</span></div>
                          <div><span className="text-gray-400">Application No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.appNo}</span></div>
                          <div><span className="text-gray-400">Full Name:</span> <span className="font-medium text-gray-800">{captureTarget.fullName}</span></div>
                          <div><span className="text-gray-400">Nationality:</span> <span className="font-medium text-gray-800">{captureTarget.nationality}</span></div>
                          <div><span className="text-gray-400">Passport No.:</span> <span className="font-mono font-medium text-gray-800">{captureTarget.details?.passportNo || '—'}</span></div>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Enrollment Status:</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30">Signature Enrollment</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Signature Requirements */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full">
                      <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-icrcs-navy" />
                        Signature Requirements
                      </h4>
                      <div className="flex-1 space-y-0">
                        {[
                          { key: 'visible', label: 'Signature clearly visible' },
                          { key: 'complete', label: 'Entire signature captured' },
                          { key: 'noCropping', label: 'No cropping' },
                          { key: 'goodContrast', label: 'Good contrast' },
                          { key: 'noExcessMarks', label: 'No excessive marks' },
                          { key: 'confirmed', label: 'Applicant confirmed signature' },
                        ].map((item) => {
                          const passed = signatureQuality.checks[item.key];
                          return (
                            <div key={item.key} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                              <span className="text-sm text-gray-600">{item.label}</span>
                              {signatureCaptured ? (
                                passed ? (
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                                    <span className="text-xs text-green-600 font-semibold">Pass</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="text-xs text-amber-600 font-semibold">Attention</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-gray-300">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {signatureCaptured && signatureQuality.score > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Signature Quality Score</p>
                            <p className="text-sm font-bold text-gray-800">{signatureQuality.score}%</p>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSignatureQualityLabel(signatureQuality.score).badgeClass}`}>
                            {getSignatureQualityLabel(signatureQuality.score).label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {signatureCaptured && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5} />
                      <span className="text-xs font-medium text-green-700">Signature saved successfully. You may complete the enrollment.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Comment Modal for Missing Fingers */}
              {commentModal.open && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 sm:p-6 w-full max-w-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Mark Finger Exception</h4>
                    </div>
                    <p className="text-xs text-gray-500">Record why <span className="font-semibold text-icrcs-navy">{commentModal.label}</span> cannot be captured.</p>
                    <textarea
                      value={commentModal.comment}
                      onChange={(e) => setCommentModal(m => ({ ...m, comment: e.target.value }))}
                      placeholder="e.g., missing finger, injury, bandaged..."
                      className="w-full min-h-[80px] p-3 rounded-xl border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setCommentModal({ open: false, hand: '', name: '', label: '', comment: '' })} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                      <button onClick={saveCommentAndMarkException} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm">Save Exception</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {waveMsg.text && (
              <div className={`mx-5 mb-0 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${waveMsg.type==='success'?'bg-green-50 text-green-700 border border-green-200':waveMsg.type==='error'?'bg-red-50 text-red-700 border border-red-200':'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {waveMsg.type==='success'?<CheckCircle className="h-4 w-4 shrink-0"/>:<AlertTriangle className="h-4 w-4 shrink-0"/>}{waveMsg.text}
              </div>
            )}
            <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 gap-3">
              <div>
                {captureStep > 1 && (
                  <button onClick={() => setCaptureStep(captureStep - 1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors">Previous</button>
                )}
                {captureStep === 1 && (
                  <button onClick={closeCapture} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!captureTarget) return;
                    setWaveMsg({ text: 'Processing...', type: 'info' });
                    try {
                      await enrollCase(captureTarget.caseNo);
                      setQueue(prev => prev.filter(q => q.caseNo !== captureTarget.caseNo));
                      setWaveMsg({ text: 'Enrolled successfully!', type: 'success' });
                      setTimeout(() => { setWaveMsg({ text: '', type: '' }); closeCapture(); }, 1500);
                    } catch (e) {
                      setWaveMsg({ text: e.message || 'Enrollment failed.', type: 'error' });
                      setTimeout(() => setWaveMsg({ text: '', type: '' }), 4000);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" /> Wave Biometrics
                </button>
                {captureStep < 3 && (
                  <button
                    onClick={() => setCaptureStep(captureStep + 1)}
                    className="px-5 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm"
                  >Next</button>
                )}
                {captureStep === 3 && (
                  <button
                    onClick={completeEnrollment}
                    className="px-5 py-2.5 rounded-xl bg-icrcs-gold text-white text-sm font-semibold hover:bg-yellow-500 transition-colors shadow-sm"
                  >Complete Enrollment</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
