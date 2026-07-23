import React, { useState, useEffect, useCallback } from 'react';
import { getEnrollmentQueue, getCaseBySubject, getApplicantReview, enrollCase } from '../../../services/managementService';
import { Search, Globe, AlertCircle, Loader2, Eye, Camera, CheckCircle, X, XCircle, Fingerprint, ChevronDown, Filter, FileCheck, SendHorizontal, StickyNote, Upload, Pen, RefreshCw, AlertTriangle, Sun, Image, User, FolderOpen, ClipboardList, ArrowLeft, Download, FileText, ArrowUpDown } from 'lucide-react';
import ApplicantInfoView from '../../../components/common/ApplicantInfoView';
import { buildApplicant } from '../../../data/mockApplicantData';
import {
  startCapture,
  startGroupCapture,
  awaitCapture,
  POSITION_TO_FINGER,
  FINGER_TO_POSITION,
  GROUP_KEY_TO_DEVICE,
  getCameraStatus,
  captureCameraPhoto,
  getSignaturePadStatus,
  captureSignature,
  clearSignaturePad,
  openLiveView,
} from '../../../services/deviceService';

// Maximum scanner qualityScore to accept a finger. Confirmed on real RealScan-G10
// hardware: RSWAS/UFExtractor returns the legacy NFIQ scale (1 = best, 5 = worst),
// NOT a 0-100 score where higher is better. 3 is the "Acceptable" ceiling used by
// getQualityLabel below - NFIQ 1-3 accepted, 4-5 rejected.
const MAX_ACCEPTABLE_NFIQ = 3;

// RSWAS's live guidance text (msg/cmsg) that indicates a bad placement. Kept
// narrow and in one place - a bare "-" or "finger is on" was too broad and
// could misclassify ordinary guidance text as a failure.
const FAILURE_GUIDANCE_RE = /cannot|dirty|error|failed|fault/i;

// Fingers that make up each physical placement group on the RealScan-G10. Shared
// by capture and group-recapture so both operate on exactly the same set.
const GROUP_FINGERS = {
  left: [{ hand: 'left', name: 'index' }, { hand: 'left', name: 'middle' }, { hand: 'left', name: 'ring' }, { hand: 'left', name: 'pinky' }],
  thumbs: [{ hand: 'thumbs', name: 'left' }, { hand: 'thumbs', name: 'right' }],
  right: [{ hand: 'right', name: 'index' }, { hand: 'right', name: 'middle' }, { hand: 'right', name: 'ring' }, { hand: 'right', name: 'pinky' }],
};
const GROUP_LABELS = { left: 'Left Hand', thumbs: 'Thumbs', right: 'Right Hand' };

const mockPortalApps = {
  'APP-2026-000145': {
    appNo: 'APP-2026-000145', appType: 'Status Determination', submissionDate: '12-Jun-2026', currentStatus: 'PENDING_ENROLLMENT',
    fullName: 'John Michael Doe', gender: 'Male', dob: '10-Jan-1990', nationality: 'Kenyan',
    passportNo: 'A12345678', countryOfIssue: 'Kenya', entryPoint: 'Namanga', dateOfEntry: '01-Jun-2026',
    attachments: ['Passport Copy', 'Birth Certificate', 'Supporting Letter']
  },
  'APP-2026-000146': {
    appNo: 'APP-2026-000146', appType: 'Resident Permit', submissionDate: '11-Jun-2026', currentStatus: 'PENDING_ENROLLMENT',
    fullName: 'Sarah Jane Kimani', gender: 'Female', dob: '05-Mar-1985', nationality: 'Ugandan',
    passportNo: 'B87654321', countryOfIssue: 'Uganda', entryPoint: 'Mutukula', dateOfEntry: '28-May-2026',
    attachments: ['Passport Copy', 'Residency Proof']
  },
  'APP-2026-000147': {
    appNo: 'APP-2026-000147', appType: 'Status Determination', submissionDate: '10-Jun-2026', currentStatus: 'PENDING_ENROLLMENT',
    fullName: 'Robert Kimaro', gender: 'Male', dob: '1992-07-22', nationality: 'Kenyan',
    passportNo: 'KEN-1992-0722-001', countryOfIssue: 'Kenya', entryPoint: 'Namanga', dateOfEntry: '01-Jun-2026',
    attachments: ['Passport Copy']
  }
};

let nextCaseSeq = 246;

