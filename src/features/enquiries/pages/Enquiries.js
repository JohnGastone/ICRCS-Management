import React, { useState } from 'react';
import {
  Search, Fingerprint, User, Calendar, BadgeCheck, SearchIcon,
  Mail, Phone, MapPin, ChevronRight, MessageSquare, X, FileText, ClipboardCheck, Check, Minus
} from 'lucide-react';
import { getCaseBySubject } from '../../../services/managementService';

export default function Enquiries() {
  const [searchType, setSearchType] = useState('subject_id');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

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

  const sectionTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents' },
    { key: 'checked', label: 'Checked Items' },
    { key: 'comments', label: "Officer's Comments" },
  ];

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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Determined on {result.dateDetermined}</span>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="px-5 border-b border-gray-100">
              <div className="flex items-center gap-1 -mb-px">
                {sectionTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSection(tab.key)}
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeSection === tab.key
                        ? 'border-icrcs-navy text-icrcs-navy'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeSection === 'overview' && (
                <div className="space-y-5">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Date of Birth</span>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" /> {result.dob}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Gender</span>
                        <p className="text-sm font-semibold text-gray-900">{result.gender}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Nationality</span>
                        <p className="text-sm font-semibold text-gray-900">{result.nationality}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Case Reference</span>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{result.caseRef}</p>
                      </div>
                    </div>
                  </div>

                  {/* Identification */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Identification</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Fingerprint No.</span>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Fingerprint className="h-3.5 w-3.5 text-gray-400" /> {result.fingerprintNo}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">National ID (NIN)</span>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{result.nin}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Passport No.</span>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{result.passportNo}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Email</span>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> {result.email}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Phone</span>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" /> {result.phone}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Address</span>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" /> {result.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Banner */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Status Verified</p>
                      <p className="text-xs text-green-700">Biometric verification passed. Determination recorded on {result.dateDetermined} by Dr. Ramadhani.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'documents' && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Document Type</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Reference Number</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-500 text-xs text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.documents.map((doc, i) => (
                        <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{doc.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">{doc.ref}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-green-50 text-green-600 border-green-100">{doc.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              className="text-xs text-icrcs-navy font-medium hover:underline flex items-center gap-0.5 justify-end ml-auto"
                              onClick={() => { setSelectedDoc(doc); setDocModalOpen(true); }}
                            >
                              View <ChevronRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'comments' && (
                <div className="space-y-4">
                  {result.comments.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl bg-gray-50/60 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-icrcs-navy/10 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-icrcs-navy" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{c.officer}</p>
                          <p className="text-[0.625rem] text-gray-500">{c.role} &middot; {c.date}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'checked' && (
                <div className="space-y-6">
                  {/* Assessor Checked Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Assessor Checked Items</h4>
                        <p className="text-[0.625rem] text-gray-500">Grace Temu &middot; Assessment Officer</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/60">
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs w-10">#</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Check Item</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Status</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Date</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {result.checkedItems.assessor.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{item.label}</td>
                              <td className="px-4 py-2.5">
                                {item.status === 'checked' ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-green-50 text-green-600 border-green-100">
                                    <Check className="h-3 w-3" /> Checked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-500 border-gray-200">
                                    <Minus className="h-3 w-3" /> N/A
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{item.date}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{item.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Approver Checked Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Approver Checked Items</h4>
                        <p className="text-[0.625rem] text-gray-500">Dr. Ramadhani &middot; Senior Approver</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/60">
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs w-10">#</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Check Item</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Status</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Date</th>
                            <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {result.checkedItems.approver.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{item.label}</td>
                              <td className="px-4 py-2.5">
                                {item.status === 'checked' ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-green-50 text-green-600 border-green-100">
                                    <Check className="h-3 w-3" /> Checked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-500 border-gray-200">
                                    <Minus className="h-3 w-3" /> N/A
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{item.date}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{item.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {docModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-icrcs-navy/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-icrcs-navy" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedDoc.type}</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedDoc.ref}</p>
                </div>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Attachment Preview Placeholder */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Document Attachment</p>
                  <p className="text-xs text-gray-400 mt-1">Preview not available. Scanned copy stored in physical archive.</p>
                </div>
                <span className="text-[0.625rem] px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 font-medium">{selectedDoc.status}</span>
              </div>
              {/* Document Details */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Document Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Reference Number</span>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{selectedDoc.ref}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Status</span>
                    <p className="text-sm font-semibold text-gray-900">{selectedDoc.status}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Date Issued</span>
                    <p className="text-sm font-semibold text-gray-900">{selectedDoc.issued}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                    <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Place of Issue</span>
                    <p className="text-sm font-semibold text-gray-900">{selectedDoc.place}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100 sm:col-span-2">
                    <span className="text-[0.625rem] text-gray-500 uppercase tracking-wide block mb-1">Verified By</span>
                    <p className="text-sm font-semibold text-gray-900">{selectedDoc.officer}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setDocModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 rounded-lg bg-icrcs-navy text-white text-xs font-semibold hover:bg-icrcs-navy/90 transition-colors">
                Download Copy
              </button>
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
