import React, { useState } from 'react';
import {
  BarChart3, FileText, TrendingUp, Users, Clock, MapPin, ArrowUpRight, PieChart as PieChartIcon,
  Download, Inbox, CheckCircle, XCircle, AlertTriangle, Fingerprint, UserCheck,
  Globe, Activity, Search, Filter, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import coatPng from '../../../assets/images/coat.png';
import uhamiajiPng from '../../../assets/images/uhamiaji.png';

const statusData = [
  { name: 'Pending', value: 89, color: '#D97706' },
  { name: 'Approved', value: 64, color: '#005BAC' },
  { name: 'Rejected', value: 8, color: '#DC2626' },
  { name: 'Biometric', value: 34, color: '#0F766E' },
];

const monthlyData = [
  { month: 'Jan', applications: 45, approved: 32 },
  { month: 'Feb', applications: 52, approved: 38 },
  { month: 'Mar', applications: 48, approved: 35 },
  { month: 'Apr', applications: 61, approved: 42 },
  { month: 'May', applications: 55, approved: 40 },
  { month: 'Jun', applications: 42, approved: 28 },
];

const typeData = [
  { name: 'Citizenship', count: 120 },
  { name: 'Residence', count: 85 },
  { name: 'Refugee', count: 45 },
  { name: 'Visitor', count: 67 },
  { name: 'Stateless', count: 23 },
];

const regionData = [
  { region: 'Dar es Salaam', count: 245 },
  { region: 'Arusha', count: 112 },
  { region: 'Mwanza', count: 89 },
  { region: 'Dodoma', count: 56 },
  { region: 'Zanzibar', count: 78 },
];

const reportList = [
  { id: 1, title: 'Applications Received', description: 'Total applications received within a selected period with daily, weekly and monthly breakdowns.', icon: Inbox, color: 'bg-sky-50 text-sky-700 border-sky-100', chart: 'bar' },
  { id: 2, title: 'Applications by Status', description: 'Distribution of applications across all statuses including pending, approved, rejected and escalated.', icon: Activity, color: 'bg-amber-50 text-amber-700 border-amber-100', chart: 'pie' },
  { id: 3, title: 'Approved Applications', description: 'Summary and detailed list of all approved applications with officer and date filters.', icon: CheckCircle, color: 'bg-green-50 text-green-700 border-green-100', chart: 'bar' },
  { id: 4, title: 'Rejected Applications', description: 'Rejection statistics with reasons, trends and officer performance on rejection decisions.', icon: XCircle, color: 'bg-red-50 text-red-700 border-red-100', chart: 'bar' },
  { id: 5, title: 'Pending Assessments', description: 'Current queue of pending assessments with aging analysis and priority breakdown.', icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 border-orange-100', chart: 'line' },
  { id: 6, title: 'Processing Turnaround Times', description: 'Average processing time from receipt to final determination across all application stages.', icon: Clock, color: 'bg-purple-50 text-purple-700 border-purple-100', chart: 'line' },
  { id: 7, title: 'Biometric Enrollment Statistics', description: 'Enrollment completion rates, failure rates and scanner utilization metrics.', icon: Fingerprint, color: 'bg-teal-50 text-teal-700 border-teal-100', chart: 'bar' },
  { id: 8, title: 'Officer Workload & Productivity', description: 'Case allocation, completion rates and productivity metrics per officer.', icon: UserCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-100', chart: 'bar' },
  { id: 9, title: 'Regional Distribution of Applications', description: 'Geographic distribution of applications received by region and district.', icon: Globe, color: 'bg-cyan-50 text-cyan-700 border-cyan-100', chart: 'line' },
  { id: 10, title: 'Status Determination Trends', description: 'Monthly and quarterly trends of status determinations by category and outcome.', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', chart: 'line' },
];

function generateDummyReportData(reportId, period) {
  const labels = {
    daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekly: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
    monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    annual: ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    custom: ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Period 8', 'Period 9', 'Period 10'],
  };
  const cols = labels[period] || labels.monthly;

  switch (reportId) {
    case 1: // Applications Received
      return {
        summary: [
          { label: 'Total Received', value: '1,245' },
          { label: 'Average / ' + (period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Year'), value: period === 'daily' ? '178' : period === 'weekly' ? '311' : period === 'monthly' ? '208' : '311' },
          { label: 'Peak Period', value: cols[2] },
        ],
        columns: ['Period', 'New Applications', 'In Progress', 'Completed'],
        rows: cols.map((c, i) => [c, 120 + i * 15, 45 + i * 8, 30 + i * 5]),
      };
    case 2: // Applications by Status
      return {
        summary: [
          { label: 'Total Tracked', value: '1,245' },
          { label: 'Most Common', value: 'Pending' },
          { label: 'Change', value: '+4.2%' },
        ],
        columns: ['Status', 'Count', 'Percentage'],
        rows: [
          ['Pending', 452, '36.3%'],
          ['Approved', 384, '30.8%'],
          ['Rejected', 124, '10.0%'],
          ['Biometric', 198, '15.9%'],
          ['Escalated', 87, '7.0%'],
          ['Under Review', 56, '4.5%'],
          ['On Hold', 34, '2.7%'],
          ['Returned', 28, '2.2%'],
          ['Transferred', 19, '1.5%'],
          ['Withdrawn', 12, '1.0%'],
          ['Archived', 8, '0.6%'],
          ['Draft', 5, '0.4%'],
          ['Closed', 3, '0.2%'],
        ],
      };
    case 3: // Approved Applications
      return {
        summary: [
          { label: 'Total Approved', value: '384' },
          { label: 'Approval Rate', value: '68%' },
          { label: 'Avg. Time', value: '8 days' },
        ],
        columns: ['Application ID', 'Applicant', 'Date Approved', 'Officer', 'Status'],
        rows: [
          ['APP-2026-001', 'John Mwamba', '10-Jun-2026', 'Officer A', 'Citizenship'],
          ['APP-2026-018', 'Grace Ochieng', '09-Jun-2026', 'Officer B', 'Residence'],
          ['APP-2026-023', 'Peter Nyerere', '08-Jun-2026', 'Officer A', 'Citizenship'],
          ['APP-2026-031', 'Amina Hassan', '07-Jun-2026', 'Officer C', 'Visitor'],
          ['APP-2026-045', 'David Kimaro', '06-Jun-2026', 'Officer B', 'Refugee'],
          ['APP-2026-052', 'Fatima Juma', '05-Jun-2026', 'Officer D', 'Stateless'],
          ['APP-2026-061', 'Michael Lwanga', '04-Jun-2026', 'Officer A', 'Residence'],
          ['APP-2026-078', 'Sarah Mushi', '03-Jun-2026', 'Officer C', 'Citizenship'],
          ['APP-2026-085', 'Joseph Kibona', '02-Jun-2026', 'Officer E', 'Visitor'],
          ['APP-2026-091', 'Rose Mrema', '01-Jun-2026', 'Officer B', 'Citizenship'],
          ['APP-2026-102', 'Daniel Msangi', '31-May-2026', 'Officer D', 'Refugee'],
          ['APP-2026-115', 'Emily Mageni', '30-May-2026', 'Officer A', 'Residence'],
          ['APP-2026-128', 'Paul Mrosso', '29-May-2026', 'Officer C', 'Stateless'],
        ],
      };
    case 4: // Rejected Applications
      return {
        summary: [
          { label: 'Total Rejected', value: '124' },
          { label: 'Rejection Rate', value: '9.9%' },
          { label: 'Top Reason', value: 'Incomplete docs' },
        ],
        columns: ['Application ID', 'Applicant', 'Date', 'Reason', 'Officer'],
        rows: [
          ['APP-2026-007', 'Samuel Kilonzo', '10-Jun-2026', 'Incomplete Documents', 'Officer A'],
          ['APP-2026-012', 'Maria Temu', '09-Jun-2026', 'Fraud Indicators', 'Officer B'],
          ['APP-2026-019', 'James Otieno', '08-Jun-2026', 'Incomplete Documents', 'Officer C'],
          ['APP-2026-028', 'Linda Mushi', '07-Jun-2026', 'Security Concern', 'Officer A'],
          ['APP-2026-033', 'Robert Mbwana', '06-Jun-2026', 'Duplicate Application', 'Officer B'],
          ['APP-2026-041', 'Helen Kilawe', '05-Jun-2026', 'Expired Passport', 'Officer D'],
          ['APP-2026-048', 'George Nnko', '04-Jun-2026', 'Fraud Indicators', 'Officer E'],
          ['APP-2026-055', 'Cecilia Mwasaga', '03-Jun-2026', 'Missing Biometrics', 'Officer A'],
          ['APP-2026-062', 'Frank Mrosso', '02-Jun-2026', 'Incomplete Documents', 'Officer C'],
          ['APP-2026-069', 'Angela Kileo', '01-Jun-2026', 'Criminal Record', 'Officer B'],
          ['APP-2026-074', 'Thomas Lugwisha', '31-May-2026', 'Duplicate Application', 'Officer E'],
          ['APP-2026-081', 'Joyce Mwakalinga', '30-May-2026', 'Expired Passport', 'Officer D'],
          ['APP-2026-088', 'Patrick Nyerere', '29-May-2026', 'Security Concern', 'Officer A'],
        ],
      };
    case 5: // Pending Assessments
      return {
        summary: [
          { label: 'Total Pending', value: '452' },
          { label: 'Over 14 Days', value: '89' },
          { label: 'High Priority', value: '34' },
        ],
        columns: ['Case No.', 'Applicant', 'Days Pending', 'Priority', 'Assigned Officer'],
        rows: [
          ['CASE-4521', 'Alice Masawe', '21', 'High', 'Officer A'],
          ['CASE-4519', 'Benard Lugano', '18', 'Medium', 'Officer B'],
          ['CASE-4515', 'Catherine Mwaipaja', '15', 'High', 'Officer C'],
          ['CASE-4508', 'Daniel Mrosso', '12', 'Low', 'Officer A'],
          ['CASE-4501', 'Esther Kimaro', '8', 'Medium', 'Officer B'],
          ['CASE-4496', 'Francis Kilawe', '6', 'Low', 'Officer D'],
          ['CASE-4488', 'Grace Mwasaga', '5', 'Medium', 'Officer E'],
          ['CASE-4482', 'Henry Nnko', '4', 'High', 'Officer C'],
          ['CASE-4475', 'Irene Lugwisha', '3', 'Low', 'Officer A'],
          ['CASE-4469', 'Jack Mwakalinga', '2', 'Medium', 'Officer B'],
          ['CASE-4461', 'Karen Nyerere', '1', 'High', 'Officer D'],
          ['CASE-4455', 'Leo Mrosso', '0', 'Low', 'Officer E'],
          ['CASE-4448', 'Mary Kimaro', '0', 'Medium', 'Officer C'],
        ],
      };
    case 6: // Processing Turnaround Times
      return {
        summary: [
          { label: 'Overall Avg', value: '14 days' },
          { label: 'Fastest Stage', value: 'Biometric' },
          { label: 'Slowest Stage', value: 'Assessment' },
        ],
        columns: ['Stage', 'Average Days', 'Min', 'Max', 'Cases Processed'],
        rows: [
          ['Registration', '2', '1', '5', '1,245'],
          ['Biometric', '3', '1', '7', '1,198'],
          ['Assessment', '6', '2', '18', '987'],
          ['Approval', '4', '1', '12', '854'],
          ['Determination', '2', '1', '6', '652'],
          ['Quality Check', '1', '0', '3', '512'],
          ['Document Review', '3', '1', '8', '423'],
          ['Interview', '5', '2', '14', '298'],
          ['Final Dispatch', '1', '0', '2', '198'],
        ],
      };
    case 7: // Biometric Enrollment Statistics
      return {
        summary: [
          { label: 'Enrolled', value: '1,198' },
          { label: 'Success Rate', value: '96.2%' },
          { label: 'Failures', value: '46' },
        ],
        columns: ['Period', 'Enrollments', 'Successful', 'Failed', 'Scanner Used'],
        rows: cols.map((c, i) => [c, 180 + i * 20, 172 + i * 19, 8 + i, 'Scanner-' + (i + 1)]),
      };
    case 8: // Officer Workload & Productivity
      return {
        summary: [
          { label: 'Active Officers', value: '34' },
          { label: 'Avg. Cases', value: '37' },
          { label: 'Top Performer', value: 'Officer A' },
        ],
        columns: ['Officer', 'Assigned', 'Completed', 'Pending', 'Avg. Time (days)', 'Productivity'],
        rows: [
          ['Officer A', '52', '48', '4', '6', '92%'],
          ['Officer B', '45', '40', '5', '7', '89%'],
          ['Officer C', '38', '33', '5', '8', '87%'],
          ['Officer D', '41', '35', '6', '9', '85%'],
          ['Officer E', '36', '30', '6', '10', '83%'],
          ['Officer F', '33', '28', '5', '11', '85%'],
          ['Officer G', '29', '24', '5', '12', '83%'],
          ['Officer H', '27', '22', '5', '13', '81%'],
          ['Officer I', '25', '20', '5', '14', '80%'],
          ['Officer J', '23', '18', '5', '15', '78%'],
          ['Officer K', '21', '17', '4', '13', '81%'],
          ['Officer L', '19', '15', '4', '14', '79%'],
          ['Officer M', '18', '14', '4', '15', '78%'],
        ],
      };
    case 9: // Regional Distribution
      return {
        summary: [
          { label: 'Total Regions', value: '26' },
          { label: 'Top Region', value: 'Dar es Salaam' },
          { label: 'Bottom Region', value: 'Katavi' },
        ],
        columns: ['Region', 'Applications', 'Approved', 'Pending', 'Percentage'],
        rows: [
          ['Dar es Salaam', '245', '180', '65', '19.7%'],
          ['Arusha', '112', '78', '34', '9.0%'],
          ['Mwanza', '89', '62', '27', '7.2%'],
          ['Dodoma', '56', '40', '16', '4.5%'],
          ['Zanzibar', '78', '55', '23', '6.3%'],
          ['Kilimanjaro', '67', '48', '19', '5.4%'],
          ['Mbeya', '54', '39', '15', '4.3%'],
          ['Morogoro', '48', '35', '13', '3.9%'],
          ['Tanga', '42', '30', '12', '3.4%'],
          ['Kagera', '38', '27', '11', '3.1%'],
          ['Ruvuma', '35', '25', '10', '2.8%'],
          ['Kigoma', '32', '23', '9', '2.6%'],
          ['Mtwara', '28', '20', '8', '2.3%'],
        ],
      };
    case 10: // Status Determination Trends
      return {
        summary: [
          { label: 'Determinations', value: '652' },
          { label: 'YoY Growth', value: '+12%' },
          { label: 'Top Category', value: 'Citizenship' },
        ],
        columns: ['Period', 'Citizenship', 'Residence', 'Refugee', 'Visitor', 'Stateless', 'Total'],
        rows: cols.map((c, i) => {
          const citizenship = 45 + i * 5;
          const residence = 30 + i * 3;
          const refugee = 15 + i * 2;
          const visitor = 22 + i * 2;
          const stateless = 8 + i;
          return [c, citizenship, residence, refugee, visitor, stateless, citizenship + residence + refugee + visitor + stateless];
        }),
      };
    default:
      return { summary: [], columns: [], rows: [] };
  }
}

export default function Reports() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [datePeriod, setDatePeriod] = useState('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportPage, setReportPage] = useState(1);
  const [downloadFormat, setDownloadFormat] = useState('csv');
  const rowsPerPage = 5;

  const handleGenerateReport = (reportId, period) => {
    const data = generateDummyReportData(reportId, period);
    setGeneratedReport({ reportId, period, data });
    setReportPage(1);
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

  const downloadReport = async (reportTitle, data, format, periodLabel) => {
    const safeTitle = reportTitle.replace(/\s+/g, '_');
    if (format === 'csv') {
      const header = data.columns.join(',');
      const rows = data.rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const csvContent = `\ufeff${header}\n${rows}`;
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
      const periodText = periodLabel ? ` — ${periodLabel}` : '';
      doc.text(`${reportTitle.toUpperCase()}${periodText.toUpperCase()}`, 148.5, 40, { align: 'center' });

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

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Operational and management reports for status determination</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-xs font-semibold border border-icrcs-navy/20">{reportList.length} Available Reports</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: '1,245', icon: FileText, color: 'bg-gray-100 text-gray-600' },
          { label: 'Determination Rate', value: '68%', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Avg. Processing', value: '14 days', icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Active Officers', value: '34', icon: Users, color: 'bg-blue-50 text-blue-600' },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-icrcs-navy" /> Monthly Cases vs Determinations
            </h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                <Legend />
                <Bar dataKey="applications" fill="#0B1D3A" name="Cases Registered" radius={[6,6,0,0]} />
                <Bar dataKey="approved" fill="#D4AF37" name="Approved" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-icrcs-navy" /> Status Distribution
            </h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
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
                    <th className="px-4 py-3 font-semibold text-gray-500 text-sm hidden md:table-cell">Last Generated</th>
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
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-600 border-gray-200 capitalize">{report.chart} Chart</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">12-Jun-2026</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <select value={downloadFormat} onChange={e => setDownloadFormat(e.target.value)} onClick={e => e.stopPropagation()} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none cursor-pointer">
                                <option value="csv">CSV</option>
                                <option value="excel">Excel</option>
                                <option value="pdf">PDF</option>
                              </select>
                              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title={`Download ${downloadFormat.toUpperCase()}`} onClick={e => { e.stopPropagation(); const data = generateDummyReportData(report.id, 'daily'); downloadReport(report.title, data, downloadFormat, 'Daily'); }}>
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button className="p-1.5 rounded-lg hover:bg-icrcs-navy/10 text-gray-400 hover:text-icrcs-navy transition-colors" title="View Report" onClick={e => e.stopPropagation()}>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {selectedReport === report.id && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 bg-gray-50/60 border-t border-gray-100">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-700">Select Report Period</p>
                                <button onClick={() => setSelectedReport(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Close</button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {[
                                  { key: 'daily', label: 'Daily' },
                                  { key: 'weekly', label: 'Weekly' },
                                  { key: 'monthly', label: 'Monthly' },
                                  { key: 'annual', label: 'Annual' },
                                  { key: 'custom', label: 'Custom Range' },
                                ].map((p) => (
                                  <button
                                    key={p.key}
                                    onClick={() => setDatePeriod(p.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                      datePeriod === p.key
                                        ? 'bg-icrcs-navy text-white border-icrcs-navy'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                              {datePeriod === 'custom' && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-xs text-gray-500">From</label>
                                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy" />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-xs text-gray-500">To</label>
                                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy" />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button onClick={() => { setDatePeriod('daily'); setCustomFrom(''); setCustomTo(''); setGeneratedReport(null); setReportPage(1); }} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Reset</button>
                                <button onClick={() => handleGenerateReport(report.id, datePeriod)} className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy/90 transition-colors">Generate Report</button>
                              </div>

                              {generatedReport && generatedReport.reportId === report.id && (
                                <div className="mt-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">{report.title} — {datePeriod === 'daily' ? 'Daily' : datePeriod === 'weekly' ? 'Weekly' : datePeriod === 'monthly' ? 'Monthly' : datePeriod === 'annual' ? 'Annual' : 'Custom Range'} Report</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">Generated on 15-Jun-2026</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <select value={downloadFormat} onChange={e => setDownloadFormat(e.target.value)} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none cursor-pointer">
                                        <option value="csv">CSV</option>
                                        <option value="excel">Excel</option>
                                        <option value="pdf">PDF</option>
                                      </select>
                                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title={`Download ${downloadFormat.toUpperCase()}`} onClick={() => downloadReport(report.title, generatedReport.data, downloadFormat, datePeriod === 'daily' ? 'Daily' : datePeriod === 'weekly' ? 'Weekly' : datePeriod === 'monthly' ? 'Monthly' : datePeriod === 'annual' ? 'Annual' : 'Custom Range')}>
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
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
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

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-icrcs-navy" /> Cases by Determination Category
            </h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#0B1D3A" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-icrcs-navy" /> Regional Distribution
            </h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#64748B' }} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                <Line type="monotone" dataKey="count" stroke="#0B1D3A" strokeWidth={2} dot={{ r: 5, fill: '#D4AF37', stroke: '#0B1D3A', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
