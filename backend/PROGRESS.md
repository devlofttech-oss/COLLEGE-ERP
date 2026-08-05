# Backend Build Progress

## ✅ Multi-tenancy + per-institution customization (LIVE-VERIFIED, 16/16)

One shared deployment serves all colleges. Verified end-to-end against real Firebase
(`scripts/verifyMultiTenant.js` — provisions 2 tenants, proves isolation/toggle/custom-
module/feature-flag/tenant-hop guard, then cleans up).

**How it works**
- Tenant data → subcollections `institutions/{id}/{collection}`. Global collections: `institutions`, `users`.
- Per-request tenant context via `AsyncLocalStorage` (`src/utils/institutionContext.js`), set inside
  `requireAuth`. `repo()` + `institutionCollection()` resolve the right tenant path transparently.
- `repo.list` sends only equality filters to Firestore and does ordering/ranges/limit in memory →
  **no composite indexes to manage**.
- Devloft `super-admin` (institutionId=null) provisions tenants + toggles modules:
  `POST /api/institutions`, `PATCH /api/institutions/:id/modules|features`, `GET /api/dashboard/platform`.
- Module gating: `requireModule('x')` on each business router → 403 `module-disabled` if not in the
  tenant's `enabledModules` (super-admin bypasses). Frontend reads `GET /api/institution/config`.

**Adding / customizing features (the payoff)**
- New standard module → build with `repo()`, add to `STANDARD_MODULES` (`src/config/modules.js`).
- Custom module for one client → build it (see `src/modules/placements/` reference), add to
  `CUSTOM_MODULES`, enable per-tenant via `enabledModules`. Auto tenant-scoped, isolated.
- Modify an existing feature for one college → branch on CONFIG, never on a college id:
  `getFeatureFlag('key')` (see fee `fineRounding` in `src/modules/fees/fees.service.js`), or a
  per-tenant `settings`/`branding` value. Any college enables it by setting the flag.

**First super-admin:** `node scripts/createSuperAdmin.js <email> <password>` then `POST /api/institutions`.

---


Single backend API for the College ERP (web + mobile frontends).
**Stack:** Node.js + Express (ESM) · Firebase Admin (Firestore + Auth) · Cloudflare R2 (files) · deploy to Vercel serverless.

Spec source: `School_College_Management_ERP_Product_Specification (1).md` (all 12 modules).
Frontend (reference for data shapes) lives in `../frontend`.

**Status: all 12 spec modules built, wired, and import/syntax-verified.** 54 source files.
Every protected route gates on auth (401 without session) and permissions. Pure business logic unit-tested (11/11).
Live data flow needs Firebase + R2 credentials (see setup) — not yet provided.

---

## ✅ Built

| Phase | Module | Routes prefix | Highlights |
|------|--------|---------------|-----------|
| 0 | Foundation | — | Express app, config (env/firebase/r2), error handling, CORS+cookies, health, Vercel entry |
| 1 | Auth | `/api/auth` | Backend-owned login (Firebase REST password check → Admin SDK session cookie), me, logout, password-reset |
| 1 | Users | `/api/users` | Create Firebase Auth user + Firestore profile, role change, archive/restore |
| 1 | Roles | `/api/roles` | Permission matrix (spec §9), runtime permission overrides, catalog |
| 2 | Files (R2) | `/api/files` | Presigned direct-to-R2 upload, presigned download, per-folder type/size policy |
| 3 | Academics | `/api/academics` | academic-years (+set-current), courses, classes, sections, subjects, teacher-allocations |
| 4 | Students | `/api/students` | CRUD, search, documents (verify/reject), promote/transfer, bulk import, CSV export, ID-card |
| 5 | Admissions | `/api/admissions` | Enquiry→followup→application→approve/reject→convert-to-student |
| 6 | Staff | `/api/staff` | Profiles, departments, documents, create-login |
| 7 | Attendance | `/api/attendance` | Student+staff marking (idempotent), daily/monthly/%/reports |
| 8 | Fees | `/api/fees` | Heads, structures, assignments, collect (partial/discount/fine), receipts, dues, reminders, gateway hook |
| 9 | Timetable | `/api/timetable` | Periods, entries with teacher/room conflict check, class/teacher views |
| 10 | Examinations | `/api/examinations` | Exams, schedules, marks entry (bulk), verify/lock, unlock |
| 11 | Results | `/api/results` | Process from verified marks, %/grade/rank, publish, lock, report-card, history, grade settings |
| 12 | Communication | `/api/communication` | Notices (audience+attachments+channels), templates, multi-channel dispatch hooks |
| 13 | Settings | `/api/settings` | Institution, branding, integrations (masked secrets), backup |
| 13 | Reports | `/api/reports` | Report registry (students/admissions/fees/staff), JSON + CSV export |
| 14 | Dashboard | `/api/dashboard` | Aggregated summary cards, recent activities from audit log |

