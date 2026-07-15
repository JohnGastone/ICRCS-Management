# ISDMP — Immigration Status Determination Management Portal

> A family module of the **Immigration Central Registration and Citizenship System (ICRCS)**.

Internal, officer-facing case-management portal for **Tanzania's Immigration Services Department (TISD)**. ISDMP is where applications submitted through the public ICRCS portal are **assessed, adjudicated, approved, escalated, and finally determined** by authorised immigration officers — under a single institutional identity shared across the ICRCS family.

Built with **React 19** (Create React App), **Redux Toolkit**, and **React Router 7**. Access is **restricted to authenticated officers** and gated by role.

---

## Where ISDMP Fits in the ICRCS Family

ICRCS is a suite of cooperating modules. A citizen's record flows through them in sequence:

```
┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────────┐
│  ICRCS Registration       │     │  Biometric Capture        │     │  ISDMP (this module)          │
│  (public citizen portal)  │ ──▶ │  (separate module,        │ ──▶ │  Assessment & Status          │
│                           │     │   to be merged in future) │     │  Determination portal         │
│  • Self & dependents      │     │  • Fingerprints           │     │  • Assessment                 │
│  • 9-stage registration   │     │  • Facial / photo capture │     │  • Adjudication (1:N match)   │
│  • Document uploads        │     │  • Live enrolment          │     │  • Decision approval          │
│  • Application ID issued   │     │                            │     │  • Escalation & resolution    │
└──────────────────────────┘     └──────────────────────────┘     └──────────────────────────────┘
```

1. **A client registers** in the public ICRCS portal and receives an **Application ID** (e.g. `APP-2026-000145`).
2. Their registration details are **forwarded to the Biometric Capture module** (currently a separate module, to be merged into ISDMP in a future release) where fingerprints and biometrics are enrolled.
3. The **registration details and the captured biometrics together** are received into **this Assessment portal**, where officers verify identity, run an assessment, adjudicate biometric matches, and determine the applicant's immigration/citizenship status.

> Because biometric capture will eventually be merged into ISDMP, this portal already ships a **Biometric Enrolment** workspace so the future integration slots in cleanly.

---

## System Overview

ISDMP provides a centralised platform for managing immigration status-determination processes and maintaining a consolidated repository of determination records. Cases originate from the ICRCS registration portal and authorised channels, and are processed internally through a multi-stage officer workflow with role-based access control at every step.

Authenticated officers can:

* **Receive applications** forwarded from registration + biometric capture, into a working queue.
* **Run biometric enrolment** (capture / review fingerprints and photos) ahead of the future merge.
* **Assess applications** against submitted documents and applicant data.
* **Adjudicate biometric matches** — single match, multiple matches, high-risk duplicates, manual referrals — with match scores and risk levels.
* **Approve, reject, return, or escalate** a recommended decision.
* **Escalate complex cases** to specialist departments (Citizenship, Legal, Border Management & Control) and track resolution.
* **Run enquiries** across the consolidated registry by Subject ID, name, fingerprint, NIN, passport, permit, or DOB.
* **Generate reports & analytics** and export them to **PDF / Excel**.

---

## Business Process Flow

```
Case Registration → Biometric Enrolment → Fingerprint / Identity Verification
   → Interview & Assessment → Assessor Recommendation → Adjudication
      → Approval Review → Status Determination → Escalation (if required) → Case Closure
         → Enquiry & Verification (ongoing)
```

| # | Stage | Module |
| :- | :--- | :--- |
| 1 | Case received from ICRCS registration + biometrics | Dashboard / Queue |
| 2 | Biometric enrolment & review | Biometric Enrolment |
| 3 | Document & applicant assessment | Assessments |
| 4 | Biometric match adjudication | Adjudication |
| 5 | Decision approval (approve / reject / return / escalate) | Approve Decision |
| 6 | Escalation to specialist departments & resolution | Escalation Case / Escalation Cases |
| 7 | Enquiry & verification across the registry | Enquiry |
| 8 | Reporting & analytics | Reports |

---

## User Roles & Access

