---
name: Frontend Structure
description: React 18 + Ant Design 5.x + Vite + TypeScript
type: project
---

**Frontend Stack:**
- **Framework:** React 18 + TypeScript
- **UI Library:** Ant Design 5.x
- **Build Tool:** Vite
- **State:** Zustand (authStore.ts)
- **Data Fetching:** TanStack Query
- **Routing:** React Router v6
- **Theme ConfigProvider:** `@components/layout/MainLayout`

**Module Structure (10 modules):**
```
cloudflare/pages/src/modules/
├── auth/         - Login page
├── dashboard/    - Main dashboard + GettingStarted
├── contacts/     - Contact CRUD
├── leads/        - Lead tracking
├── organizations/ - Organization management
├── deals/        - Pipeline + DealDetail
├── activities/   - Activity tracking
├── tasks/        - Task management
├── providers/    - Provider directory + ProviderDetail
├── email/        - Email placeholder (Phase 5)
├── settings/     - Settings
├── public-directory/ - Public provider search
└── calls/        - Call management
```

**Authentication Flow:**
1. Login page checks `useAuthStore().isAuthenticated`
2. Protected routes use `<Layout />` wrapper
3. Auth state persists via Zustand `persist` middleware to `auth-storage`

**Why:** Modern React stack optimized for Cloudflare Pages deployment.

**How to apply:** New frontend features should follow existing module patterns and use Ant Design components.
