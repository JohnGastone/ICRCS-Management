import React, { useState } from 'react';
import {
  AlertTriangle, ShieldAlert, Search, User, Calendar,
  ArrowLeft, CheckCircle, MessageSquare, Eye, Clock,
  ChevronRight, Flag
} from 'lucide-react';

const cases = [
  {
    ref: 'ISD-2026-042',
    applicant: 'Michele Oduor',
    type: 'Citizen by Descent',
    escalatedBy: 'Grace Temu',
    date: '2026-06-08',
    reason: 'Complex identity verification',
    status: 'open',
    priority: 'high',
    details: 'Applicant claims dual parentage but birth records from Kenya are inconsistent. Requires cross-border verification with Kenyan immigration authorities.',
    history: [
      { date: '2026-06-08', action: 'Case escalated by assessor', officer: 'Grace Temu', note: 'Identity documents appear conflicting. Recommend specialist review.' },
      { date: '2026-06-05', action: 'Assessment initiated', officer: 'Grace Temu', note: '' },
    ]
  },
  {
    ref: 'ISD-2026-055',
    applicant: 'Abdi Hassan',
    type: 'Refugee',
    escalatedBy: 'James Otieno',
    date: '2026-06-06',
    reason: 'Fraud suspicion',
    status: 'open',
    priority: 'urgent',
    details: 'Biometric facial recognition flagged a 94% match with an individual previously deported under a different identity. Requires security clearance review.',
    history: [
      { date: '2026-06-06', action: 'Case escalated - fraud alert', officer: 'James Otieno', note: 'Facial match with deportee record. Urgent verification required.' },
    ]
  },
  {
    ref: 'ISD-2026-031',
    applicant: 'Lina Mbaruku',
    type: 'Resident',
    escalatedBy: 'Grace Temu',
    date: '2026-06-01',
    reason: 'Incomplete supporting evidence',
    status: 'resolved',
    priority: 'normal',
    details: 'Employment contract provided by applicant could not be verified with the listed employer. Additional evidence requested and subsequently provided.',
    history: [
      { date: '2026-06-10', action: 'Resolved - evidence accepted', officer: 'Dr. Ramadhani', note: 'New employment verification received from HR department.' },
      { date: '2026-06-01', action: 'Case escalated', officer: 'Grace Temu', note: 'Employment contract unverifiable.' },
    ]
  },
];

const reasonColors = {
  'Complex identity verification': 'bg-purple-50 text-purple-700 border-purple-100',
  'Fraud suspicion': 'bg-red-50 text-red-700 border-red-100',
  'Incomplete supporting evidence': 'bg-amber-50 text-amber-700 border-amber-100',
  'National security concerns': 'bg-orange-50 text-orange-700 border-orange-100',
  'Legal clarification required': 'bg-blue-50 text-blue-700 border-blue-100',
};

export default function EscalationCases() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionNote, setActionNote] = useState('');

  const filtered = cases.filter((c) => {
    const matchesSearch = c.applicant.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escalation Cases</h1>
          <p className="text-sm text-gray-500 mt-1">Manage exceptional and high-risk applications requiring special review</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">{cases.filter(c => c.status === 'open').length} Open Cases</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by applicant or reference..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'open', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border ${filter === f ? 'bg-icrcs-navy text-white border-icrcs-navy' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Case List */}
        <div className="lg:col-span-1 space-y-3">
          {filtered.map((c) => (
            <button
              key={c.ref}
              onClick={() => { setSelected(c); setActionNote(''); }}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.ref === c.ref ? 'border-icrcs-navy bg-icrcs-navy/5 shadow-sm' : 'border-gray-100 bg-white hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] font-mono text-gray-500">{c.ref}</span>
                <span className={`text-[0.625rem] px-2 py-0.5 rounded-full border font-medium ${c.status === 'open' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                  {c.status}
                </span>
              </div>
              <p className="font-semibold text-gray-800 text-sm mt-1">{c.applicant}</p>
              <p className="text-xs text-gray-500">{c.type}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[0.625rem] px-1.5 py-0.5 rounded border ${reasonColors[c.reason] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>{c.reason}</span>
                <span className={`text-[0.625rem] px-1.5 py-0.5 rounded border ${c.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-100' : c.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{c.priority}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Case Detail Panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">{selected.applicant}</h3>
                    <p className="text-xs text-gray-500 font-mono">{selected.ref} &bull; {selected.type}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${selected.status === 'open' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                  {selected.status === 'open' ? 'Open Escalation' : 'Resolved'}
                </span>
              </div>

              {/* Escalation Details */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 block">Escalation Reason</span>
                  <span className="font-medium text-gray-800">{selected.reason}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 block">Escalated By</span>
                  <span className="font-medium text-gray-800">{selected.escalatedBy}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 block">Escalation Date</span>
                  <span className="font-medium text-gray-800">{selected.date}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 block">Priority</span>
                  <span className="font-medium text-gray-800 capitalize">{selected.priority}</span>
                </div>
              </div>

              {/* Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-icrcs-navy" /> Case Details
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed p-4 rounded-xl bg-gray-50 border border-gray-100">{selected.details}</p>
              </div>

              {/* History */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-icrcs-navy" /> Escalation History
                </h4>
                <div className="space-y-3">
                  {selected.history.map((h, i) => (
                    <div key={i} className="relative pl-4 border-l-2 border-gray-100">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-icrcs-navy" />
                      <p className="text-xs text-gray-500">{h.date} &bull; {h.officer}</p>
                      <p className="text-sm font-medium text-gray-800">{h.action}</p>
                      {h.note && <p className="text-xs text-gray-400 mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selected.status === 'open' && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-icrcs-navy" /> Action Note
                    </h4>
                    <textarea
                      rows={3}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Record your review findings, additional investigation notes, or resolution remarks..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Return to Assessment
                    </button>
                    <button className="px-5 py-2.5 rounded-xl border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-50 transition-colors flex items-center gap-2">
                      <Flag className="h-4 w-4" /> Request Investigation
                    </button>
                    <button className="px-5 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Resolve Escalation
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-gray-100 items-center justify-center mb-3">
                <ShieldAlert className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Select an escalation case to review details and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
