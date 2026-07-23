import React, { useState } from 'react';
import {
  Search, User, Calendar, BadgeCheck, SearchIcon,
  ClipboardList, SendHorizontal
} from 'lucide-react';
import { getCaseBySubject } from '../../../services/managementService';

export default function Enquiries() {
  const [searchType, setSearchType] = useState('subject_id');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const searchTypes = [
    { key: 'subject_id', label: 'Subject ID' },
    { key: 'name', label: 'Full Name' },
    { key: 'fingerprint', label: 'Fingerprint No.' },
    { key: 'nin', label: 'National ID No.' },
    { key: 'passport', label: 'Passport No.' },
    { key: 'permit', label: 'Residence Permit No.' },
    { key: 'dob', label: 'Date of Birth' },
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchError('');
    setResult(null);

    if (searchType === 'subject_id') {
      setSearching(true);
      try {
        const c = await getCaseBySubject(query.trim());
        setResult({
          subjectId: c.subjectId,
          name: c.person?.fullName || c.subjectId,
          dob: c.person?.dateOfBirth,
          nationality: c.person?.nationalityCode,
          gender: c.person?.sexId === 1 ? 'Male' : 'Female',
          status: c.status,
          finalStatus: c.finalStatus,
          documentType: c.documentType,
          caseRef: c.caseNo,
          registrationType: c.registrationType,
          assessment: c.assessment,
          decision: c.decision,
        });
      } catch (err) {
        setSearchError(err.message || 'No case found for that Subject ID.');
      } finally {
        setSearching(false);
      }
    } else {
      // Other search types (name, fingerprint, NIN, passport) not yet connected to API
      setSearchError('Only Subject ID lookup is currently supported via this portal.');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Search and verify status determination records</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-xs font-semibold border border-icrcs-navy/20">Record Lookup</span>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-icrcs-navy/10 flex items-center justify-center shrink-0">
            <Search className="h-5 w-5 text-icrcs-navy" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Search Records</h2>
            <p className="text-xs text-gray-500">Find subject by ID, name, fingerprint, or document number</p>
          </div>
        </div>
        <div className="p-5">
          <form onSubmit={handleSearch}>
            <div className="flex flex-wrap gap-2 mb-4">
              {searchTypes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSearchType(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    searchType === t.key
                      ? 'bg-icrcs-navy text-white border-icrcs-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Enter ${searchTypes.find(t => t.key === searchType)?.label.toLowerCase()}...`}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all"
                />
              </div>
              <button type="submit" disabled={searching} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy/90 transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-60">
                <SearchIcon className="h-4 w-4" /> {searching ? 'Searching…' : 'Search Records'}
              </button>
            </div>
            {searchError && <p className="mt-3 text-xs text-red-600 font-medium">{searchError}</p>}
          </form>
        </div>
      </div>

      {/* Search Result */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-icrcs-navy/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-icrcs-navy" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{result.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{result.subjectId}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-medium">{result.status}</span>
              </div>
              {result.registrationType && <span className="text-xs text-gray-400">{result.registrationType}</span>}
            </div>

            <div className="p-5 space-y-5">
              {/* Case Status */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Case Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Case Reference</span>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{result.caseRef}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Status</span>
                    <p className="text-sm font-semibold text-gray-900">{result.status}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Final Status</span>
                    <p className="text-sm font-semibold text-gray-900">{result.finalStatus || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Document Type</span>
                    <p className="text-sm font-semibold text-gray-900">{result.documentType || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Date of Birth</span>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" /> {result.dob || '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Gender</span>
                    <p className="text-sm font-semibold text-gray-900">{result.gender}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Nationality</span>
                    <p className="text-sm font-semibold text-gray-900">{result.nationality || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Assessment */}
              {result.assessment && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5"/>Assessment</h4>
                  <div className="p-4 rounded-xl bg-gray-50/60 border border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="font-semibold text-icrcs-navy">{result.assessment.recommendation}</span>
                      {result.assessment.proposedFinalStatus && <span>&middot; Proposed: {result.assessment.proposedFinalStatus}</span>}
                      <span className="ml-auto">{result.assessment.officerName} &middot; {result.assessment.submittedAt ? new Date(result.assessment.submittedAt).toLocaleDateString() : ''}</span>
                    </div>
                    {result.assessment.findings && <p className="text-sm text-gray-700 leading-relaxed">{result.assessment.findings}</p>}
                    {result.assessment.notes && <p className="text-xs text-gray-500">Notes: {result.assessment.notes}</p>}
                    {result.assessment.reason && <p className="text-xs text-gray-500">Reason: {result.assessment.reason}</p>}
                  </div>
                </div>
              )}

              {/* Decision */}
              {result.decision && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><SendHorizontal className="h-3.5 w-3.5"/>Decision</h4>
                  <div className="p-4 rounded-xl bg-gray-50/60 border border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="font-semibold text-icrcs-navy">{result.decision.decision}</span>
                      {result.decision.finalStatus && <span>&middot; {result.decision.finalStatus}</span>}
                      {result.decision.documentType && <span>&middot; {result.decision.documentType}</span>}
                      <span className="ml-auto">{result.decision.officerName} &middot; {result.decision.submittedAt ? new Date(result.decision.submittedAt).toLocaleDateString() : ''}</span>
                    </div>
                    {result.decision.reason && <p className="text-xs text-gray-500">Reason: {result.decision.reason}</p>}
                    {result.decision.notes && <p className="text-xs text-gray-500">Notes: {result.decision.notes}</p>}
                  </div>
                </div>
              )}

              {result.status==='APPROVED'&&(
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800">Status Approved</p>
                    <p className="text-xs text-green-700">Final status: {result.finalStatus || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center mb-4">
            <SearchIcon className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No Record Selected</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Enter search criteria above to retrieve a subject profile, identification details, and determination history.</p>
        </div>
      )}
    </div>
  );
}
