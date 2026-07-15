# Project Structure

The Immigration Central Registration and Citizenship System (ICRCS) follows a feature-based, enterprise-grade React architecture optimized for government systems.

---

## Root

```
icrcs-management-portal/
├── public/
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── features/
│   ├── hooks/
│   ├── routes/
│   ├── services/
│   ├── store/
│   ├── styles/
│   ├── utils/
│   ├── App.js
│   ├── index.css
│   └── index.js
├── .env
├── package.json
├── tailwind.config.js
├── README.md
└── PROJECT_STRUCTURE.md
```

---

## App Core Layer

```
src/app/
├── providers/
│   └── AuthProvider.js          # Authentication context (login, logout, user state)
├── middleware/
│   ├── ProtectedRoute.js        # Route guard for authenticated users with role checks
│   └── RoleGuard.js             # Standalone role-based access wrapper
└── config/
    ├── appConfig.js             # Application-level configuration helper
    └── menuConfig.js            # Sidebar navigation items with role mappings
```

---

## Assets

Static assets organized by type. Use `src/assets/index.js` as a barrel file for clean imports.

```
src/assets/
├── images/                      # Logos, backgrounds, avatars
├── icons/                       # SVG icons and favicons
├── fonts/                       # Custom font files
├── documents/                   # PDFs, guides, templates
└── index.js                     # Asset barrel file for centralized imports
```

---

## Features (Domain Modules)

Each feature is self-contained with its own pages, components, and state slice.

```
src/features/
├── auth/
│   ├── pages/
│   │   └── Login.js
│   ├── hooks/
│   └── services/
├── dashboard/
│   ├── pages/
│   │   └── Dashboard.js
│   └── components/
├── caseManagement/
│   ├── pages/
│   │   └── CaseManagement.js
│   └── components/
├── biometric/
│   ├── pages/
│   │   └── Biometric.js
│   └── components/
├── assessment/
│   ├── pages/
│   │   └── Assessment.js
│   └── components/
├── recommendations/
│   ├── pages/
│   │   └── Recommendations.js
│   └── components/
├── statusDetermination/
│   ├── pages/
│   │   └── StatusDetermination.js
│   └── components/
├── enquiries/
│   ├── pages/
│   │   └── Enquiries.js
│   └── components/
├── etdVerification/
│   ├── pages/
│   │   └── ETDVerification.js
│   └── components/
├── reports/
│   ├── pages/
│   │   └── Reports.js
│   └── components/
└── administration/
    ├── pages/
    │   └── Administration.js
    └── components/
```

---

## Shared Components

Reusable UI primitives and layout building blocks.

```
src/components/
├── ui/
│   ├── Button/
│   │   └── index.js
│   ├── Input/
│   │   └── index.js
│   ├── Modal/
│   │   └── index.js
│   ├── Table/
│   │   └── index.js
│   ├── Loader/
│   │   └── index.js
│   ├── Badge/
│   │   └── index.js
│   └── Card/
│       └── index.js
├── layout/
│   ├── InternalLayout.js        # Sidebar + topbar + main content wrapper
│   ├── Topbar/
│   │   └── index.js
│   └── Breadcrumb/
│       └── index.js
├── forms/
│   ├── FormInput/
│   │   └── index.js
│   └── FormSelect/
│       └── index.js
└── charts/
    └── index.js                 # Recharts re-exports
```

---

## Routing

```
src/routes/
├── AppRoutes.js                 # Central route definitions
├── ProtectedRoutes.js             # Re-exports of protected route guards
├── RoleRoutes.js                  # Re-exports of role guards
└── routePaths.js                  # Route constants object
```

---

## Services (API Layer)

```
src/services/
├── apiClient.js                  # Centralized fetch wrapper with auth headers
└── auth.api.js                  # Auth-specific API calls
```

---

## Global State Management (Redux Toolkit)

```
src/store/
├── index.js                      # Redux store configuration
├── rootReducer.js                # Combined reducers
└── slices/
    ├── authSlice.js
    ├── uiSlice.js
    └── notificationSlice.js
```

---

## Custom Hooks

```
src/hooks/
├── useAuth.js                    # Re-export of useAuth from AuthProvider
├── usePermissions.js             # Role-based permission checking hook
└── useFetch.js                   # Generic data fetching hook
```

---

## Utilities

```
src/utils/
├── helpers/
│   ├── dateFormatter.js          # Date formatting utilities
│   └── stringUtils.js            # String manipulation helpers
├── validators/
│   └── formValidator.js          # Form validation rules
├── permissions/
│   ├── roles.js                  # Role/permission matrix
│   └── accessControl.js          # Access control helpers
└── security/
    (encryption, token manager)
```

---

## Configuration & Constants

```
src/config/
├── apiConfig.js                  # API base URL and endpoint definitions
└── appSettings.js                # App name, version, locale, timeouts

src/constants/
├── roles.js                      # Role constants and labels
├── caseStatus.js                 # Case lifecycle status constants
├── actionTypes.js                # Redux action type constants
└── systemMessages.js             # Reusable system messages
```

---

## Styles

```
src/styles/
└── globals.css                   # Tailwind directives + custom CSS variables
```

---

## Entry Points

```
src/
├── App.js                        # Root component: Provider stack + router
├── index.js                      # ReactDOM root render
└── index.css                     # Global Tailwind imports (legacy path)
```
