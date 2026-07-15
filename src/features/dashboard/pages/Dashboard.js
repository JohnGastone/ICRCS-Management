import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, AlertTriangle,
  Calendar, Inbox, Fingerprint, ClipboardCheck,
  BarChart3, TrendingUp, Award, CheckCircle, XCircle,
  Activity, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Applications Received', value: '1,248', subtitle: null, icon: Inbox, color: 'bg-gray-100 text-gray-600' },
    { label: 'Pending Assessments', value: '312', subtitle: 'Active review', icon: ClipboardCheck, color: 'bg-blue-50 text-blue-500' },
    { label: 'Decisions Pending Approval', value: '42', subtitle: 'Awaiting decision', icon: Award, color: 'bg-purple-50 text-purple-500' },
    { label: 'Approved Cases', value: '856', subtitle: 'This year', icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Rejected Cases', value: '128', subtitle: 'This year', icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Escalated Cases', value: '14', subtitle: 'Require attention', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
  ];

  const caseData = [
    { name: 'Citizenship', count: 420 },
    { name: 'Resident', count: 310 },
    { name: 'Refugee', count: 180 },
    { name: 'Stateless', count: 120 },
    { name: 'Naturalization', count: 218 },
  ];

  const monthlyApplications = [
    { month: 'Jan', received: 45, approved: 32, rejected: 5 },
    { month: 'Feb', received: 52, approved: 38, rejected: 7 },
    { month: 'Mar', received: 48, approved: 35, rejected: 6 },
    { month: 'Apr', received: 61, approved: 42, rejected: 8 },
    { month: 'May', received: 55, approved: 40, rejected: 9 },
    { month: 'Jun', received: 42, approved: 28, rejected: 4 },
  ];

  const statusData = [
    { name: 'Approved', value: 856, color: '#16A34A' },
    { name: 'Pending', value: 354, color: '#D4AF37' },
    { name: 'Rejected', value: 128, color: '#DC2626' },
  ];

  const recentCases = [
    { ref: 'ISD-2025-001', applicant: 'Amina Hassan', type: 'Citizenship by Descent', status: 'Biometric Pending', date: '2025-06-10' },
    { ref: 'ISD-2025-002', applicant: 'James Otieno', type: 'Resident', status: 'Under Assessment', date: '2025-06-09' },
    { ref: 'ISD-2025-003', applicant: 'Fatma Juma', type: 'Refugee', status: 'Awaiting Documents', date: '2025-06-08' },
    { ref: 'ISD-2025-004', applicant: 'Peter Nyerere', type: 'Citizen by Birth', status: 'Approved', date: '2025-06-07' },
    { ref: 'ISD-2025-005', applicant: 'Grace Mdee', type: 'Stateless Person', status: 'Interview Scheduled', date: '2025-06-06' },
  ];

  const statusBadge = (status) => {
    const map = {
      'Approved': 'bg-green-50 text-green-700 border-green-100',
      'Rejected': 'bg-red-50 text-red-700 border-red-100',
      'Under Assessment': 'bg-blue-50 text-blue-700 border-blue-100',
      'Biometric Pending': 'bg-purple-50 text-purple-700 border-purple-100',
      'Awaiting Documents': 'bg-amber-50 text-amber-700 border-amber-100',
      'Interview Scheduled': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    };
    return map[status] || 'bg-gray-50 text-gray-700 border-gray-100';
  };

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

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className={`h-11 w-11 rounded-xl ${s.color} flex items-center justify-center shrink-0 mt-0.5`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500 mt-0.5 font-medium">{s.label}</div>
                {s.subtitle && (
                  <div className="text-xs text-gray-400 mt-0.5">{s.subtitle}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Case Distribution Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-icrcs-navy" /> Monthly Applications Trend
            </h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyApplications} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                <Line type="monotone" dataKey="received" stroke="#0B1D3A" strokeWidth={2} dot={{ r: 3, fill: '#0B1D3A' }} name="Received" />
                <Line type="monotone" dataKey="approved" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, fill: '#D4AF37' }} name="Approved" />
                <Line type="monotone" dataKey="rejected" stroke="#DC2626" strokeWidth={2} dot={{ r: 3, fill: '#DC2626' }} name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Overview Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-icrcs-navy" /> Status Determination Trends
            </h3>
          </div>
          <div className="h-[120px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={55}
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
              <span className="text-xs text-gray-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-icrcs-gold" />
              <span className="text-xs text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">Rejected</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-icrcs-navy" /> System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">System Health</span>
              </div>
              <span className="text-xs font-bold text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-icrcs-gold" />
                <span className="text-sm text-gray-700">Last Backup</span>
              </div>
              <span className="text-xs text-gray-500">Today, 02:00 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700">Active Sessions</span>
              </div>
              <span className="text-xs text-gray-500">1 Officer</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-sm text-gray-700">Storage Used</span>
              </div>
              <span className="text-xs text-gray-500">42% (8.4 GB)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-icrcs-navy" /> Recent Cases
            </h3>
            <Link to="/internal/enquiries" className="text-xs text-icrcs-navy font-semibold hover:text-icrcs-gold transition-colors flex items-center gap-1">
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
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusBadge(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column Widgets */}
        <div className="space-y-5">
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
              <Link to="/internal/escalation" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
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
      </div>
    </div>
  );
}
