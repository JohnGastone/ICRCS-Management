import {
  LayoutDashboard, Fingerprint, ClipboardCheck,
  Scale, Gavel, AlertTriangle, Search, BarChart3,
} from 'lucide-react';

export const menuItems = [
  { path: '/internal/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['registration_officer','assessor','approver','etd_officer','admin','management'] },
  { path: '/internal/biometric', label: 'Biometric Enrollment', icon: Fingerprint, roles: ['registration_officer','assessor','admin'] },
  { path: '/internal/assessment', label: 'Assessments', icon: ClipboardCheck, roles: ['registration_officer','assessor','admin'] },
  { path: '/internal/approve-decision', label: 'Approve Decision', icon: Gavel, roles: ['registration_officer','assessor','approver','admin'] },
  { path: '/internal/escalate-case', label: 'Escalation Case', icon: AlertTriangle, roles: ['registration_officer','assessor','approver','admin'] },
  { path: '/internal/adjudication', label: 'Adjudication', icon: Scale, roles: ['registration_officer','assessor','approver','admin'] },
  { path: '/internal/enquiries', label: 'Enquiry', icon: Search, roles: ['registration_officer','assessor','approver','etd_officer','admin','management'] },
  { path: '/internal/reports', label: 'Reports', icon: BarChart3, roles: ['registration_officer','assessor','approver','etd_officer','admin','management'] },
];
