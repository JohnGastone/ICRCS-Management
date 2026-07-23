import React, { useState, useEffect } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import ApplicantInfoView from './ApplicantInfoView';
import { getApplicantReview } from '../../services/managementService';

// Fetches the full applicant review for a case and renders it in the shared
// tabbed ApplicantInfoView, handling loading/error states. Used wherever a
// case's applicant profile is previewed.
export default function ApplicantReviewLoader({ caseNo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!caseNo) return;
    let cancelled = false;
    setData(null); setError(''); setLoading(true);
    getApplicantReview(caseNo)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load applicant data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseNo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading applicant details…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
        <span className="text-sm font-medium text-red-700">{error}</span>
      </div>
    );
  }
  return <ApplicantInfoView data={data} />;
}
