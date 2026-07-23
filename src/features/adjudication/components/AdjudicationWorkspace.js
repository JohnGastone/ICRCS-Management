import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, MessageSquare,
  X, User, ArrowLeft, Copy, Eye, Fingerprint, ShieldCheck,
  SendHorizontal, Loader2
} from 'lucide-react';
import { getAdjudicationDetail, resolveAdjudication } from '../../../services/managementService';

// Matches icrcs-device-service's FingerPosition enum ordering/naming.
const FINGER_POSITIONS = [
  { position: 'RIGHT_THUMB', label: 'Right Thumb' },
  { position: 'RIGHT_INDEX', label: 'Right Index' },
  { position: 'RIGHT_MIDDLE', label: 'Right Middle' },
  { position: 'RIGHT_RING', label: 'Right Ring' },
  { position: 'RIGHT_LITTLE', label: 'Right Little' },
  { position: 'LEFT_THUMB', label: 'Left Thumb' },
  { position: 'LEFT_INDEX', label: 'Left Index' },
  { position: 'LEFT_MIDDLE', label: 'Left Middle' },
  { position: 'LEFT_RING', label: 'Left Ring' },
  { position: 'LEFT_LITTLE', label: 'Left Little' },
];

const genderLabel = (sexId) => (sexId === 1 ? 'Male' : sexId === 2 ? 'Female' : '—');

