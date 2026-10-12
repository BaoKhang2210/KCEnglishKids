Standalone Vite/React SPA under `admin/` with a flat feature layout:
- Entry: `src/main.tsx` mounts `<App>` in StrictMode; `src/App.tsx` wires `react-router-dom` routes (`/login`, `/dashboard`, root redirect) inside an `AuthProvider`.
- Auth layer: `src/context/AuthContext.tsx` holds `user`/`loading` state persisted to `localStorage` keys `kc_admin_token` / `kc_admin_user`, validates sessions via `authApi.getMe()`, and exposes `loginAdmin` / `logout` / `setUser`.
- API layer: `src/services/api.ts` centralizes fetch calls under `BASE_URL = '/api'`, attaches Bearer tokens from `kc_admin_token` (fallback `kc_token`), and exports domain clients `authApi` and `adminApi` (dashboard stats, curriculum, users CRUD, audit logs, topic status).
- Pages: `src/pages/AdminLoginPage.tsx` (email/password login form) and `src/pages/AdminDashboardPage.tsx` (overview tab, user-management tab with teacher/child creation modals, audit-logs tab).
- Shared types: `src/types/index.ts` defines `Role`, `AgeGroupCode`, `User`, `Topic`, `Lesson` consumed by the context and pages.
- Routing guard: `ProtectedAdminRoute` in `App.tsx` redirects non-ADMIN users to `/login`; the dashboard also re-checks role on mount.
- Dev server proxies `/api` → `http://localhost:5000` on port 5174 so the SPA runs alongside the backend.