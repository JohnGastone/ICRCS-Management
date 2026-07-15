export const ROLES = {
  REGISTRATION_OFFICER: 'registration_officer',
  ASSESSOR: 'assessor',
  APPROVER: 'approver',
  ETD_OFFICER: 'etd_officer',
  ADMIN: 'admin',
  MANAGEMENT: 'management',
};

export const ROLE_LABELS = {
  [ROLES.REGISTRATION_OFFICER]: 'Registration Officer',
  [ROLES.ASSESSOR]: 'Assessor',
  [ROLES.APPROVER]: 'Approver',
  [ROLES.ETD_OFFICER]: 'ETD Officer',
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.MANAGEMENT]: 'Immigration Management',
};

export const ALL_ROLES = Object.values(ROLES);
