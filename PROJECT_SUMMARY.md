# ISDMP — Project Summary

**Immigration Status Determination Management Portal** — a technical and functional
summary of every feature built to date, the architecture, and the strategy behind it.

> This document complements [README.md](README.md): the README covers domain context
> and where ISDMP sits in the ICRCS family; this file focuses on the **implementation
> and feature detail** of the frontend as currently built.

---

## 1. What this application is

ISDMP is an internal, **officer-facing case-management web app** for **Tanzania's
Immigration Services Department**, built as one module of the larger **ICRCS**
(Immigration Central Registration and Citizenship System) family. It is where
applications submitted through the public ICRCS registration portal are
**assessed → adjudicated → approved → escalated → finally determined** by
authorised immigration officers.

**Position in the ICRCS pipeline:**

```
Public Registration portal        Biometric Capture            ISDMP (this app)
(issues APP-… ID)          ──▶    (fingerprints, photo)  ──▶   verification, assessment,
                                                               biometric adjudication,
                                                               status determination
```

Biometric capture is currently a separate module; ISDMP already ships a Biometric
Enrolment workspace in anticipation of a future merge.

---

## 2. Tech stack & strategy

| Layer | Choice |
|---|---|
| Framework | **React 19** on Create React App (`react-scripts` 5) |
| Routing | **React Router 7** |
| State | **Redux Toolkit** + `react-redux` (auth/ui/notification slices) **and** a React Context `AuthProvider` |
| Styling | **Tailwind CSS 3** with shared **ICRCS theme tokens** (navy/gold identity) |
| Icons | **lucide-react** |
| Charts | **Recharts** (dashboard + reports) |
| Exports | **jsPDF + jspdf-autotable** (PDF), **xlsx** (Excel) |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority`, `date-fns`, `framer-motion` |

**Core architectural decisions:**

- **Feature-first folder structure** — each domain (`biometric`, `assessment`,
  `adjudication`, etc.) is a self-contained folder under `src/features/` with its own
  `pages/` and `components/`.
- **Role-based access control at every route** (see §3).
- **Frontend-only prototype** — there is **no live backend**. Every screen is driven by
  **in-file mock data**; an `apiClient` and `apiConfig` exist as scaffolding pointing at
  `localhost:3001/api` but are not yet wired in. State changes (status updates, captures)
  are local React state and reset on refresh.
- **Shared design system** — tokens are centralized so ISDMP, the client portal, and
  biometric capture stay visually identical (see `src/theme/` and `icrcs-theme-starter/`).

---

## 3. Architecture & cross-cutting systems

### Routing — `src/routes/AppRoutes.js`
A `/login` route plus nine `/internal/*` routes, each wrapped in
`<ProtectedRoute allowedRoles={…}>`. Unknown paths and `/` redirect to the dashboard.

### Authentication — `src/app/providers/AuthProvider.js`
Context-based **mock login**: `Login.js` lets you pick a role and any email/password,
then stores a fake user in `localStorage` (`icrcs_user`). A parallel Redux `authSlice`
(`loginStart/Success/Failure`, `logout`, `updateUser`) exists for future real auth.

### Authorization
- `src/app/middleware/ProtectedRoute.js` — redirects unauthenticated users to `/login`
  and wrong-role users to the dashboard, then wraps the page in `InternalLayout`.
- `src/app/middleware/RoleGuard.js` — reusable role gate with a configurable fallback.
- `src/utils/permissions/roles.js` — a `PERMISSIONS` map + `hasPermission(role, key)`
  helper for finer-grained checks.

### Roles — `src/constants/roles.js`
Six roles: **Registration Officer, Assessor, Approver, ETD Officer, System
Administrator, Immigration Management.** Menu items (`src/app/config/menuConfig.js`) and
routes are filtered per role.

### Layout — `src/components/layout/InternalLayout.js`
Responsive shell: full 285px navy sidebar → 72px icon rail → mobile drawer, with a gold
accent bar. Topbar has search, a notifications bell, and a profile dropdown. Three account
modals: Profile, Change Password, Settings.

### State slices — `src/store/slices/`
- `auth` — user, isAuthenticated, loading, error.
- `ui` — sidebarOpen, loading, theme.
- `notification` — message, type, visible (toast system).

### Config & services
- `src/config/apiConfig.js` — `API_BASE_URL` + endpoint map (auth/cases/biometric/reports).
- `src/config/appSettings.js` — app name (ISDMP), version, languages (en/sw), timezone
  (Africa/Dar_es_Salaam), 30-min session timeout.
- `src/services/apiClient.js` — a `fetch` wrapper with bearer-token injection (scaffolding).

---

## 4. Features built to date

### Dashboard — `src/features/dashboard/pages/Dashboard.js` — all roles
Welcome banner, **6 KPI stat cards** (Applications Received 1,248; Pending Assessments 312;
Decisions Pending Approval 42; Approved 856; Rejected 128; Escalated 14), a **monthly trend
line chart** (received/approved/rejected in navy/gold/red), a **status-distribution donut**,
and a **recent applications table** with colored status badges.

### Biometric Enrolment — `src/features/biometric/pages/Biometric.js` (~1,900 lines) — Registration Officer, Assessor, Admin
The most complex screen. Fetch an application by number, review it, then a **multi-step
capture wizard**:
- **Photo capture** — simulated camera start, quality scoring against 7 checks (face
  centered, neutral expression, lighting, eyes visible, no shadows, no obstruction, plain
  background), retake confirmation, timestamping.
- **Fingerprint capture** — all 10 fingers + thumbs, each with pending/capturing/captured/
  exception states and quality scoring.
- **Signature capture** — canvas draw (strokes/undo/clear) or file upload, quality checks,
  timestamp.
- A **case queue** table with search/status filters, a tabbed **review modal**
  (info/documents), an **audit log** of every action, and **Forward to Assessment** with a
  confirmation gate.

### Assessments — `src/features/assessment/` — Assessor, Admin
Case queue → tabbed workspace (**Applicant Info · Attachments · Checklist · Recommendation**).
A **12-item assessment checklist** must be fully completed before submitting a recommendation
of **Approve / Reject / Escalate** (approve requires a final immigration status; reject/
escalate require a reason; escalate requires a target department). Includes document upload/
preview and a notes/recommendation history.

### Adjudication — `src/features/adjudication/` — Assessor, Approver, Admin
**Biometric 1:N duplicate-match adjudication.** Shows fingerprint match scores against
existing records (e.g. 98% match with a prior subject flagged Critical), demographic-
comparison checklists (names, DOB, gender, parents, nationality, passport, national ID
identical/similar), and document/biometric review checklists. Officer records a decision:
**Same person / Different person / Fraud (escalate) / Under review.** Includes View-Case,
Attachments, and Decision-Confirm modals.

### Approve Decision — `src/features/statusDetermination/` — Assessor, Approver, Admin
Approver reviews assessor recommendations and makes the **final determination**:
**Approve / Reject / Return to Assessment / Escalate to Department.** Tabbed workspace
(Info · Attachments · Checklist · Decision) with decision attachments, per-decision
validation rules, and a sortable/paginated/filterable case table with 6 status KPIs.

### Escalation Case — `src/features/escalateCase/` — Assessor, Approver, Admin
Queue of cases escalated to departments (Citizenship, Border Management & Control, Legal,
Passport). Sortable/paginated table, 6 KPIs (Total Escalated, Pending Resolution, Resolved,
Forwarded to Legal, Returned to Assessment, Overdue). Reuses the Approve-Decision workspace
to action cases.

### Escalation Cases — `src/features/escalation/` — Approver, Admin, Management
A **master–detail** view (list + selected-case panel) for reviewing/resolving open
escalations, with a findings/resolution notes box and open/resolved filtering. Color-coded
by escalation reason.

### Enquiries — `src/features/enquiries/` — all roles
**Record-lookup / verification tool.** Search by Subject ID, Name, Fingerprint No., National
ID, Passport, Residence Permit, or DOB. Returns a determination record with tabbed sections:
**Overview · Documents · Checked Items · Officer's Comments**, showing verified status,
document provenance, checklist history, and officer notes/timeline.

### Reports — `src/features/reports/` (~720 lines) — all roles
**10 report types**: Applications Received, Applications by Status, Approved, Rejected,
Pending Assessments, Processing Turnaround Times, Biometric Enrollment Statistics, Officer
Workload & Productivity, Regional Distribution, Status Determination Trends. Each generates
summary stat tiles + a data table + a chart (pie/line/bar via Recharts), with **period
selection** (daily/weekly/monthly/yearly) and **export to PDF (jsPDF) and Excel (xlsx)**.

### Shared UI — `src/components/`
- `common/ApplicantInfoView.js` — reused across all workspaces.
- `modals/` — UserProfile, ChangePassword, UserSettings.
- `hooks/useDropdown.js` — click-outside dropdown handling.

---

## 5. Design / theme

Navy (`#0B1D3A`) + gold (`#D4AF37`) institutional identity, blue/teal/amber brand accents,
Inter typography at a 15px base, `rounded-xl`/`rounded-2xl` cards, pill status badges, navy
focus rings, and a navy-with-gold-accent sidebar. Tokens live in `src/theme/` as a single
source of truth for both Tailwind 3 (`icrcs-theme.js`) and Tailwind 4 (`icrcs-theme.css`)
consumers. A portable copy plus a visual style reference is in `icrcs-theme-starter/`.

---

## 6. Current state & caveats

- **Prototype / demo stage:** fully interactive UI, but **no backend, no persistence, no
  real auth** — all data is mocked in-file and resets on refresh.
- Login accepts any credentials; the role is chosen manually on the login screen.
- `apiClient` / `apiConfig` are scaffolding, not yet connected to a live API.
- Git history is short; an older `src - Copy (3)/` tree was removed in a prior commit,
  indicating a restructure into the current feature-first layout.

---

## 7. Directory map

```
src/
├── app/
│   ├── config/        appConfig.js, menuConfig.js (role-filtered nav)
│   ├── middleware/    ProtectedRoute.js, RoleGuard.js
│   └── providers/     AuthProvider.js (mock auth via localStorage)
├── components/
│   ├── common/        ApplicantInfoView.js
│   ├── layout/        InternalLayout.js (sidebar + topbar shell)
│   └── modals/        UserProfile / ChangePassword / UserSettings
├── config/            apiConfig.js, appSettings.js
├── constants/         roles.js
├── data/              mockApplicantData.js
├── features/
│   ├── auth/          Login.js
│   ├── dashboard/     Dashboard.js
│   ├── biometric/     Biometric.js (capture wizard)
│   ├── assessment/    Assessment.js + AssessmentWorkspace.js
│   ├── adjudication/  Adjudication.js + workspace + modals
│   ├── statusDetermination/  ApproveDecision.js + workspace
│   ├── escalateCase/  EscalateCase.js
│   ├── escalation/    EscalationCases.js
│   ├── enquiries/     Enquiries.js
│   └── reports/       Reports.js (10 reports, PDF/Excel export)
├── hooks/             useDropdown.js
├── routes/            AppRoutes.js
├── services/          apiClient.js
├── store/             index.js, rootReducer.js, slices/ (auth, ui, notification)
├── theme/             icrcs-theme.js, icrcs-theme.css (design tokens)
└── utils/permissions/ roles.js, accessControl.js
```
