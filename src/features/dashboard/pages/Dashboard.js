import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, AlertTriangle,
  Calendar, Inbox, Fingerprint, ClipboardCheck,
  BarChart3, TrendingUp, Award, CheckCircle, XCircle,
  Activity, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getEnrollmentQueue, getAssessmentQueue, getApprovalQueue } from '../../../services/managementService';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

const STATUS_LABELS = { PENDING_ASSESSMENT: 'Pending Assessment', UNDER_ASSESSMENT: 'Under Assessment', ASSESSMENT_COMPLETE: 'Pending Approval', APPROVED: 'Approved', REJECTED: 'Rejected', ESCALATED: 'Escalated' };
const statusLabel = s => STATUS_LABELS[s] || s;

const statusBadge = (status) => {
  const map = {
    APPROVED: 'bg-green-50 text-green-700 border-green-100',
    REJECTED: 'bg-red-50 text-red-700 border-red-100',
    ESCALATED: 'bg-purple-50 text-purple-700 border-purple-100',
    ASSESSMENT_COMPLETE: 'bg-amber-50 text-amber-700 border-amber-100',
    UNDER_ASSESSMENT: 'bg-blue-50 text-blue-700 border-blue-100',
    PENDING_ASSESSMENT: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return map[status] || 'bg-gray-50 text-gray-700 border-gray-100';
};

const countOf = data => data?.totalElements ?? 0;

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [counts, setCounts] = useState({ pendingEnrollment: 0, pendingAssessment: 0, pendingApproval: 0, approved: 0, rejected: 0, escalated: 0 });
  const [recentCases, setRecentCases] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const [enrollment, pendingAssess, underAssess, assessComplete, approved, rejected, escalated, recent] = await Promise.all([
        getEnrollmentQueue({ page: 0, size: 1 }),
        getAssessmentQueue({ page: 0, size: 1, status: 'PENDING_ASSESSMENT' }),
        getAssessmentQueue({ page: 0, size: 1, status: 'UNDER_ASSESSMENT' }),
        getApprovalQueue({ page: 0, size: 1, status: 'ASSESSMENT_COMPLETE' }),
        getApprovalQueue({ page: 0, size: 1, status: 'APPROVED' }),
        getApprovalQueue({ page: 0, size: 1, status: 'REJECTED' }),
        getApprovalQueue({ page: 0, size: 1, status: 'ESCALATED' }),
        getApprovalQueue({ page: 0, size: 5 }),
      ]);
      setCounts({
        pendingEnrollment: countOf(enrollment),
        pendingAssessment: countOf(pendingAssess) + countOf(underAssess),
        pendingApproval: countOf(assessComplete),
        approved: countOf(approved),
        rejected: countOf(rejected),
        escalated: countOf(escalated),
      });
      setRecentCases((recent?.items || []).map(c => ({
        ref: c.caseNo,
        applicant: c.fullName || c.subjectId,
        type: c.registrationType || '—',
        status: c.status,
        date: (c.assignedDate || c.createdAt) ? new Date(c.assignedDate || c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      })));
    } catch (e) {
      setStatsError(e.message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const stats = [
    { label: 'Pending Enrollment', value: counts.pendingEnrollment, icon: Inbox, color: 'bg-gray-100 text-gray-600' },
    { label: 'Pending Assessment', value: counts.pendingAssessment, icon: ClipboardCheck, color: 'bg-blue-50 text-blue-500' },
    { label: 'Pending Approval', value: counts.pendingApproval, icon: Award, color: 'bg-purple-50 text-purple-500' },
    { label: 'Approved Cases', value: counts.approved, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Rejected Cases', value: counts.rejected, icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Escalated Cases', value: counts.escalated, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
  ];

  const pendingTotal = counts.pendingEnrollment + counts.pendingAssessment + counts.pendingApproval + counts.escalated;
  const statusData = [
    { name: 'Approved', value: counts.approved, color: '#16A34A' },
    { name: 'Pending', value: pendingTotal, color: '#D4AF37' },
    { name: 'Rejected', value: counts.rejected, color: '#DC2626' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome Banner */}
      <div className="bg-icrcs-navy rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.02] rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Welcome back, {user?.name || 'Officer'}</h1>
            <p className="text-white/70 text-sm mt-1">Manage and monitor ICRCS immigration status determination activities</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 shrink-0">
            <Calendar className="h-4 w-4 text-icrcs-gold" />
            <span className="text-sm font-medium">{today}</span>
          </div>
        </div>
      </div>

      {statsError && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-700">{statsError}</div>}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className={`h-11 w-11 rounded-xl ${s.color} flex items-center justify-center shrink-0 mt-0.5`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-gray-900">{loadingStats ? '—' : s.value}</div>
                <div className="text-sm text-gray-500 mt-0.5 font-medium">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Overview Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-icrcs-navy" /> Status Overview
            </h3>
          </div>
          <div className="h-[160px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <span className="text-xs text-gray-600">Approved ({counts.approved})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-icrcs-gold" />
              <span className="text-xs text-gray-600">Pending ({pendingTotal})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">Rejected ({counts.rejected})</span>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-icrcs-navy" /> Quick Access
          </h3>
          <div className="space-y-2">
            <Link to="/internal/biometric" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-icrcs-navy/10 text-icrcs-navy flex items-center justify-center">
                <Fingerprint className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Start Biometric Enrollment</p>
                <p className="text-[11px] text-gray-500">Capture fingerprints and photos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
            <Link to="/internal/assessment" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Begin Assessment</p>
                <p className="text-[11px] text-gray-500">Review and assess applications</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
            <Link to="/internal/approve-decision" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Review Decisions</p>
                <p className="text-[11px] text-gray-500">Approve or reject assessments</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
            <Link to="/internal/escalate-case" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Open Escalation Cases</p>
                <p className="text-[11px] text-gray-500">High-risk and complex cases</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
            <Link to="/internal/reports" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Generate Reports</p>
                <p className="text-[11px] text-gray-500">Operational and management reports</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Cases Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-icrcs-navy" /> Recent Cases
          </h3>
          <Link to="/internal/approve-decision" className="text-xs text-icrcs-navy font-semibold hover:text-icrcs-gold transition-colors flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Reference</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Applicant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wider hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCases.map((c) => (
                <tr key={c.ref} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.ref}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{c.applicant}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">{c.type}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusBadge(c.status)}`}>{statusLabel(c.status)}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{c.date}</td>
                </tr>
              ))}
              {recentCases.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">{loadingStats ? 'Loading...' : 'No recent cases.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