Routes are protected by `ProtectedRoute` and each module declares the roles allowed to open it.

| Role | Key (`roles.js`) | Responsibilities |
| :--- | :--- | :--- |
| **Registration Officer** | `registration_officer` | Receives cases, runs biometric enrolment |
| **Assessor** | `assessor` | Conducts assessments and recommendations, can adjudicate |
| **Approver** | `approver` | Approves/rejects decisions, handles escalations |
| **ETD Officer** | `etd_officer` | Enquiry & verification |
| **Immigration Management** | `management` | Reviews escalations, reports & dashboards |
| **System Administrator** | `admin` | Full access; system configuration |

### Module → Role matrix

| Module | Path | Allowed roles |
| :--- | :--- | :--- |
| Dashboard | `/internal/dashboard` | all |
| Biometric Enrolment | `/internal/biometric` | registration_officer, assessor, admin |
| Assessments | `/internal/assessment` | assessor, admin |
| Approve Decision | `/internal/approve-decision` | assessor, approver, admin |
| Escalation Case | `/internal/escalate-case` | assessor, approver, admin |
| Adjudication | `/internal/adjudication` | assessor, approver, admin |
| Escalation Cases | `/internal/escalation` | approver, admin, management |
| Enquiry | `/internal/enquiries` | all |
| Reports | `/internal/reports` | all |

---

## Key Features

### Authentication & Access Control

* **Role-based login** — officer signs in and assumes a role; the sidebar and routes adapt to that role.
* **Protected routes** — `ProtectedRoute` + `RoleGuard` redirect unauthorised visitors and block out-of-role access.
* **Session persistence** — authenticated user is persisted in `localStorage` (`icrcs_user`) via `AuthProvider`.
* **30-minute session timeout** policy (`SESSION_TIMEOUT_MINUTES`).

### Dashboard

* At-a-glance operational KPIs — applications received, pending assessments, decisions awaiting approval, approved / rejected counts, escalated cases.
* **Recharts** visualisations (bar, pie, line) for throughput and status distribution.
* Role-aware quick links into each workflow stage.

### Biometric Enrolment

* Workspace to look up an application, review applicant info, and capture / verify biometric enrolment status (Pending Capture → In Progress → Completed → Forwarded to Assessment).
* Built to **absorb the standalone Biometric Capture module** when it is merged into ISDMP.

### Assessments

* Officer queue with search, status and priority filtering, and sortable columns.
* `AssessmentWorkspace` for reviewing applicant data and attached documents, recording findings, and producing a recommendation.
* Status lifecycle: Pending Assessment → Under Assessment → In Progress → Completed → Escalated.

### Adjudication

* Biometric **match adjudication** for single matches, multiple matches, high-risk duplicates, and manual referrals.
* Surfaces **match score** and **risk level** (Low → Critical); locked-case handling, attachments viewer, and decision confirmation modals.

### Approve Decision & Status Determination

* `ApproveDecisionWorkspace` lets an approver **Approve / Reject / Return for more info / Escalate**.
* Tracks decision and resulting status (Pending Approval, Approved, Rejected, Returned to Assessment, Escalated to Department).

### Escalation

* **Escalation Case** — raise a case to a specialist department (Citizenship, Legal, Border Management & Control).
* **Escalation Cases** — management view of all escalated cases with reason, history timeline, priority, and resolution tracking.

### Enquiry

* Consolidated registry lookup by **Subject ID, Full Name, Fingerprint No., National ID (NIN), Passport No., Residence Permit No., or Date of Birth**.
* Sectioned applicant view (overview, documents) with document preview.

### Reports & Analytics

* Status distribution, monthly application/approval trends, and operational summaries via **Recharts**.
* **Export to PDF** (`jspdf` + `jspdf-autotable`) and **Excel** (`xlsx`), branded with the official coat of arms and Immigration emblem.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 (Create React App / `react-scripts` 5) |
| **Routing** | React Router DOM 7 |
| **State** | Redux Toolkit + React Redux (`auth`, `ui`, `notification` slices) |
| **Styling** | Tailwind CSS 3 (custom ICRCS design tokens) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Animation** | Framer Motion |
| **Dates** | date-fns |
| **Exports** | jsPDF · jspdf-autotable · SheetJS (`xlsx`) |
| **Testing** | React Testing Library · Jest DOM |