**Cross-cutting done:** soft-delete/archive everywhere · audit logging on sensitive actions ·
`createdBy/updatedBy` stamping · reusable `crudController` + `repo` helpers.

### Added after core build
- **PDF generation** (`src/services/pdf.service.js`, pdfkit) — real PDFs for:
  - Fee receipt → `GET /api/fees/receipts/:paymentId/pdf`
  - Report card → `GET /api/results/report-card/pdf?examId=&studentId=`
  - ID card → `GET /api/students/:id/id-card/pdf`
  Verified: all three emit valid `%PDF` buffers. Institution header pulled from Settings.
- **Mobile-support / Portal** (`/api/my`, `src/modules/portal`) — self-scoped, server-enforced ownership:
  - Parent/Student: `/my/{students,profile,attendance,fees,timetable,exams,results,notices,downloads}`
    (a user only ever sees their **linked** student's data).
  - Teacher: `/my/{classes,teaching-timetable}` (scoped to assigned allocations).
  - Account linking: `linkedStudentIds` on user profiles + `PATCH /api/users/:uid/linked-students`
    (and accepted at user creation).

---

## ⚠️ Intentional stubs / hooks (need external creds)

These are wired with the right structure but return `not-configured` / `503` until enabled:
- **Payment gateway** (`/api/fees/pay/order`) — Razorpay/Cashfree/PhonePe. **Not needed now** (per product owner); hook left in place. Note: the earlier frontend never implemented online payment either — it was only a disabled settings toggle.
- **Communication channels** — SMS / WhatsApp / email / FCM push; delivery marked `not-configured`
  until `SMS_API_KEY` / `WHATSAPP_API_KEY` / `EMAIL_API_KEY` / `FCM_SERVER_KEY` set. FCM push is the
  only piece the mobile app still waits on (all mobile DATA endpoints work without it).

## 🔧 Known follow-ups
- Firestore **composite indexes** for multi-field filtered queries — create when first hit in prod (Firebase console will link them).
- Dashboard aggregates scan collections in-memory — fine at institution scale; move to maintained counters if data grows large.
- Add automated integration tests once a Firestore emulator or test project is available.

---

## ▶️ Run / resume

```bash
cd backend
npm install
cp .env.example .env      # fill Firebase + R2 values
npm run dev               # http://localhost:4000/api/health
```

### Required credentials before live testing
- `FIREBASE_WEB_API_KEY` — Firebase console → Project settings → General.
- `FIREBASE_SERVICE_ACCOUNT` — service-account JSON (one line) OR drop `serviceAccountKey.json` in `backend/`.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- `CORS_ORIGINS` — frontend origins (comma-separated), needed for cookie auth.

### First-admin bootstrap
Login requires a `users/{uid}` doc with a role. For a fresh project, create the first Firebase Auth user
+ a `users` doc `{ role: "super-admin", status: "active" }` (console or seed script), then manage everyone
else via `/api/users`.

## Architecture conventions
- Each module = `service.js` (logic) + `routes.js` (thin, permission-gated), mounted in `src/routes.js`.
- `src/utils/firestore.js#repo(name)` gives list/get/create/update/archive/restore with timestamps + soft-delete.
- `requireAuth` → resolves user + effective permissions; `requirePermission('x.y')` gates each route.
- Never hard-delete; always archive. Sensitive actions call `recordAudit(...)`.
