import React, { useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, FileText, MessageSquare,
  X, User, ArrowLeft, Copy, Eye, Fingerprint, ShieldCheck,
  SendHorizontal, Save, ChevronDown, ChevronUp
} from 'lucide-react';

const currentApplicant = {
  subjectId: 'SUB-2026-000145',
  fullName: 'John Michael Doe',
  gender: 'Male',
  dob: '10-Jan-1990',
  nationality: 'Kenyan',
  passportNo: 'A12345678',
  nin: '19900110-12345-67890',
  photoUrl: null,
  applicationType: 'Citizenship by Naturalization',
  dateRegistered: '05-Jun-2026',
  fatherName: 'Michael Doe Sr.',
  motherName: 'Jane Doe',
  residence: 'Kariakoo, Dar es Salaam',
};

const matchedRecord = {
  subjectId: 'SUB-2024-000892',
  fullName: 'Jonathan M. Doe',
  gender: 'Male',
  dob: '10-Jan-1990',
  nationality: 'Kenyan',
  passportNo: 'A12345678',
  nin: '19900110-12345-67890',
  photoUrl: null,
  previousStatus: 'Citizen by Naturalization — Approved',
  registrationDate: '15-Mar-2024',
  fatherName: 'Michael Doe Sr.',
  motherName: 'Jane Doe',
  residence: 'Kariakoo, Dar es Salaam',
};

const biometricResults = {
  matchScore: 98,
  matchedFingers: ['Left Index', 'Right Thumb', 'Left Thumb', 'Right Index'],
  matchingFingerCount: 4,
  verificationDate: '12-Jun-2026 09:45 AM',
  biometricOperator: 'Juma Kipanya',
  duplicateRiskLevel: 'Critical',
  scores: [
    { finger: 'Left Index', captured: true, existing: true, score: '98%', result: 'Match' },
    { finger: 'Right Thumb', captured: true, existing: true, score: '96%', result: 'Match' },
    { finger: 'Left Thumb', captured: true, existing: true, score: '94%', result: 'Match' },
    { finger: 'Right Index', captured: true, existing: true, score: '92%', result: 'Match' },
    { finger: 'Left Middle', captured: true, existing: false, score: '—', result: 'No Record' },
    { finger: 'Right Middle', captured: true, existing: false, score: '—', result: 'No Record' },
  ]
};

const auditHistory = [
  { id: 1, ts: '12-Jun-2026 09:30 AM', officer: 'J. Smith', text: 'Fingerprint verification initiated. Comparing captured prints against existing biometric database.', outcome: null },
  { id: 2, ts: '12-Jun-2026 09:45 AM', officer: 'J. Kipanya', text: 'Duplicate record identified. Potential match with SUB-2024-000892 (98% score). Risk: Critical.', outcome: null },
  { id: 3, ts: '12-Jun-2026 10:00 AM', officer: 'G. Temu', text: 'Case auto-assigned to adjudication queue for biometric match resolution.', outcome: null },
];

const defaultChecklist = {
  identity: [
    { label: 'Names are identical', checked: false },
    { label: 'Names are similar', checked: true },
    { label: 'Date of birth matches', checked: true },
    { label: 'Gender matches', checked: true },
    { label: "Parents' information matches", checked: true },
    { label: 'Nationality information matches', checked: true },
    { label: 'Passport information matches', checked: true },
    { label: 'National ID information matches', checked: true },
    { label: 'Residence information matches', checked: true },
  ],
  documents: [
    { label: 'Birth certificate reviewed', checked: false },
    { label: 'Passport reviewed', checked: false },
    { label: 'National ID reviewed', checked: false },
    { label: 'Residence permit reviewed', checked: false },
    { label: 'Supporting affidavits reviewed', checked: false },
  ],
  biometric: [
    { label: 'Fingerprint images reviewed', checked: false },
    { label: 'Photograph comparison completed', checked: false },
    { label: 'Signature comparison completed', checked: false },
    { label: 'Match quality acceptable', checked: false },
  ],
};

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

