import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, TrendingUp, Users, ArrowUpRight, PieChart as PieChartIcon,
  Download, CheckCircle, XCircle, AlertTriangle,
  Activity, Search, Filter, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import coatPng from '../../../assets/images/coat.png';
import uhamiajiPng from '../../../assets/images/uhamiaji.png';
import { getEnrollmentQueue, getAssessmentQueue, getApprovalQueue } from '../../../services/managementService';

const STATUS_LABELS = { PENDING_ENROLLMENT: 'Pending Enrollment', PENDING_ASSESSMENT: 'Pending Assessment', UNDER_ASSESSMENT: 'Under Assessment', ASSESSMENT_COMPLETE: 'Pending Approval', APPROVED: 'Approved', REJECTED: 'Rejected', ESCALATED: 'Escalated' };
const REPORT_SIZE = 200;

const reportList = [
  { id: 'status', title: 'Applications by Status', description: 'Live snapshot of case counts across every status in the pipeline, right now.', icon: Activity, color: 'bg-amber-50 text-amber-700 border-amber-100', chart: 'pie' },
  { id: 'approved', title: 'Approved Applications', description: 'All cases currently in Approved status, with assigned officer and date.', icon: CheckCircle, color: 'bg-green-50 text-green-700 border-green-100', chart: 'list' },
  { id: 'rejected', title: 'Rejected Applications', description: 'All cases currently in Rejected status, with assigned officer and date.', icon: XCircle, color: 'bg-red-50 text-red-700 border-red-100', chart: 'list' },
  { id: 'pending-assessment', title: 'Pending Assessments', description: 'Current assessment queue with real aging (days pending) and priority.', icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 border-orange-100', chart: 'list' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysSince = (d) => d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : null;

async function fetchReportData(reportId) {
  if (reportId === 'status') {
    const [enrollment, pendingAssess, underAssess, assessComplete, approved, rejected, escalated] = await Promise.all([
      getEnrollmentQueue({ page: 0, size: 1 }),
      getAssessmentQueue({ page: 0, size: 1, status: 'PENDING_ASSESSMENT' }),
      getAssessmentQueue({ page: 0, size: 1, status: 'UNDER_ASSESSMENT' }),
      getApprovalQueue({ page: 0, size: 1, status: 'ASSESSMENT_COMPLETE' }),
      getApprovalQueue({ page: 0, size: 1, status: 'APPROVED' }),
      getApprovalQueue({ page: 0, size: 1, status: 'REJECTED' }),
      getApprovalQueue({ page: 0, size: 1, status: 'ESCALATED' }),
    ]);
    const counts = {
      PENDING_ENROLLMENT: enrollment?.totalElements ?? 0,
      PENDING_ASSESSMENT: pendingAssess?.totalElements ?? 0,
      UNDER_ASSESSMENT: underAssess?.totalElements ?? 0,
      ASSESSMENT_COMPLETE: assessComplete?.totalElements ?? 0,
      APPROVED: approved?.totalElements ?? 0,
      REJECTED: rejected?.totalElements ?? 0,
      ESCALATED: escalated?.totalElements ?? 0,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const rows = Object.entries(counts).map(([k, v]) => [STATUS_LABELS[k], v, total ? `${((v / total) * 100).toFixed(1)}%` : '0.0%']);
    return {
      summary: [
        { label: 'Total Cases', value: total },
        { label: 'Approved', value: counts.APPROVED },
        { label: 'Rejected', value: counts.REJECTED },
      ],
      columns: ['Status', 'Count', 'Percentage'],
      rows,
      pieData: [
        { name: 'Approved', value: counts.APPROVED, color: '#16A34A' },
        { name: 'Pending', value: counts.PENDING_ENROLLMENT + counts.PENDING_ASSESSMENT + counts.UNDER_ASSESSMENT + counts.ASSESSMENT_COMPLETE + counts.ESCALATED, color: '#D4AF37' },
        { name: 'Rejected', value: counts.REJECTED, color: '#DC2626' },
      ],
    };
  }

  if (reportId === 'approved' || reportId === 'rejected') {
    const status = reportId === 'approved' ? 'APPROVED' : 'REJECTED';
    const data = await getApprovalQueue({ page: 0, size: REPORT_SIZE, status });
    const items = data?.items || [];
    return {
      summary: [
        { label: `Total ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`, value: data?.totalElements ?? items.length },
      ],
      columns: ['Case No.', 'Applicant', 'Nationality', 'Registration Type', 'Officer', 'Date'],
      rows: items.map(c => [c.caseNo, c.fullName || c.subjectId, c.nationalityCode || '—', c.registrationType || '—', c.assignedOfficerName || '—', formatDate(c.assignedDate || c.createdAt)]),
    };
  }

  if (reportId === 'pending-assessment') {
    const [pending, under] = await Promise.all([
      getAssessmentQueue({ page: 0, size: REPORT_SIZE, status: 'PENDING_ASSESSMENT' }),
      getAssessmentQueue({ page: 0, size: REPORT_SIZE, status: 'UNDER_ASSESSMENT' }),
    ]);
    const items = [...(pending?.items || []), ...(under?.items || [])];
    const total = (pending?.totalElements ?? 0) + (under?.totalElements ?? 0);
    const overThreshold = items.filter(c => (daysSince(c.assignedDate || c.createdAt) ?? 0) >= 14).length;
    return {
      summary: [
        { label: 'Total Pending', value: total },
        { label: 'Over 14 Days', value: overThreshold },
        { label: 'High Priority', value: items.filter(c => c.priority === 'HIGH').length },
      ],
      columns: ['Case No.', 'Applicant', 'Status', 'Days Pending', 'Priority', 'Assigned Officer'],
      rows: items.map(c => {
        const d = daysSince(c.assignedDate || c.createdAt);
        return [c.caseNo, c.fullName || c.subjectId, STATUS_LABELS[c.status] || c.status, d === null ? '—' : String(d), c.priority || '—', c.assignedOfficerName || '—'];
      }),
    };
  }

  return { summary: [], columns: [], rows: [] };
}

export default function Reports() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [downloadFormat, setDownloadFormat] = useState('csv');
  const rowsPerPage = 5;

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchReportData('status');
      setSummaryData(data);
    } catch (e) {
      setSummaryData(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleGenerateReport = async (reportId) => {
    setGenerating(true);
    setGenerateError('');
    try {
      const data = await fetchReportData(reportId);
      setGeneratedReport({ reportId, data });
      setReportPage(1);
    } catch (e) {
      setGenerateError(e.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const getBase64Image = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const downloadReport = async (reportTitle, data, format) => {
    const safeTitle = reportTitle.replace(/\s+/g, '_');
    if (format === 'csv') {
      const header = data.columns.join(',');
      const rows = data.rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const csvContent = `﻿${header}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}_Report.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      const wsData = [data.columns, ...data.rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${safeTitle}_Report.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });

      const coatBase64 = await getBase64Image(coatPng);
      const uhamiajiBase64 = await getBase64Image(uhamiajiPng);

      if (coatBase64) doc.addImage(coatBase64, 'PNG', 18, 8, 22, 22);
      if (uhamiajiBase64) doc.addImage(uhamiajiBase64, 'PNG', 257, 8, 22, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('THE UNITED REPUBLIC OF TANZANIA', 148.5, 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Ministry of home Affairs', 148.5, 20, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('IMMIGRATION SERVICES DEPARTMENT', 148.5, 26, { align: 'center' });

      doc.setDrawColor(0, 91, 172);
      doc.setLineWidth(0.5);
      doc.line(18, 32, 279, 32);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle.toUpperCase(), 148.5, 40, { align: 'center' });

      autoTable(doc, {
        head: [data.columns],
        body: data.rows,
        startY: 46,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [11, 29, 58], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      doc.save(`${safeTitle}_Report.pdf`);
    }
  };

  const filteredReports = reportList.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || r.chart === filter;
    return matchesSearch && matchesFilter;
  });

  const totalCases = summaryData?.summary?.find(s => s.label === 'Total Cases')?.value ?? '—';
  const approvedCount = summaryData?.summary?.find(s => s.label === 'Approved')?.value ?? '—';
  const rejectedCount = summaryData?.summary?.find(s => s.label === 'Rejected')?.value ?? '—';
  const approvalRate = (typeof totalCases === 'number' && totalCases > 0 && typeof approvedCount === 'number')
    ? `${((approvedCount / totalCases) * 100).toFixed(0)}%` : '—';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Live operational reports for status determination</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-xs font-semibold border border-icrcs-navy/20">{reportList.length} Available Reports</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: loadingSummary ? '—' : totalCases, icon: FileText, color: 'bg-gray-100 text-gray-600' },
          { label: 'Approval Rate', value: loadingSummary ? '—' : approvalRate, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Approved', value: loadingSummary ? '—' : approvedCount, icon: CheckCircle, color: 'bg-blue-50 text-blue-600' },
          { label: 'Rejected', value: loadingSummary ? '—' : rejectedCount, icon: Users, color: 'bg-red-50 text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status Distribution Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-icrcs-navy" /> Status Distribution
          </h3>
          <ArrowUpRight className="h-4 w-4 text-gray-400" />
        </div>
        <div className="h-60">
          {summaryData?.pieData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summaryData.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label>
                  {summaryData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">{loadingSummary ? 'Loading...' : 'No data available.'}</div>
          )}
        </div>
      </div>

      {/* Report List Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setReportsExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-icrcs-navy/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-icrcs-navy" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-gray-900">Available Reports</h2>
              <p className="text-xs text-gray-500">{filteredReports.length} reports</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${reportsExpanded ? 'rotate-180' : ''}`} />
        </button>

        {reportsExpanded && (
          <div className="border-t border-gray-100 space-y-3 px-5 pb-5 pt-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy w-48 transition-all" />
                </div>
                <div className="relative">
                  <Filter className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={filter} onChange={e => setFilter(e.target.value)} className="appearance-none pl-8 pr-6 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer">
                    <option value="All">All Types</option>
                    <option value="pie">Pie Chart</option>
                    <option value="list">Case List</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 font-semibold text-gray-500 text-sm">Report</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-sm hidden lg:table-cell">Description</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-sm hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <React.Fragment key={report.id}>
                      <tr onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)} className="hover:bg-gray-50/40 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg ${report.color} flex items-center justify-center shrink-0 border`}>
                              <report.icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{report.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">{report.description}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-600 border-gray-200 capitalize">{report.chart === 'pie' ? 'Pie Chart' : 'Case List'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                        </td>
                      </tr>
                      {selectedReport === report.id && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 bg-gray-50/60 border-t border-gray-100">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-700">Generate a live report — reflects current data, not a historical snapshot</p>
                                <button onClick={() => setSelectedReport(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Close</button>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button onClick={() => { setGeneratedReport(null); setGenerateError(''); }} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Reset</button>
                                <button onClick={() => handleGenerateReport(report.id)} disabled={generating} className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy/90 transition-colors disabled:opacity-60">{generating ? 'Generating…' : 'Generate Report'}</button>
                              </div>

                              {generateError && <p className="text-xs text-red-600">{generateError}</p>}

                              {generatedReport && generatedReport.reportId === report.id && (
                                <div className="mt-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">{report.title}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">Generated {new Date().toLocaleString('en-GB')}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <select value={downloadFormat} onChange={e => setDownloadFormat(e.target.value)} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none cursor-pointer">
                                        <option value="csv">CSV</option>
                                        <option value="excel">Excel</option>
                                        <option value="pdf">PDF</option>
                                      </select>
                                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title={`Download ${downloadFormat.toUpperCase()}`} onClick={() => downloadReport(report.title, generatedReport.data, downloadFormat)}>
                                        <Download className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="px-4 py-3">
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                      {generatedReport.data.summary.map((s, i) => (
                                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-center">
                                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
                                          <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
                                        </div>
                                      ))}
                                    </div>
                                    {generatedReport.data.rows.length === 0 ? (
                                      <p className="text-xs text-gray-400 text-center py-4">No cases found for this report.</p>
                                    ) : (
                                      <>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-gray-100">
                                                {generatedReport.data.columns.map((col, i) => (
                                                  <th key={i} className="px-2 py-2 font-semibold text-gray-500 whitespace-nowrap">{col}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                              {generatedReport.data.rows.slice((reportPage - 1) * rowsPerPage, reportPage * rowsPerPage).map((row, ri) => (
                                                <tr key={ri} className="hover:bg-gray-50/30">
                                                  {row.map((cell, ci) => (
                                                    <td key={ci} className="px-2 py-2 text-gray-700 whitespace-nowrap">{cell}</td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                        {generatedReport.data.rows.length > rowsPerPage && (
                                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                                            <span className="text-[10px] text-gray-400">Showing {Math.min((reportPage - 1) * rowsPerPage + 1, generatedReport.data.rows.length)}-{Math.min(reportPage * rowsPerPage, generatedReport.data.rows.length)} of {generatedReport.data.rows.length}</span>
                                            <div className="flex items-center gap-1">
                                              <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={reportPage === 1} className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                              </button>
                                              <span className="text-xs font-medium text-gray-700 px-2">{reportPage} / {Math.ceil(generatedReport.data.rows.length / rowsPerPage)}</span>
                                              <button onClick={() => setReportPage(p => Math.min(Math.ceil(generatedReport.data.rows.length / rowsPerPage), p + 1))} disabled={reportPage >= Math.ceil(generatedReport.data.rows.length / rowsPerPage)} className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-6 w-6 text-gray-300" />
                          <span>No reports match your search criteria.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
