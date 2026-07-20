import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../app/middleware/ProtectedRoute';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import Biometric from '../features/biometric/pages/Biometric';
import Assessment from '../features/assessment/pages/Assessment';
import Adjudication from '../features/adjudication/pages/Adjudication';
import ApproveDecision from '../features/statusDetermination/pages/ApproveDecision';
import EscalateCase from '../features/escalateCase/pages/EscalateCase';
import EscalationCases from '../features/escalation/pages/EscalationCases';
import Enquiries from '../features/enquiries/pages/Enquiries';
import Reports from '../features/reports/pages/Reports';

const ALL_ROLES = ['registration_officer','assessor','approver','etd_officer','admin','management'];
const ASSESSOR_ROLES = ['registration_officer','assessor','admin'];
const APPROVER_ROLES = ['registration_officer','assessor','approver','admin'];
const ADMIN_MGMT = ['admin','management'];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/internal/dashboard" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Dashboard /></ProtectedRoute>} />
      <Route path="/internal/biometric" element={<ProtectedRoute allowedRoles={['registration_officer','assessor','admin']}><Biometric /></ProtectedRoute>} />
      <Route path="/internal/assessment" element={<ProtectedRoute allowedRoles={ASSESSOR_ROLES}><Assessment /></ProtectedRoute>} />
      <Route path="/internal/adjudication" element={<ProtectedRoute allowedRoles={APPROVER_ROLES}><Adjudication /></ProtectedRoute>} />
      <Route path="/internal/approve-decision" element={<ProtectedRoute allowedRoles={APPROVER_ROLES}><ApproveDecision /></ProtectedRoute>} />
      <Route path="/internal/escalate-case" element={<ProtectedRoute allowedRoles={APPROVER_ROLES}><EscalateCase /></ProtectedRoute>} />
      <Route path="/internal/escalation" element={<ProtectedRoute allowedRoles={['approver','admin','management']}><EscalationCases /></ProtectedRoute>} />
      <Route path="/internal/enquiries" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Enquiries /></ProtectedRoute>} />
      <Route path="/internal/reports" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Reports /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/internal/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/internal/dashboard" replace />} />
    </Routes>
  );
}