function InfoRow({ label, value, highlight, mono }) {
  const copy = () => { navigator.clipboard.writeText(value || ''); };
  const hasValue = Boolean(value);
  const display = value || '—';
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 group">
      <span className="text-xs text-gray-400 shrink-0 w-[120px]">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-right break-words ${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold text-icrcs-navy' : 'text-gray-700'}`}>{display}</span>
        {hasValue && (
          <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 shrink-0">
            <Copy className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// Tailwind needs full literal class strings at build time - a template
// literal like `border-${color}-500` is invisible to it and would silently
// produce no styling in production, so each variant is spelled out in full.
const DECISION_OPTIONS = [
  { id: 'SAME_APPLICANT', label: 'Same Applicant', icon: CheckCircle, desc: 'Both records belong to the same person. Continue using original record.', activeClass: 'border-green-500 bg-green-50', iconClass: 'text-green-600' },
  { id: 'DIFFERENT_APPLICANTS', label: 'Different Applicants', icon: XCircle, desc: 'Biometric similarity exists but demographics differ. Allow to proceed.', activeClass: 'border-sky-500 bg-sky-50', iconClass: 'text-sky-600' },
  { id: 'SUSPECTED_FRAUD', label: 'Suspected Fraud', icon: AlertTriangle, desc: 'Multiple identities or inconsistent documents. Escalate to Investigation Unit.', activeClass: 'border-red-500 bg-red-50', iconClass: 'text-red-600' },
  { id: 'INSUFFICIENT_EVIDENCE', label: 'Insufficient Evidence', icon: MessageSquare, desc: 'Evidence cannot support a conclusion. Request additional documents or re-interview.', activeClass: 'border-amber-500 bg-amber-50', iconClass: 'text-amber-600' },
];

export default function AdjudicationWorkspace({ row, isOpen, onClose, onSubmit }) {
  const [decision, setDecision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [activeTab, setActiveTab] = useState('biometric');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!row?.id) return;
    setLoadingDetail(true); setDetailError('');
    try {
      setDetail(await getAdjudicationDetail(row.id));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  }, [row]);

  useEffect(() => {
    if (isOpen && row) {
      setDecision(''); setRemarks(''); setActiveTab('biometric'); setConfirmSubmit(false); setToast('');
      loadDetail();
    }
  }, [isOpen, row, loadDetail]);

  if (!isOpen || !row) return null;

  const submitDecision = async () => {
    if (!decision) { setToast('Select an adjudication decision.'); setTimeout(() => setToast(''), 4000); return; }
    if (!remarks.trim()) { setToast('Enter remarks.'); setTimeout(() => setToast(''), 4000); return; }
    setSubmitting(true);
    try {
      await resolveAdjudication(row.id, { decision, remarks });
      onSubmit(row.caseNo);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to submit decision.');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  };

  const riskLevel = detail?.riskLevel || row.riskLevel;
  const riskColor = riskLevel === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
    riskLevel === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
    riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-green-50 text-green-700 border-green-200';

  const fingerScores = detail?.fingerScores || {};
  const applicant = detail?.applicant;
  const matched = detail?.matchedApplicant;

  const tabs = [
    { id: 'biometric', label: 'Biometric', icon: <Fingerprint className="h-4 w-4" /> },
    { id: 'comparison', label: 'Comparison', icon: <Eye className="h-4 w-4" /> },
    { id: 'decision', label: 'Decision', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[95%] md:h-[95vh] lg:w-[90%] lg:max-w-[1200px] lg:h-auto lg:max-h-[90vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft className="h-4 w-4 text-gray-500" /></button>
            <div>
              <h2 className="text-base font-bold text-gray-800">Biometric Match Resolution</h2>
              <p className="text-xs text-gray-400 font-mono">{row.caseNo} / {row.appNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{row.adjudicationType}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${riskColor}`}>{riskLevel} Risk</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-blue-50 text-blue-700 border-blue-200">{Math.round(detail?.bestMatchScore ?? 0)}% Match</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500" /></button>
          </div>
        </div>

        {toast && <div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2.5} /><span className="text-sm text-amber-700 font-medium">{toast}</span><button onClick={() => setToast('')} className="ml-auto"><X className="h-3.5 w-3.5 text-amber-600" /></button></div>}
        {detailError && <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600 shrink-0" /><span className="text-sm text-red-700 font-medium">{detailError}</span></div>}

        {/* Tabs */}
        <div className="px-5 sm:px-6 border-b border-gray-100 bg-white">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t.id ? 'border-icrcs-navy text-icrcs-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.icon}{t.label}</button>))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loadingDetail && (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading match details…
            </div>
          )}

          {!loadingDetail && detail && activeTab === 'comparison' && (
            <div className="space-y-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-sky-50/50 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center"><User className="h-4 w-4 text-sky-600" /></div>
                    <div><h3 className="text-sm font-bold text-gray-800">Current Applicant</h3><p className="text-[10px] text-gray-500">Case {detail.caseNo}</p></div>
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex justify-center mb-3">
                      <div className="h-32 w-32 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-300" />
                      </div>
                    </div>
                    <InfoRow label="Subject ID" value={applicant?.subjectId} mono highlight />
                    <InfoRow label="Full Name" value={applicant?.fullName} highlight />
                    <InfoRow label="Gender" value={genderLabel(applicant?.sexId)} />
                    <InfoRow label="Date of Birth" value={applicant?.dateOfBirth} />
                    <InfoRow label="Nationality" value={applicant?.nationalityCode} />
                    <InfoRow label="Country of Birth" value={applicant?.countryOfBirthCode} />
                    <InfoRow label="City of Birth" value={applicant?.cityOfBirth} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-purple-50/50 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center"><User className="h-4 w-4 text-purple-600" /></div>
                    <div><h3 className="text-sm font-bold text-gray-800">Matched Record</h3><p className="text-[10px] text-gray-500">Case {detail.matchedCaseNo}</p></div>
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex justify-center mb-3">
                      <div className="h-32 w-32 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-300" />
                      </div>
                    </div>
                    <InfoRow label="Subject ID" value={matched?.subjectId} mono highlight />
                    <InfoRow label="Full Name" value={matched?.fullName} highlight />
                    <InfoRow label="Gender" value={genderLabel(matched?.sexId)} />
                    <InfoRow label="Date of Birth" value={matched?.dateOfBirth} />
                    <InfoRow label="Nationality" value={matched?.nationalityCode} />
                    <InfoRow label="Country of Birth" value={matched?.countryOfBirthCode} />
                    <InfoRow label="City of Birth" value={matched?.cityOfBirth} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loadingDetail && detail && activeTab === 'biometric' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Fingerprint className="h-5 w-5 text-icrcs-navy" />
                  <h3 className="text-sm font-bold text-gray-800">Biometric Comparison Results</h3>
                  <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full border font-semibold ${riskColor}`}>{riskLevel} Risk</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Best Match Score</p>
                    <p className="text-lg font-bold text-icrcs-navy">{Math.round(detail.bestMatchScore)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Matching Fingers</p>
                    <p className="text-lg font-bold text-gray-800">{detail.matchedFingerCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Detected On</p>
                    <p className="text-xs font-semibold text-gray-800">{detail.createdAt}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Assigned Officer</p>
                    <p className="text-xs font-semibold text-gray-800">{detail.assignedOfficerName || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Finger</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">Score</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Result</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {FINGER_POSITIONS.map(({ position, label }) => {
                        const score = fingerScores[position];
                        const hasScore = score !== undefined;
                        return (
                          <tr key={position} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{label}</td>
                            <td className="px-4 py-2.5 text-center text-xs font-mono font-semibold text-icrcs-navy">{hasScore ? Math.round(score) : '—'}</td>
                            <td className="px-4 py-2.5">
                              {!hasScore ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-500 border-gray-200">No Record</span>
                              ) : score >= 40 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-green-50 text-green-600 border-green-100">Match</span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-500 border-gray-200">No Match</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loadingDetail && activeTab === 'decision' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-icrcs-navy" />Adjudication Decision</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {DECISION_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setDecision(opt.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${decision === opt.id ? opt.activeClass : 'border-gray-100 hover:border-gray-300'}`}>
                      <opt.icon className={`h-5 w-5 ${opt.iconClass} mb-2`} />
                      <p className="text-xs font-bold text-gray-800">{opt.label}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-icrcs-navy" />Remarks</h3>
                <textarea rows={4} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter detailed remarks justifying the adjudication decision..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none transition-all" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
          <div className="flex items-center gap-2">
            {!confirmSubmit ? (
              <button onClick={() => setConfirmSubmit(true)} disabled={loadingDetail} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-40"><SendHorizontal className="h-4 w-4" />Submit Decision</button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm text-amber-700 font-medium">Confirm this adjudication decision?</span>
                <button onClick={() => setConfirmSubmit(false)} className="text-sm px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                <button onClick={submitDecision} disabled={submitting} className="text-sm px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">{submitting ? 'Submitting…' : 'Confirm'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