---

## Project Architecture

Feature-based, enterprise React layout (see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the full reference):

```
src/
├── app/
│   ├── providers/        # AuthProvider (login, logout, user state)
│   ├── middleware/       # ProtectedRoute, RoleGuard
│   └── config/           # appConfig, menuConfig (role-mapped sidebar)
├── assets/images/        # Coat of arms, Immigration emblem
├── components/
│   ├── common/           # ApplicantInfoView and shared views
│   ├── layout/           # Sidebar, topbar, internal layout
│   └── modals/           # Shared modal primitives
├── config/               # apiConfig (base URL, endpoints), appSettings
├── constants/            # roles.js
├── data/                 # mockApplicantData (demo / UAT fixtures)
├── features/
│   ├── auth/             # Login
│   ├── dashboard/        # KPIs + analytics
│   ├── biometric/        # Biometric enrolment workspace
│   ├── assessment/       # Assessment queue + workspace
│   ├── adjudication/     # Match adjudication + modals
│   ├── statusDetermination/  # Approve decision workspace
│   ├── escalateCase/     # Raise escalation
│   ├── escalation/       # Manage escalated cases
│   ├── enquiries/        # Registry enquiry
│   └── reports/          # Reports & exports
├── hooks/                # useDropdown, etc.
├── routes/               # AppRoutes (central route table)
├── services/             # apiClient (fetch wrapper)
├── store/                # Redux store, rootReducer, slices
├── utils/                # permissions, helpers
├── App.js                # Provider stack + router
└── index.js              # ReactDOM root
```

---

## Installation

```bash
# Prerequisites: Node.js >= 18, npm >= 9
node -v

git clone https://github.com/your-org/isdmp.git
cd status-determination-management
npm install

cp .env.example .env          # then set REACT_APP_API_URL (see Environment Variables)
npm start                     # http://localhost:3000
```

---

## Environment Variables

CRA only exposes variables prefixed with `REACT_APP_` to the browser, baked in at build time.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | Base URL of the ISDMP backend API the portal calls. | `http://localhost:3001/api` |

Endpoint paths and the 30s request timeout are defined in [src/config/apiConfig.js](src/config/apiConfig.js).

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm start` | Run the dev server at http://localhost:3000 with hot reload. |
| `npm test` | Launch the interactive Jest / React Testing Library watcher. |
| `npm run build` | Produce an optimised production build in `build/`. |
| `npm run eject` | Eject CRA configuration (irreversible). |

---

## Test Environment Access

For demonstration, UAT, and system-validation purposes only:

| Environment | Username | Password |
| :--- | :--- | :--- |
| Test | `goodluck.msuya@immigration.go.tz` | `Test@123` |

> These credentials are for testing only, must not be used in production, and should be disabled once testing concludes.

---

## Development Status

| Module | Status |
| :--- | :--- |
| Role-based login & session persistence | ✅ Done |
| Protected routes & role guards | ✅ Done |
| Dashboard (KPIs + analytics) | ✅ Done |
| Biometric Enrolment workspace | ✅ Done |
| Assessments (queue + workspace) | ✅ Done |
| Adjudication (match review + modals) | ✅ Done |
| Approve Decision / Status Determination | ✅ Done |
| Escalation (raise + manage) | ✅ Done |
| Enquiry (multi-key registry lookup) | ✅ Done |
| Reports & Analytics (PDF / Excel export) | ✅ Done |
| Live backend integration | 🔄 In progress |
| Biometric Capture module merge | ⏳ Planned |

---

## License

© 2026 United Republic of Tanzania — Immigration Services Department. All rights reserved.

This application is intended exclusively for **authorised officers** of the Immigration Central Registration and Citizenship System (ICRCS).

---

## Contact

* **Email**: support@immigration.go.tz
* **Phone**: +255-26-2323189
* **Website**: https://www.immigration.go.tz