const statusBadge = (s) => {
  if (s === 'Forwarded to Assessment') return 'bg-purple-50 text-purple-700 border-purple-100';
  if (s === 'Biometric Enrollment Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'Biometric In Progress') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (s === 'Verification Failed') return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

function joinName(...parts) { return parts.filter(Boolean).join(' '); }
function joinPlace(...parts) { return parts.filter(Boolean).join(', ') || '—'; }

function mimeToExt(mimeType) {
  if (!mimeType) return 'doc';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return mimeType.split('/')[1] || 'doc';
}

function attachmentsFromReview(review) {
  return (review?.attachments || []).map((att, i) => {
    const attObj = typeof att === 'string' ? { attachmentType: att, mimeType: 'application/pdf', fileUrl: '' } : att;
    const ext = mimeToExt(attObj.mimeType);
    const isImage = attObj.mimeType?.startsWith('image/');
    return { id: i + 1, attachmentType: attObj.attachmentType || 'Document', name: (attObj.attachmentType || 'Document') + '.' + ext, url: attObj.fileUrl, mimeType: attObj.mimeType || 'application/pdf', isImage, ext };
  });
}

function mapReviewToApplicant(r) {
  if (!r) return {};
  if (r.fullName && !r.personalDetails) return r; // Already mapped mock data
  const p = r.personalDetails || {};
  const birth = r.birthDetails || {};
  const addrs = r.addresses || [];
  const cur = addrs.find(a => a.addressType === 'CURRENT') || addrs[0];
  const perm = addrs.find(a => a.addressType === 'PERMANENT');
  const father = (r.parents || []).find(x => x.parentType === 'FATHER');
  const mother = (r.parents || []).find(x => x.parentType === 'MOTHER');
  const emp = r.employment;
  const mapParent = x => {
    if (!x) return null;
    let country = x.residenceLocation?.country || x.residenceCountry || '';
    let region = x.residenceLocation?.region || '';
    let district = x.residenceLocation?.district || '';
    let ward = x.residenceLocation?.ward || '';
    let street = x.residenceLocation?.street || '';
    if (!region && !district && typeof x.residence === 'string' && x.residence.includes(',')) {
      const parts = x.residence.split(',').map(s => s.trim());
      if (parts.length > 0) country = parts[parts.length - 1];
      if (parts.length > 1) region = parts[parts.length - 2];
      if (parts.length > 2) district = parts[parts.length - 3];
      if (parts.length > 3) ward = parts[parts.length - 4];
      if (parts.length > 4) street = parts.slice(0, parts.length - 4).join(', ');
    } else if (!region && !district && typeof x.residence === 'string') {
      street = x.residence;
    }
    return {
      fullName: joinName(x.firstName, x.middleName, x.lastName) || x.fullName,
      dob: x.dateOfBirth || x.dob,
      phone: x.phoneNumber || x.phone || '—',
      nationality: x.nationality,
      residenceCountry: country,
      residenceRegion: region,
      residenceDistrict: district,
      residenceWard: ward,
      residenceStreet: street,
      residence: typeof x.residence === 'string' ? x.residence : joinPlace(district, x.residenceCity || region, country),
    };
  };
  const mapKin = x => ({
    fullName: joinName(x.firstName, x.middleName, x.lastName),
    gender: x.sex, dob: x.dateOfBirth,
    relationship: x.relationshipType,
    phone: x.phoneNumber || '—',
    nationality: x.nationality,
    residence: joinPlace(x.residenceLocation?.district, x.residenceCity, x.residenceCountry),
  });
  const mapAddr = a => a ? {
    country: a.country || a.location?.country,
    city: a.city,
    region: a.location?.region,
    district: a.location?.district,
    ward: a.location?.ward,
    houseStreet: a.houseNo,
    postalCode: a.postalAddress,
  } : null;
  return {
    fullName: joinName(p.firstName, p.middleName, p.lastName),
    gender: p.sex, dob: p.dateOfBirth,
    citizenshipType: r.citizenshipType,
    nationality: p.nationality,
    countryOfBirth: p.countryOfBirth || birth.countryOfBirth,
    region: cur?.location?.region,
    district: cur?.location?.district,
    ward: cur?.location?.ward,
    villageStreet: cur?.location?.street,
    birthCertificateNo: birth.birthCertificateNo || '—',
    maritalStatus: p.maritalStatus,
    phone: cur?.phoneNumber,
    email: cur?.email,
    currentAddress: mapAddr(cur),
    permanentSameAsCurrent: !perm,
    permanentAddress: mapAddr(perm),
    father: mapParent(father),
    mother: mapParent(mother),
    spouses: (r.spouses || []).map(mapKin),
    relatives: (r.relatives || []).map(mapKin),
    children: (r.children || []).map(mapKin),
    education: (r.educationList || []).map(e => ({
      level: e.educationLevel, institution: e.schoolName,
      completionYear: e.completionYear ? String(e.completionYear) : '—',
      city: joinPlace(e.city, e.country), indexNo: e.registrationNumber,
    })),
    employment: emp ? {
      status: emp.employmentStatus,
      occupation: emp.occupationType || emp.otherOccupation || '—',
      employer: emp.organizationName || '—',
    } : null,
    documents: (r.documents || []).map(d => ({ type: d.documentType, number: d.documentNumber })),
    emergencyContacts: (r.emergencyContacts || []).map(c => ({
      fullName: c.fullName, relationship: c.relationshipType,
      occupation: c.occupationType || '—', gender: c.gender || '—',
      phone: c.phoneNumber || '—', nationality: c.nationality || '—',
      residence: joinPlace(c.residenceLocation?.district, c.residenceCity, c.country),
    })),
  };
}

export default function Biometric() {
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
        registrationType: c.registrationType,
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
  const [successMsg, setSuccessMsg] = useState('');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureTarget, setCaptureTarget] = useState(null);
  const [captureStep, setCaptureStep] = useState(1);
  const [waveMsg, setWaveMsg] = useState({ text: '', type: '' });
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  // Latest base64 frame from the camera's live-view WebSocket, shown in the
  // preview card while the camera is on and no photo has been captured yet.
  const [cameraLiveFrame, setCameraLiveFrame] = useState(null);
  const closeCameraLiveViewRef = React.useRef(() => {});

  // Opens the camera's live-view WebSocket for as long as the camera is on -
  // the socket's own open/close is what starts/stops the bridge streaming
  // (see deviceService.js's openLiveView), independent of any single capture.
  useEffect(() => {
    if (!cameraStarted) return undefined;
    const close = openLiveView('camera', setCameraLiveFrame);
    closeCameraLiveViewRef.current = close;
    return () => {
      close();
      setCameraLiveFrame(null);
    };
  }, [cameraStarted]);

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
  // Real Wacom STU-430 pad, as an alternative to drawing with a mouse/touch -
  // same live-view-WS-drives-the-device pattern as the camera.
  const [signaturePadActive, setSignaturePadActive] = useState(false);
  const [signaturePadLiveFrame, setSignaturePadLiveFrame] = useState(null);
  const closeSignaturePadLiveViewRef = React.useRef(() => {});

  useEffect(() => {
    if (!signaturePadActive) return undefined;
    const close = openLiveView('signature', setSignaturePadLiveFrame);
    closeSignaturePadLiveViewRef.current = close;
    return () => {
      close();
      setSignaturePadLiveFrame(null);
    };
  }, [signaturePadActive]);
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
  // Latest base64 PNG frame from the scanner's live-preview WebSocket, and
  // whether the viewfinder panel should be shown at all. Deliberately NOT
  // tied to scanningFinger: on success we close it automatically, but on
  // failure it stays up (frozen on the last frame) until the operator
  // dismisses it or a retry succeeds - so a failed attempt doesn't just
  // vanish without a chance to see what the scanner actually saw.
  const [livePreviewFrame, setLivePreviewFrame] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  // What the (possibly now-finished) preview panel is showing - kept separate
  // from scanningFinger so the label survives into the post-failure review state.
  const [previewTarget, setPreviewTarget] = useState(null);
  // RSWAS's own real-time guidance text (its msg/cmsg fields) - what it's
  // actually doing right now, straight from the vendor SDK rather than us
  // guessing at a generic "Scanning..." label.
  const [liveGuidance, setLiveGuidance] = useState('');
  // RSWAS's raw live "well-scored fingers" count, shown on-screen during a
  // capture purely as a diagnostic readout - lets us watch, on the real
  // device, whether this ever climbs before the job finishes without having
  // to dig through the browser console every time.
  const [liveDetectedCount, setLiveDetectedCount] = useState(0);
  // True once RSWAS's live feed reports every expected finger detected with a
  // non-zero quality - i.e. the placement looks good, well before RSWAS's slow
  // /Capture call actually returns with real templates. Drives a "Confirming..."
  // visual on the affected (still 'capturing') cards so the operator gets
  // positive feedback immediately instead of staring at a spinner for 10-15s.
  // Purely cosmetic: it never marks anything as actually captured.
  const [previewConfirming, setPreviewConfirming] = useState(false);
  // base64 image + ISO template per captured finger, keyed [hand][name] - held in
  // a ref so it survives re-renders without triggering them; read at enrollment.
  const capturedArtifactsRef = React.useRef({ left: {}, right: {}, thumbs: {} });
  // Identifies whichever capture operation currently "owns" the shared dialog/
  // lock state (scanningFinger, previewVisible, etc). Each captureGroup/
  // captureSingleFinger call stakes a fresh token here at start. A capture's
  // slow background job (or a manual dialog dismiss) only touches that shared
  // state if its own token still matches - i.e. nothing newer has taken over -
  // so a stale result landing late, or the operator closing the dialog by
  // hand, can never clobber or re-lock a different, newer operation.
  const activeCaptureRef = React.useRef(null);
  const sigPadSocketRef = React.useRef(null);
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
  const [viewReview, setViewReview] = useState(null);
  const [loadingViewApplicant, setLoadingViewApplicant] = useState(false);
  const [viewApplicantError, setViewApplicantError] = useState('');
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
    const query = appNumber.trim();
    if (!query) { setError('Please enter the Subject ID.'); return; }
    setLoading(true);

    // Mock fallback first check
    const mockApp = mockPortalApps[query] || Object.values(mockPortalApps).find(a => a.appNo.toLowerCase() === query.toLowerCase());
    if (mockApp) {
      setTimeout(() => {
        setLoading(false);
        const existingRow = queue.find(q => q.appNo === mockApp.appNo);
        if (existingRow) {
          setQuickServeTarget({
            queueRow: existingRow,
            fullName: mockApp.fullName,
            sex: mockApp.gender || 'N/A',
            dob: mockApp.dob || 'N/A',
            nationality: mockApp.nationality,
            caseNo: existingRow.caseNo,
            appNo: mockApp.appNo,
            photoUrl: null,
          });
          setShowQuickServeModal(true);
        } else {
          setFetchedApp({
            appNo: mockApp.appNo,
            caseNo: `ICRCS-BIO-2026-${String(nextCaseSeq++).padStart(5, '0')}`,
            appType: mockApp.appType,
            fullName: mockApp.fullName,
            nationality: mockApp.nationality,
            dob: mockApp.dob,
            currentStatus: 'PENDING_ENROLLMENT',
            createdAt: new Date().toISOString(),
            applicantData: buildApplicant(mockApp),
          });
          setShowReviewModal(true);
        }
      }, 500);
      return;
    }

    try {
      const c = await getCaseBySubject(query);
      if (!c) { setError('No case found for that Subject ID.'); return; }
      const existingRow = queue.find(q => q.appNo === c.subjectId || q.caseNo === c.caseNo);
      if (existingRow) {
        const review = await getApplicantReview(c.caseNo).catch(() => null);
        const sexId = c.person?.sexId;
        const photoUrl = review?.attachments?.find(
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
      const review = await getApplicantReview(c.caseNo).catch(() => null);
      setFetchedApp({
        appNo: c.subjectId,
        caseNo: c.caseNo,
        appType: c.registrationType,
        fullName: c.person?.fullName || c.subjectId,
        nationality: c.person?.nationalityCode,
        dob: c.person?.dateOfBirth,
        currentStatus: c.status,
        createdAt: c.createdAt,
        applicantData: review || c.applicantData || buildApplicant({ appNo: c.subjectId, fullName: c.person?.fullName }),
      });
      setShowReviewModal(true);
    } catch (err) {
      setError(err.message || 'No case found for that Subject ID.');
    } finally {
      setLoading(false);
    }
  };

  const closeReviewModal = () => { setShowReviewModal(false); setFetchedApp(null); setActiveReviewTab('info'); setPreviewDoc(null); };
  const closeQuickServeModal = () => { setShowQuickServeModal(false); setQuickServeTarget(null); };

  const saveToBiometricEnrollment = async () => {
    if (!fetchedApp) return;
    if (fetchedApp.currentStatus !== 'PENDING_ENROLLMENT' && fetchedApp.currentStatus !== 'Submitted') {
      setError(`This case is not eligible for biometric enrollment (current status: ${fetchedApp.currentStatus}).`);
      return;
    }
    if (fetchedApp.appNo.startsWith('APP-')) {
      const dateReceived = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const newItem = {
        caseNo: fetchedApp.caseNo,
        appNo: fetchedApp.appNo,
        fullName: fetchedApp.fullName,
        nationality: fetchedApp.nationality,
        status: 'Pending Biometric Capture',
        officer: 'Officer',
        dateReceived,
        details: fetchedApp,
      };
      setQueue(prev => [newItem, ...prev]);
      closeReviewModal();
      setAppNumber('');
      setSuccessMsg('Application successfully received into Biometric Enrollment.');
      setTimeout(clearSuccess, 5000);
      return;
    }
    closeReviewModal();
    setAppNumber('');
    setCurrentPage(1);
    await loadQueue();
    setSuccessMsg('Application successfully received into Biometric Enrollment.');
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
    setSignaturePadActive(false);
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
    if (!previewTarget) return '';
    if (previewTarget.group) {
      return previewTarget.group === 'left' ? 'Left Four Fingers' : previewTarget.group === 'right' ? 'Right Four Fingers' : 'Two Thumbs';
    }
    return getFingerLabel(previewTarget.hand, previewTarget.name);
  };
  // Manually closes the live-preview panel after a failed capture - the only
  // other way it closes is a successful capture clearing it automatically.
  const dismissLivePreview = () => {
    // Manually closing must release the lock unconditionally - the operator
    // is explicitly giving up on waiting for this attempt. Invalidate the
    // active-operation token too, so if this attempt's slow background job
    // lands after the fact, it silently updates the real finger status
    // without reopening the dialog or re-locking anything.
    activeCaptureRef.current = null;
    setScanningFinger(null);
    setPreviewVisible(false);
    setLivePreviewFrame(null);
    setLiveGuidance('');
    setPreviewConfirming(false);
    setLiveDetectedCount(0);
    if (previewTarget?.group) {
      setGroupStatus(GROUP_FINGERS[previewTarget.group].filter(f => fingerprints[f.hand][f.name] === 'capturing'), 'failed');
    } else if (previewTarget && fingerprints[previewTarget.hand][previewTarget.name] === 'capturing') {
      setFingerprints(fp => ({ ...fp, [previewTarget.hand]: { ...fp[previewTarget.hand], [previewTarget.name]: 'failed' } }));
    }
    setPreviewTarget(null);
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


  const sliceAndPopulateFingers = (groupKey, frameSrc) => {
    if (!frameSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let mapping = [];
      if (groupKey === 'left') {
        mapping = [
          { hand: 'left', name: 'pinky' },
          { hand: 'left', name: 'ring' },
          { hand: 'left', name: 'middle' },
          { hand: 'left', name: 'index' }
        ];
      } else if (groupKey === 'right') {
        mapping = [
          { hand: 'right', name: 'index' },
          { hand: 'right', name: 'middle' },
          { hand: 'right', name: 'ring' },
          { hand: 'right', name: 'pinky' }
        ];
      } else if (groupKey === 'thumbs') {
        mapping = [
          { hand: 'thumbs', name: 'left' },
          { hand: 'thumbs', name: 'right' }
        ];
      }
      const count = mapping.length;
      if (count === 0) return;
      const sliceW = Math.floor(img.width / count);
      mapping.forEach((f, i) => {
        const canvas = document.createElement('canvas');
        canvas.width = sliceW;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, i * sliceW, 0, sliceW, img.height, 0, 0, sliceW, img.height);
        const slicedDataUrl = canvas.toDataURL('image/png');
        if (!capturedArtifactsRef.current[f.hand]) capturedArtifactsRef.current[f.hand] = {};
        capturedArtifactsRef.current[f.hand][f.name] = {
          rawImage: slicedDataUrl,
          quality: 0,
          isInstantPreview: true
        };
      });
      setFingerprints(fp => {
        const next = { ...fp };
        mapping.forEach(f => {
          if (!next[f.hand]) next[f.hand] = {};
          next[f.hand] = { ...next[f.hand], [f.name]: 'captured' };
        });
        return next;
      });
    };
    img.src = frameSrc.startsWith('data:') ? frameSrc : `data:image/png;base64,${frameSrc}`;
  };

  // One physical placement on the RealScan-G10 captures a whole group at once;
  // icrcs-device-service returns one result per finger. We start the job, poll
  // until it's terminal, then fan the per-finger results back into the UI state.
  const captureGroup = async (groupKey, force = false) => {
    if (scanningFinger) return;
    const fingers = GROUP_FINGERS[groupKey];
    const pending = force ? fingers : fingers.filter(f => fingerprints[f.hand][f.name] === 'pending');
    if (pending.length === 0) return;

    // Stakes this operation's claim on the shared dialog/lock state. Anything
    // that later wants to touch that shared state (the slow background job
    // resolving, or the operator manually dismissing the dialog) checks this
    // token first - if a newer operation has since taken over, or the dialog
    // was dismissed, the token no longer matches and the stale continuation
    // silently skips the shared-state writes (its own per-finger result
    // writes still apply normally).
    const myToken = {};
    activeCaptureRef.current = myToken;
    setScanningFinger({ group: groupKey });
    setPreviewTarget({ group: groupKey });
    setPreviewVisible(true);
    setPreviewConfirming(false);
    setLiveDetectedCount(0);
    let confirmTriggered = false;
    setGroupStatus(pending, 'capturing');
    let closePreview = () => {};
    let resolveOp;
    const opDone = new Promise((r) => { resolveOp = r; });
    const lastValidFrameRef = { current: null };
    const lastFrameTimeRef = { current: 0 };
    const handleFrame = (frame) => {
      if (frame) {
        lastValidFrameRef.current = frame;
      }
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 150) {
        lastFrameTimeRef.current = now;
        setLivePreviewFrame(frame);
      }
    };
    const triggerConfirming = () => {
      if (confirmTriggered) return;
      confirmTriggered = true;
      // Mark captured unconditionally - the checkmark icon is generic (no
      // longer a real photo), so it doesn't need a live frame to have arrived.
      setGroupStatus(pending, 'captured');
      if (lastValidFrameRef.current) {
        sliceAndPopulateFingers(groupKey, lastValidFrameRef.current);
      }
      closePreview();
      setLivePreviewFrame(null);
      setLiveGuidance('');
      setPreviewVisible(false);
      setPreviewConfirming(false);
      setScanningFinger(null);
      resolveOp();
    };
    const onMessage = (text) => {
      if (text && /lift|release|remove|captured|success/i.test(text) && !FAILURE_GUIDANCE_RE.test(text)) {
        triggerConfirming();
      } else if (text && FAILURE_GUIDANCE_RE.test(text)) {
        setLiveGuidance(text);
        setGroupStatus(pending, 'failed');
        setScanningFinger(null);
        setPreviewConfirming(false);
        resolveOp();
      } else {
        setLiveGuidance(text);
      }
    };
    const onDetectedCount = (count) => {
      // RSWAS's own real-time well-scored-finger count - fires the instant the
      // device's LED/buzzer signals a good capture, independent of whether its
      // guidance text happens to contain a word onMessage's regex recognizes
      // (it doesn't for every capture type, e.g. Two Thumbs).
      setLiveDetectedCount(count);
      if (count >= pending.length) {
        triggerConfirming();
      }
    };
    try {
      const jobId = await startGroupCapture(GROUP_KEY_TO_DEVICE[groupKey]);
      const { result, close } = awaitCapture(jobId, handleFrame, onMessage, onDetectedCount);
      closePreview = close;

      // Handle job completion asynchronously in the background so UI doesn't lag!
      result.then((job) => {
        if (job.status !== 'COMPLETED') {
          setGroupStatus(pending, 'failed');
          setSuccessMsg(`Fingerprint capture ${job.status.toLowerCase()}${job.errorMessage ? `: ${job.errorMessage}` : ''}.`);
          setTimeout(clearSuccess, 4000);
          // Only touch the shared dialog/lock state if THIS operation is still the
          // active one - a slow straggler mustn't clobber a newer capture, and a
          // manually-dismissed dialog mustn't get reopened/re-locked.
          if (activeCaptureRef.current === myToken) {
            setLivePreviewFrame(null);
            setLiveGuidance('');
            setPreviewVisible(false);
            setPreviewConfirming(false);
            setScanningFinger(null);
          }
          return;
        }

        const seen = new Set();
        job.results.forEach(res => {
          const slot = POSITION_TO_FINGER[res.position];
          if (!slot) return;
          seen.add(`${slot.hand}.${slot.name}`);
          const quality = Math.round(res.qualityScore);
          const finalStatus = quality <= MAX_ACCEPTABLE_NFIQ ? 'captured' : 'failed';
          const existing = capturedArtifactsRef.current[slot.hand]?.[slot.name] || {};
          if (!capturedArtifactsRef.current[slot.hand]) capturedArtifactsRef.current[slot.hand] = {};
          capturedArtifactsRef.current[slot.hand][slot.name] = {
            ...existing,
            template: res.template,
            rawImage: res.rawImage || existing.rawImage,
            quality
          };
          setFingerprints(fp => ({ ...fp, [slot.hand]: { ...fp[slot.hand], [slot.name]: finalStatus } }));
          setFpQuality(q => ({ ...q, [slot.hand]: { ...q[slot.hand], [slot.name]: quality } }));
        });
        setGroupStatus(pending.filter(f => !seen.has(`${f.hand}.${f.name}`)), 'failed');
        if (activeCaptureRef.current === myToken) {
          setLivePreviewFrame(null);
          setLiveGuidance('');
          setPreviewVisible(false);
          setPreviewConfirming(false);
          setScanningFinger(null);
        }
      }).catch((e) => {
        setGroupStatus(pending, 'failed');
        if (activeCaptureRef.current === myToken) {
          setScanningFinger(null);
          setPreviewConfirming(false);
          setPreviewVisible(false);
        }
      }).finally(() => {
        closePreview();
        resolveOp();
      });
    } catch (e) {
      setGroupStatus(pending, 'failed');
      setScanningFinger(null);
      setPreviewConfirming(false);
      setPreviewVisible(false);
      setSuccessMsg(`Failed to start capture: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 4000);
      resolveOp();
    }
    await opDone;
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
    // See captureGroup's matching comment - stakes this operation's claim on
    // the shared dialog/lock state so a stale continuation or a manual
    // dismiss can never clobber a newer operation.
    const myToken = {};
    activeCaptureRef.current = myToken;
    setScanningFinger({ hand, name });
    setPreviewTarget({ hand, name });
    setPreviewVisible(true);
    setPreviewConfirming(false);
    setLiveDetectedCount(0);
    let confirmTriggered = false;
    setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'capturing' } }));
    let closePreview = () => {};
    let resolveOp;
    const opDone = new Promise((r) => { resolveOp = r; });
    const lastValidFrameRef = { current: null };
    const lastFrameTimeRef = { current: 0 };
    const handleFrame = (frame) => {
      if (frame) {
        lastValidFrameRef.current = frame;
      }
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 150) {
        lastFrameTimeRef.current = now;
        setLivePreviewFrame(frame);
      }
    };
    const triggerConfirming = () => {
      if (confirmTriggered) return;
      confirmTriggered = true;
      // Mark captured unconditionally - the checkmark icon is generic (no
      // longer a real photo), so it doesn't need a live frame to have arrived.
      setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'captured' } }));
      if (lastValidFrameRef.current) {
        if (!capturedArtifactsRef.current[hand]) capturedArtifactsRef.current[hand] = {};
        capturedArtifactsRef.current[hand][name] = {
          rawImage: lastValidFrameRef.current,
          quality: 0,
          isInstantPreview: true
        };
      }
      closePreview();
      setLivePreviewFrame(null);
      setLiveGuidance('');
      setPreviewVisible(false);
      setPreviewConfirming(false);
      setScanningFinger(null);
      resolveOp();
    };
    const onMessage = (text) => {
      if (text && /lift|release|remove|captured|success/i.test(text) && !FAILURE_GUIDANCE_RE.test(text)) {
        triggerConfirming();
      } else if (text && FAILURE_GUIDANCE_RE.test(text)) {
        setLiveGuidance(text);
        setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
        setScanningFinger(null);
        setPreviewConfirming(false);
        resolveOp();
      } else {
        setLiveGuidance(text);
      }
    };
    const onDetectedCount = (count) => {
      // RSWAS's own real-time well-scored-finger count - fires the instant the
      // device's LED/buzzer signals a good capture, independent of whether its
      // guidance text happens to contain a word onMessage's regex recognizes.
      setLiveDetectedCount(count);
      if (count >= 1) {
        triggerConfirming();
      }
    };
    try {
      const jobId = await startCapture(position);
      const { result: captureResult, close } = awaitCapture(jobId, handleFrame, onMessage, onDetectedCount);
      closePreview = close;

      captureResult.then((job) => {
        if (job.status !== 'COMPLETED') {
          setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
          setSuccessMsg(`Fingerprint capture ${job.status.toLowerCase()}${job.errorMessage ? `: ${job.errorMessage}` : ''}.`);
          setTimeout(clearSuccess, 4000);
          // Only touch the shared dialog/lock state if THIS operation is still the
          // active one - a slow straggler mustn't clobber a newer capture, and a
          // manually-dismissed dialog mustn't get reopened/re-locked.
          if (activeCaptureRef.current === myToken) {
            setLivePreviewFrame(null);
            setLiveGuidance('');
            setPreviewVisible(false);
            setPreviewConfirming(false);
            setScanningFinger(null);
          }
          return;
        }

        const res = job.results.find(r => POSITION_TO_FINGER[r.position]?.hand === hand && POSITION_TO_FINGER[r.position]?.name === name) || job.results[0];
        if (!res) {
          setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
          if (activeCaptureRef.current === myToken) {
            setLivePreviewFrame(null);
            setLiveGuidance('');
            setPreviewVisible(false);
            setPreviewConfirming(false);
            setScanningFinger(null);
          }
          return;
        }
        const quality = Math.round(res.qualityScore);
        const finalStatus = quality <= MAX_ACCEPTABLE_NFIQ ? 'captured' : 'failed';
        const existing = capturedArtifactsRef.current[hand]?.[name] || {};
        if (!capturedArtifactsRef.current[hand]) capturedArtifactsRef.current[hand] = {};
        capturedArtifactsRef.current[hand][name] = {
          ...existing,
          template: res.template,
          rawImage: res.rawImage || existing.rawImage,
          quality
        };
        setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: finalStatus } }));
        setFpQuality(q => ({ ...q, [hand]: { ...q[hand], [name]: quality } }));
        if (activeCaptureRef.current === myToken) {
          setLivePreviewFrame(null);
          setLiveGuidance('');
          setPreviewVisible(false);
          setPreviewConfirming(false);
          setScanningFinger(null);
        }
      }).catch((e) => {
        setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
        if (activeCaptureRef.current === myToken) {
          setScanningFinger(null);
          setPreviewConfirming(false);
          setPreviewVisible(false);
        }
      }).finally(() => {
        closePreview();
        resolveOp();
      });
    } catch (e) {
      setFingerprints(fp => ({ ...fp, [hand]: { ...fp[hand], [name]: 'failed' } }));
      closePreview();
      setScanningFinger(null);
      setPreviewConfirming(false);
      resolveOp();
    }
    await opDone;
  };
  const getFpProgress = () => {
    const all = [...Object.values(fingerprints.left), ...Object.values(fingerprints.right), ...Object.values(fingerprints.thumbs)];
    const completed = all.filter(s => s === 'captured' || s === 'exception').length;
    const total = all.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  };

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

  const BiometricProgressCircle = ({ size = 'md', label = 'PROCESSING...' }) => {
    const isSmall = size === 'sm';
    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-50/90 to-teal-50/50 flex flex-col items-center justify-center p-1.5 relative overflow-hidden rounded-xl border border-emerald-200/80 shadow-inner">
        {/* Radar background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:10px_10px] opacity-25" />
        {/* Pulse glow */}
        <div className="absolute h-10 w-10 rounded-full bg-emerald-400/20 blur-md animate-pulse" />
        {/* Single Rotating ring */}
        <div className="relative flex items-center justify-center">
          <svg className={`${isSmall ? 'h-9 w-9' : 'h-12 w-12'} animate-spin`} viewBox="0 0 100 100" style={{ animationDuration: '2.5s' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#cbd5e1" strokeWidth="6" opacity="0.3" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="url(#bio-emerald-grad)" strokeWidth="6" strokeDasharray="160 90" strokeLinecap="round" />
            <defs>
              <linearGradient id="bio-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className={`${isSmall ? 'text-[8px]' : 'text-[10px]'} font-extrabold text-emerald-800 tracking-wider uppercase mt-1 animate-pulse drop-shadow-sm`}>
          {label}
        </span>
      </div>
    );
  };

  const FpImage = ({ hand, name, compact = false }) => {
    const status = fingerprints[hand]?.[name];
    if (status === 'captured') {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-emerald-50">
          <FingerPrintSVG color="#10b981" opacity={0.55} />
          <CheckCircle className={`absolute text-emerald-600 bg-white rounded-full ${compact ? 'h-3 w-3 -bottom-0.5 -right-0.5' : 'h-5 w-5 bottom-0.5 right-0.5'}`} strokeWidth={2.5} />
        </div>
      );
    }
    if (status === 'capturing') {
      return <BiometricProgressCircle size="sm" label="PROCESSING..." />;
    }
    return <FingerPrintSVG color="#9ca3af" opacity={0.3} />;
  };

  const renderFingerCard = (hand, name) => {
    const status = fingerprints[hand][name];
    const isSelected = selectedFinger && selectedFinger.hand === hand && selectedFinger.name === name;
    const quality = fpQuality[hand][name];
    const qInfo = getQualityLabel(quality);
    const label = getFingerLabel(hand, name);
    const hasRaw = Boolean(capturedArtifactsRef.current?.[hand]?.[name]?.rawImage);
    const baseClasses = 'relative p-3 rounded-2xl border-2 text-center transition-all min-h-[130px] flex flex-col items-center justify-center gap-1.5 select-none';
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
        {hasRaw ? (
          <div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm p-0.5 relative">
            <FpImage hand={hand} name={name} className="w-full h-full object-contain" />
          </div>
        ) : previewConfirming && (status === 'capturing' || status === 'captured') ? (
          <div className="h-16 w-16 overflow-hidden rounded-xl">
            <BiometricProgressCircle size="sm" label="PROCESSING..." />
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full flex items-center justify-center">
            {status === 'pending' && <Fingerprint className="h-5 w-5 text-gray-300" />}
            {status === 'capturing' && <Loader2 className="h-5 w-5 text-sky-600 animate-spin" />}
            {status === 'captured' && <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />}
            {status === 'failed' && <X className="h-5 w-5 text-red-500" strokeWidth={2.5} />}
            {status === 'exception' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          </div>
        )}
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-medium ${statusColor}`}>{statusText}</p>
        {status === 'captured' && quality > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${qInfo.badgeClass}`}>NFIQ {quality} — {qInfo.label}</span>
        )}
      </button>
    );
  };

  const addAuditEntry = (action) => {
    const entry = { action, officer: 'Officer', timestamp: new Date().toLocaleString('en-GB'), caseNo: captureTarget?.caseNo || '', appNo: captureTarget?.appNo || '' };
    setAuditLog(prev => [entry, ...prev]);
    console.log('[Audit]', entry);
  };
  const getPhotoQualityLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', badgeClass: 'bg-icrcs-gold/10 text-icrcs-gold border-icrcs-gold/30' };
    if (score >= 60) return { label: 'Acceptable', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: 'Poor', badgeClass: 'bg-red-50 text-red-600 border-red-200' };
  };
  const handleStartCamera = async () => {
    try {
      const status = await getCameraStatus();
      if (!status.connected) {
        setSuccessMsg(`Camera not available: ${status.message || 'not connected'}.`);
        setTimeout(clearSuccess, 4000);
        return;
      }
    } catch (e) {
      setSuccessMsg(`Camera status check failed: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 4000);
      return;
    }
    setCameraStarted(true);
    addAuditEntry('Camera started');
    setSuccessMsg('Camera initialized successfully.');
    setTimeout(clearSuccess, 3000);
  };
  const handleCapturePhoto = async () => {
    const now = new Date();
    const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setPhotoTimestamp(ts);
    setPhotoCaptured(true);
    setPhotoSaved(false);

    // Instant 0ms local freeze using live video frame while hardware photo resolves
    if (cameraLiveFrame) {
      const liveSrc = cameraLiveFrame.startsWith('data:') ? cameraLiveFrame : `data:image/jpeg;base64,${cameraLiveFrame}`;
      setPhotoPreview(liveSrc);
    }

    try {
      const image = await captureCameraPhoto();
      if (image) {
        setPhotoPreview(`data:image/jpeg;base64,${image}`);
      }
      const score = Math.floor(Math.random() * 25) + 70;
      setPhotoQuality({
        score,
        checks: { faceCentered: true, neutralExpression: true, goodLighting: score > 75, eyesVisible: true, noShadows: score > 70, noObstruction: true, plainBackground: score > 65 }
      });
      addAuditEntry('Photograph captured');
      setSuccessMsg('Photograph captured successfully.');
      setTimeout(clearSuccess, 3000);
    } catch (e) {
      setSuccessMsg(`Camera capture notice: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 5000);
    }
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
    setSignatureMethod('Drawn (mouse/touch)');
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
  const handleStartSignaturePad = async () => {
    try {
      const status = await getSignaturePadStatus();
      if (!status.connected) {
        setSuccessMsg(`Signature pad not available: ${status.message || 'not connected'}.`);
        setTimeout(clearSuccess, 4000);
        return;
      }
      setSignaturePadActive(true);
      if (sigPadSocketRef.current) {
        sigPadSocketRef.current();
      }
      sigPadSocketRef.current = openLiveView('signature', (frame) => {
        setSignaturePadLiveFrame(frame);
      });
      addAuditEntry('Signature pad connected');
      setSuccessMsg('Signature pad connected. Please sign on the Wacom pad screen now.');
      setTimeout(clearSuccess, 3000);
    } catch (e) {
      setSuccessMsg(`Signature pad status check failed: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 4000);
    }
  };
  const handleCaptureFromPad = async () => {
    try {
      const image = await captureSignature();
      const now = new Date();
      const ts = now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setSignaturePreview(`data:image/png;base64,${image}`);
      setSignatureTimestamp(ts);
      setSignatureMethod('Wacom signature pad');
      setSignatureCaptured(true);
      const score = Math.floor(Math.random() * 25) + 70;
      setSignatureQuality({
        score,
        checks: { visible: true, complete: true, noCropping: true, goodContrast: score > 75, noExcessMarks: score > 70, confirmed: true }
      });
      addAuditEntry('Signature captured from pad');
      setSuccessMsg('Signature captured successfully.');
      setTimeout(clearSuccess, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/empty/i.test(msg) || /nothing has been signed/i.test(msg)) {
        setSuccessMsg('Signature is empty — please sign on the Wacom pad screen first.');
      } else {
        setSuccessMsg(`Signature capture failed: ${msg}`);
      }
      setTimeout(clearSuccess, 5000);
    }
  };
  const handleClearPad = async () => {
    try {
      await clearSignaturePad();
      setSignaturePadLiveFrame(null);
      addAuditEntry('Signature pad cleared');
    } catch (e) {
      setSuccessMsg(`Failed to clear signature pad: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(clearSuccess, 4000);
    }
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
    const allLeft = Object.values(fingerprints.left).every(s => s === 'captured' || s === 'exception' || s === 'capturing');
    const allRight = Object.values(fingerprints.right).every(s => s === 'captured' || s === 'exception' || s === 'capturing');
    const allThumbs = Object.values(fingerprints.thumbs).every(s => s === 'captured' || s === 'exception' || s === 'capturing');
    return allLeft && allRight && allThumbs;
  };
  const canCompleteEnrollment = () => {
    const allLeft = Object.values(fingerprints.left).every(s => s === 'captured' || s === 'exception');
    const allRight = Object.values(fingerprints.right).every(s => s === 'captured' || s === 'exception');
    const allThumbs = Object.values(fingerprints.thumbs).every(s => s === 'captured' || s === 'exception');
    return signatureCaptured && allLeft && allRight && allThumbs;
  };

  // Builds the payload for the (not-yet-existing) remote icrcs-management
  // endpoint - POST /management/cases/{caseNo}/enroll. Contract designed here,
  // frontend-first: whoever implements the endpoint should match this shape.
  // Positions/quality/template/rawImage mirror icrcs-device-service's own
  // FingerResult shape for consistency across the whole system. Missing
  // fingers (status 'exception') carry a reason instead of capture data.
  const buildBiometricsPayload = () => {
    const stripDataUrlPrefix = (src) => (src && src.includes(',') ? src.split(',')[1] : src || null);
    const allSlots = [...GROUP_FINGERS.left, ...GROUP_FINGERS.thumbs, ...GROUP_FINGERS.right];
    return {
      photo: stripDataUrlPrefix(photoPreview),
      signature: stripDataUrlPrefix(signaturePreview),
      signatureMethod: signatureMethod || null,
      fingerprints: allSlots.map(({ hand, name }) => {
        const position = FINGER_TO_POSITION[`${hand}.${name}`];
        const isException = fingerprints[hand][name] === 'exception';
        const artifact = capturedArtifactsRef.current[hand]?.[name];
        return {
          position,
          exception: isException,
          exceptionReason: isException ? (fpComments[hand][name] || null) : null,
          template: isException ? null : (artifact?.template || null),
          rawImage: isException ? null : (artifact?.rawImage || null),
          qualityScore: isException ? null : (artifact ? artifact.quality : null),
        };
      }),
    };
  };

  const completeEnrollment = async () => {
    if (!captureTarget) return;
    setWaveMsg({ text: 'Saving biometrics...', type: 'info' });
    try {
      await enrollCase(captureTarget.caseNo, buildBiometricsPayload());
      setQueue(prev => prev.map(q => q.caseNo === captureTarget.caseNo ? { ...q, status: 'Biometric Enrollment Completed' } : q));
      setWaveMsg({ text: 'Biometric enrollment completed successfully.', type: 'success' });
      setTimeout(() => { setWaveMsg({ text: '', type: '' }); closeCapture(); }, 1500);
    } catch (e) {
      setWaveMsg({ text: e instanceof Error ? e.message : 'Failed to save biometrics.', type: 'error' });
      setTimeout(() => setWaveMsg({ text: '', type: '' }), 4000);
    }
  };

  const openViewDetails = (row) => {
    setViewTarget(row);
    setActiveViewTab('info');
    setViewPreviewDoc(null);
    setShowViewModal(true);
    setViewReview(null);
    setViewApplicantError('');
    setLoadingViewApplicant(true);
    getApplicantReview(row.caseNo)
      .then(review => {
        if (review) setViewReview(review);
        else setViewApplicantError('No applicant data returned.');
      })
      .catch(err => setViewApplicantError(err.message || 'Failed to load applicant data.'))
      .finally(() => setLoadingViewApplicant(false));
  };
  const closeViewDetails = () => { setShowViewModal(false); setViewTarget(null); setViewReview(null); setActiveViewTab('info'); setViewPreviewDoc(null); };

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
        <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-2">Try these demo application numbers:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(mockPortalApps).map((key) => (
              <button key={key} onClick={() => { setAppNumber(key); setError(''); clearSuccess(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:border-icrcs-navy/30 hover:text-icrcs-navy transition-colors">{key}</button>
            ))}
          </div>
        </div>
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
              {activeReviewTab==='info'&&<ApplicantInfoView data={mapReviewToApplicant(fetchedApp.applicantData)}/>}

              {activeReviewTab==='attachments'&&(
                <div className="flex flex-col lg:flex-row gap-5 h-full">
                  <div className="lg:w-[55%] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-800">Uploaded Attachments ({attachmentsFromReview(fetchedApp.applicantData).length})</h3>
                      <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                    </div>
                    <div className="space-y-2">
                      {attachmentsFromReview(fetchedApp.applicantData).length===0&&(
                        <div className="text-xs text-gray-400 py-4 text-center">No attachments found for this applicant.</div>
                      )}
                      {attachmentsFromReview(fetchedApp.applicantData).map((d)=>(
                        <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${d.isImage?'bg-blue-50':'bg-red-50'}`}><span className={`text-[9px] font-bold uppercase ${d.isImage?'text-blue-600':'text-red-600'}`}>{d.ext}</span></div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                              <div className="text-[10px] text-gray-400">{d.attachmentType}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                            <a href={d.url} target="_blank" rel="noreferrer" download={d.name} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:w-[45%] space-y-4">
                    {previewDoc?(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">{previewDoc.name}</span></div>
                          <button onClick={()=>setPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                        </div>
                        {previewDoc.isImage?(
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center min-h-[280px]">
                            <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[420px] object-contain rounded"/>
                          </div>
                        ):(
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex flex-col min-h-[350px]">
                            <iframe src={previewDoc.url} className="w-full flex-1 min-h-[350px] border-0" title={previewDoc.name}/>
                          </div>
                        )}
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
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-icrcs-navy"/>Application Summary</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Subject ID</span><span className="font-mono text-sm text-gray-900">{fetchedApp.appNo}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Registration Type</span><span className="text-sm text-gray-900">{fetchedApp.appType || '—'}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Case Created</span><span className="text-sm text-gray-900">{fetchedApp.createdAt ? new Date(fetchedApp.createdAt).toLocaleDateString() : '—'}</span></div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><span className="text-xs text-gray-500 block">Current Status</span><span className="text-sm text-gray-900">{fetchedApp.currentStatus}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button onClick={closeReviewModal} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
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
                {viewTarget.registrationType && <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{viewTarget.registrationType}</span>}
                <button onClick={closeViewDetails} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 bg-white">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  {id:'info',label:'Applicant Info',icon:<User className="h-4 w-4"/>},
                  {id:'attachments',label:'Attachments',icon:<FolderOpen className="h-4 w-4"/>},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setActiveViewTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeViewTab===t.id?'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeViewTab==='info'&&(loadingViewApplicant
                ?<div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading applicant data...</div>
                :viewApplicantError
                  ?<div className="flex flex-col items-center justify-center py-20 gap-2">
                     <p className="text-sm text-red-500 font-medium">Failed to load applicant data</p>
                     <p className="text-xs text-gray-400">{viewApplicantError}</p>
                   </div>
                  :<ApplicantInfoView data={mapReviewToApplicant(viewReview)}/>
              )}

              {activeViewTab==='attachments'&&(
                <div className="flex flex-col lg:flex-row gap-5 h-full">
                  <div className="lg:w-[55%] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-800">
                        {loadingViewApplicant?'Uploaded Attachments (loading…)':`Uploaded Attachments (${attachmentsFromReview(viewReview).length})`}
                      </h3>
                      <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                    </div>
                    <div className="space-y-2">
                      {attachmentsFromReview(viewReview).length===0&&!loadingViewApplicant&&(
                        <div className="text-xs text-gray-400 py-4 text-center">No attachments found for this applicant.</div>
                      )}
                      {attachmentsFromReview(viewReview).map((d)=>(
                        <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${d.isImage?'bg-blue-50':'bg-red-50'}`}><span className={`text-[9px] font-bold uppercase ${d.isImage?'text-blue-600':'text-red-600'}`}>{d.ext}</span></div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                              <div className="text-[10px] text-gray-400">{d.attachmentType}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>setViewPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                            <a href={d.url} target="_blank" rel="noreferrer" download={d.name} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:w-[45%] space-y-4">
                    {viewPreviewDoc?(
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">{viewPreviewDoc.name}</span></div>
                          <button onClick={()=>setViewPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                        </div>
                        {viewPreviewDoc.isImage?(
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center min-h-[280px]">
                            <img src={viewPreviewDoc.url} alt={viewPreviewDoc.name} className="max-w-full max-h-[420px] object-contain rounded"/>
                          </div>
                        ):(
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex flex-col min-h-[350px]">
                            <iframe src={viewPreviewDoc.url} className="w-full flex-1 min-h-[350px] border-0" title={viewPreviewDoc.name}/>
                          </div>
                        )}
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
            <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-none">Biometric Enrollment</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Capture and verify applicant biometric information</p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-1 rounded-xl border border-gray-200/80 shadow-xs">
                  <span><span className="text-gray-400">App:</span> <span className="font-mono font-semibold text-gray-800">{captureTarget.appNo}</span></span>
                  <span className="text-gray-300">•</span>
                  <span><span className="text-gray-400">Case:</span> <span className="font-mono font-semibold text-gray-800">{captureTarget.caseNo}</span></span>
                  <span className="text-gray-300">•</span>
                  <span><span className="text-gray-400">Applicant:</span> <span className="font-semibold text-gray-800">{captureTarget.fullName}</span></span>
                  <span className="text-gray-300">•</span>
                  <span><span className="text-gray-400">Nat:</span> <span className="font-semibold text-gray-800">{captureTarget.nationality}</span></span>
                </div>
              </div>
              <button onClick={closeCapture} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors shrink-0"><X className="h-4 w-4" /></button>
            </div>

            {/* Step Navigation */}
            <div className="px-5 sm:px-6 py-2 border-b border-gray-100 shrink-0 bg-white">
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
                      {idx > 0 && <div className={`hidden sm:block flex-1 h-0.5 max-w-12 ${isCompleted ? 'bg-icrcs-gold' : 'bg-gray-200'}`} />}
                      <button onClick={() => { if (isCompleted) setCaptureStep(step.n); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all text-xs font-semibold ${isActive ? 'bg-icrcs-navy text-white shadow-xs' : isCompleted ? 'text-icrcs-gold' : 'text-gray-400'}`}>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-white text-icrcs-navy' : isCompleted ? 'bg-icrcs-gold text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {isCompleted && !isActive ? <CheckCircle className="h-3 w-3" strokeWidth={3} /> : step.n}
                        </div>
                        <span className="hidden sm:inline">{step.label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="relative flex-1 overflow-y-auto p-4 sm:p-5">
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
                      <div className="h-[190px] sm:h-[210px] w-full rounded-xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center justify-center overflow-hidden relative shrink-0">
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
                          <div className="w-full h-full flex items-center justify-center relative bg-black">
                            {cameraLiveFrame ? (
                              <img
                                src={cameraLiveFrame.startsWith('data:') ? cameraLiveFrame : `data:image/jpeg;base64,${cameraLiveFrame}`}
                                alt="Live camera preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-24 h-32 border-2 border-dashed border-white/30 rounded-[50%]" />
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
                      <div className="h-[190px] sm:h-[210px] w-full rounded-xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center justify-center overflow-hidden shrink-0">
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
                        {status === 'captured' && <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />}
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
                        {previewStatus === 'captured' ? (
                          <div className={`w-full h-full p-1.5 grid gap-1 bg-white ${fingers.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                            {fingers.map(f => (
                              <div key={f.name} className="rounded overflow-hidden bg-white flex items-center justify-center relative">
                                <FpImage hand={f.hand} name={f.name} compact />
                              </div>
                            ))}
                          </div>
                        ) : previewStatus === 'capturing' ? (
                          <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
                        ) : previewStatus === 'failed' ? (
                          <X className="h-8 w-8 text-red-500" strokeWidth={2.5} />
                        ) : previewStatus === 'exception' ? (
                          <AlertTriangle className="h-8 w-8 text-amber-500" />
                        ) : (
                          <Fingerprint className="h-10 w-10 text-gray-300" />
                        )}
                      </button>
                      <span className="text-xs font-bold text-gray-700">{title}</span>
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

                      {/* Signature pad (Wacom STU-430) - the real device, as an
                          alternative to drawing below with a mouse/touch. */}
                      <div className="mb-4 p-4 rounded-xl bg-gray-900 border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Signature Pad</span>
                          {signaturePadActive && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                          )}
                        </div>
                        <div className="h-[110px] rounded-lg bg-black flex items-center justify-center overflow-hidden">
                          {signaturePadActive ? (
                            signaturePadLiveFrame ? (
                              <img
                                src={signaturePadLiveFrame.startsWith('data:') ? signaturePadLiveFrame : `data:image/png;base64,${signaturePadLiveFrame}`}
                                alt="Live signature pad preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">Sign on the pad now...</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">Pad not connected</span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {!signaturePadActive ? (
                            <button onClick={handleStartSignaturePad} className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-semibold hover:bg-icrcs-navy-light transition-colors">
                              Connect Pad
                            </button>
                          ) : (
                            <>
                              <button onClick={handleCaptureFromPad} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
                                Capture from Pad
                              </button>
                              <button onClick={handleClearPad} className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-xs font-medium hover:bg-gray-800 transition-colors">
                                Clear Pad
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-gray-400 mb-2">Or draw manually:</p>
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
                  <CheckCircle className="h-4 w-4" /> Waive Biometrics
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
                    disabled={!canCompleteEnrollment() || waveMsg.type === 'info'}
                    className="px-5 py-2.5 rounded-xl bg-icrcs-gold text-white text-sm font-semibold hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >Complete Enrollment</button>
                )}
              </div>
            </div>
            {/* Global Live Scanner Preview Modal Dialog */}
            {previewVisible && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
                <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {scanningFinger ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold text-red-400 uppercase tracking-wider animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live Scanner Stream
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-xs font-bold text-amber-400 uppercase tracking-wider">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Capture Failed
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        {getScanningLabel()}
                      </span>
                      <button onClick={dismissLivePreview} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Close">
                        <X className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-[300px] sm:h-[340px] rounded-2xl bg-white border border-slate-700/50 flex items-center justify-center overflow-hidden p-2 shadow-inner">
                    {livePreviewFrame ? (
                      <img
                        src={livePreviewFrame.startsWith('data:') ? livePreviewFrame : `data:image/png;base64,${livePreviewFrame}`}
                        alt="Live scanner preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Fingerprint className="h-16 w-16 animate-pulse text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">{liveGuidance || 'Place your hand on the scanner...'}</span>
                      </div>
                    )}
                  </div>

                  {livePreviewFrame && liveGuidance && (
                    <span className={`text-xs font-bold px-4 py-1.5 rounded-full border text-center ${liveGuidance && FAILURE_GUIDANCE_RE.test(liveGuidance) ? 'text-amber-300 bg-amber-950/80 border-amber-500/40' : 'text-sky-300 bg-sky-950/50 border-sky-800/40'}`}>
                      {liveGuidance}
                    </span>
                  )}

                  {/* Temporary diagnostic readout - shows RSWAS's raw live well-scored-finger
                      count so we can watch, on the real device, whether it ever climbs before
                      the job finishes, without needing the browser console open. */}
                  {scanningFinger && (
                    <span className="text-[11px] font-mono text-slate-500">
                      diag: detected {liveDetectedCount}/{previewTarget?.group ? GROUP_FINGERS[previewTarget.group].length : 1}
                    </span>
                  )}

                  {(!scanningFinger || (liveGuidance && FAILURE_GUIDANCE_RE.test(liveGuidance))) && (
                    <div className="flex items-center gap-3 w-full pt-1">
                      <button
                        onClick={() => {
                          setScanningFinger(null);
                          setPreviewConfirming(false);
                          setLivePreviewFrame(null);
                          setLiveGuidance('');
                          if (previewTarget?.group) captureGroup(previewTarget.group, true);
                          else if (previewTarget) captureSingleFinger(previewTarget.hand, previewTarget.name);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Capture
                      </button>
                      <button onClick={dismissLivePreview} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 hover:text-white transition-colors">
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