function SectionCard({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">{icon}{title}</div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export default function AdjudicationWorkspace({ row, isOpen, onClose, onSubmit }) {
  const [decision, setDecision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [activeTab, setActiveTab] = useState('biometric');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [toast, setToast] = useState('');

  if (!isOpen || !row) return null;

  const toggleCheck = (section, idx) => {
    setChecklist(prev => ({ ...prev, [section]: prev[section].map((item, i) => i === idx ? { ...item, checked: !item.checked } : item) }));
  };
  const checkedCount = (section) => checklist[section].filter(i => i.checked).length;
  const totalChecked = checkedCount('identity') + checkedCount('documents') + checkedCount('biometric');
  const totalItems = checklist.identity.length + checklist.documents.length + checklist.biometric.length;

  const submitDecision = () => {
    if (!decision) { setToast('Select an adjudication decision.'); setTimeout(() => setToast(''), 4000); return; }
    if (!remarks.trim()) { setToast('Enter remarks.'); setTimeout(() => setToast(''), 4000); return; }
    const ns = decision === 'same' || decision === 'different' ? 'Completed Review' : decision === 'fraud' ? 'Escalated' : 'Under Review';
    onSubmit(row.caseNo, ns); setConfirmSubmit(false); onClose();
  };

  const riskColor = biometricResults.duplicateRiskLevel === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
    biometricResults.duplicateRiskLevel === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
    biometricResults.duplicateRiskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-green-50 text-green-700 border-green-200';

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
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${riskColor}`}>{biometricResults.duplicateRiskLevel} Risk</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-blue-50 text-blue-700 border-blue-200">{biometricResults.matchScore}% Match</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500" /></button>
          </div>
        </div>

        {toast && <div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2.5} /><span className="text-sm text-amber-700 font-medium">{toast}</span><button onClick={() => setToast('')} className="ml-auto"><X className="h-3.5 w-3.5 text-amber-600" /></button></div>}

        {/* Tabs */}
        <div className="px-5 sm:px-6 border-b border-gray-100 bg-white">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t.id ? 'border-icrcs-navy text-icrcs-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.icon}{t.label}</button>))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">

          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-sky-50/50 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center"><User className="h-4 w-4 text-sky-600" /></div>
                    <div><h3 className="text-sm font-bold text-gray-800">Current Applicant</h3><p className="text-[10px] text-gray-500">Section A</p></div>
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex justify-center mb-3">
                      <div className="h-48 w-48 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-300" />
                      </div>
                    </div>
                    <InfoRow label="Subject ID" value={currentApplicant.subjectId} mono highlight />
                    <InfoRow label="Full Name" value={currentApplicant.fullName} highlight />
                    <InfoRow label="Gender" value={currentApplicant.gender} />
                    <InfoRow label="Date of Birth" value={currentApplicant.dob} />
                    <InfoRow label="Nationality" value={currentApplicant.nationality} />
                    <InfoRow label="Passport No." value={currentApplicant.passportNo} mono />
                    <InfoRow label="National ID" value={currentApplicant.nin} mono />
                    <InfoRow label="Application Type" value={currentApplicant.applicationType} />
                    <InfoRow label="Date Registered" value={currentApplicant.dateRegistered} />
                    <InfoRow label="Father" value={currentApplicant.fatherName} />
                    <InfoRow label="Mother" value={currentApplicant.motherName} />
                    <InfoRow label="Residence" value={currentApplicant.residence} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-purple-50/50 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center"><User className="h-4 w-4 text-purple-600" /></div>
                    <div><h3 className="text-sm font-bold text-gray-800">Matched Record</h3><p className="text-[10px] text-gray-500">Section B</p></div>
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex justify-center mb-3">
                      <div className="h-48 w-48 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-300" />
                      </div>
                    </div>
                    <InfoRow label="Subject ID" value={matchedRecord.subjectId} mono highlight />
                    <InfoRow label="Full Name" value={matchedRecord.fullName} highlight />
                    <InfoRow label="Gender" value={matchedRecord.gender} />
                    <InfoRow label="Date of Birth" value={matchedRecord.dob} />
                    <InfoRow label="Nationality" value={matchedRecord.nationality} />
                    <InfoRow label="Passport No." value={matchedRecord.passportNo} mono />
                    <InfoRow label="National ID" value={matchedRecord.nin} mono />
                    <InfoRow label="Previous Status" value={matchedRecord.previousStatus} highlight />
                    <InfoRow label="Registration Date" value={matchedRecord.registrationDate} />
                    <InfoRow label="Father" value={matchedRecord.fatherName} />
                    <InfoRow label="Mother" value={matchedRecord.motherName} />
                    <InfoRow label="Residence" value={matchedRecord.residence} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'biometric' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Fingerprint className="h-5 w-5 text-icrcs-navy" />
                  <h3 className="text-sm font-bold text-gray-800">Biometric Comparison Results</h3>
                  <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full border font-semibold ${riskColor}`}>{biometricResults.duplicateRiskLevel} Risk</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Match Score</p>
                    <p className="text-lg font-bold text-icrcs-navy">{biometricResults.matchScore}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Matching Fingers</p>
                    <p className="text-lg font-bold text-gray-800">{biometricResults.matchingFingerCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Verified On</p>
                    <p className="text-xs font-semibold text-gray-800">{biometricResults.verificationDate}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Operator</p>
                    <p className="text-xs font-semibold text-gray-800">{biometricResults.biometricOperator}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Finger</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">Captured</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">Existing</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">Score</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Result</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {biometricResults.scores.map((v, i) => (
                        <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{v.finger}</td>
                          <td className="px-4 py-2.5 text-center">{v.captured ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}</td>
                          <td className="px-4 py-2.5 text-center">{v.existing ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}</td>
                          <td className="px-4 py-2.5 text-center text-xs font-mono font-semibold text-icrcs-navy">{v.score}</td>
                          <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${v.result === 'Match' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{v.result}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'decision' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-icrcs-navy" />Adjudication Decision</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setDecision('same')} className={`p-4 rounded-xl border-2 text-left transition-all ${decision === 'same' ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-300'}`}>
                    <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                    <p className="text-xs font-bold text-gray-800">Same Applicant</p>
                    <p className="text-[10px] text-gray-500 mt-1">Both records belong to the same person. Continue using original record.</p>
                  </button>
                  <button onClick={() => setDecision('different')} className={`p-4 rounded-xl border-2 text-left transition-all ${decision === 'different' ? 'border-sky-500 bg-sky-50' : 'border-gray-100 hover:border-sky-300'}`}>
                    <XCircle className="h-5 w-5 text-sky-600 mb-2" />
                    <p className="text-xs font-bold text-gray-800">Different Applicants</p>
                    <p className="text-[10px] text-gray-500 mt-1">Biometric similarity exists but demographics differ. Allow to proceed.</p>
                  </button>
                  <button onClick={() => setDecision('fraud')} className={`p-4 rounded-xl border-2 text-left transition-all ${decision === 'fraud' ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-red-300'}`}>
                    <AlertTriangle className="h-5 w-5 text-red-600 mb-2" />
                    <p className="text-xs font-bold text-gray-800">Suspected Fraud</p>
                    <p className="text-[10px] text-gray-500 mt-1">Multiple identities or inconsistent documents. Escalate to Investigation Unit.</p>
                  </button>
                  <button onClick={() => setDecision('insufficient')} className={`p-4 rounded-xl border-2 text-left transition-all ${decision === 'insufficient' ? 'border-amber-500 bg-amber-50' : 'border-gray-100 hover:border-amber-300'}`}>
                    <MessageSquare className="h-5 w-5 text-amber-600 mb-2" />
                    <p className="text-xs font-bold text-gray-800">Insufficient Evidence</p>
                    <p className="text-[10px] text-gray-500 mt-1">Evidence cannot support a conclusion. Request additional documents or re-interview.</p>
                  </button>
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
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
            <button className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1.5"><Save className="h-4 w-4" />Save Draft</button>
          </div>
          <div className="flex items-center gap-2">
            {!confirmSubmit ? (
              <>
                <button onClick={() => setDecision('fraud')} className="px-5 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors">Escalate Fraud</button>
                <button onClick={() => setConfirmSubmit(true)} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1.5"><SendHorizontal className="h-4 w-4" />Submit Decision</button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm text-amber-700 font-medium">Confirm this adjudication decision?</span>
                <button onClick={() => setConfirmSubmit(false)} className="text-sm px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                <button onClick={submitDecision} className="text-sm px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Confirm</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
