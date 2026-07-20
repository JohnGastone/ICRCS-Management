// Management service — context path /api set in icrcs-management application.properties
// Handles both officer auth (/v1/auth) and case management (/v1/management)
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.232.0.12:3231/api/v1';

// Citizen-facing icrcs-api — used for the public review endpoint (no auth required)
export const ICRCS_API_BASE_URL = process.env.REACT_APP_ICRCS_API_URL || 'http://10.232.0.12:1010/api/v1';

// Local office agent that drives the fingerprint scanner (icrcs-device-service).
// A different origin from API_BASE_URL - it must NOT receive this app's auth token.
export const DEVICE_SERVICE_URL = process.env.REACT_APP_DEVICE_SERVICE_URL || 'http://127.0.0.1:8090';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN:   '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT:  '/auth/logout',
  },
  MANAGEMENT: {
    CASES:           '/management/cases',
    ENROLLMENT:      '/management/cases/enrollment',
    ASSESSMENT:      '/management/cases/assessment',
    APPROVAL:        '/management/cases/approval',
    BY_SUBJECT:      (subjectId) => `/management/cases/by-subject/${subjectId}`,
    DETAIL:          (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}`,
    ASSIGN:          (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/assign`,
    ENROLL:          (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/enroll`,
    START_ASSESSMENT:(caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/start-assessment`,
    ASSESS:          (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/assess`,
    DECIDE:          (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/decide`,
    APPLICANT:       (caseNo)    => `/management/cases/${encodeURIComponent(caseNo)}/applicant`,
  },
};

export const REQUEST_TIMEOUT = 30000;

// Map backend role codes → frontend role strings used by ProtectedRoute / AuthProvider
export const ROLE_MAP = {
  ICRCS_OFFICER:  'registration_officer',
  ICRCS_ASSESSOR: 'assessor',
  ICRCS_APPROVER: 'approver',
};
