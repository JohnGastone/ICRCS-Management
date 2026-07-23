import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import InternalLayout from '../../components/layout/InternalLayout';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // INTERIM: role-based route gating is disabled while the frontend has no
  // mapping for the backend's PermissionsByModule access model. Any authenticated
  // officer may open any internal page; the backend still enforces authorization
  // on every API call. To restore RBAC, re-enable the check below (and the menu
  // filter in InternalLayout) once role/permission derivation is wired in
  // AuthProvider.
  //   if (allowedRoles && !allowedRoles.includes(user?.role)) {
  //     return <Navigate to="/internal/dashboard" replace />;
  //   }
  void allowedRoles;
  return <InternalLayout>{children}</InternalLayout>;
}
