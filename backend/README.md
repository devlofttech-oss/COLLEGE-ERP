# College ERP — Backend API

Single backend for the College ERP web + mobile frontends.

- **Runtime:** Node.js ≥ 18, Express (ESM)
- **Auth + data:** Firebase (Admin SDK — Firestore + Auth). Login is backend-owned:
  the frontend posts credentials, the backend verifies the password via Firebase and
  returns an HTTP-only **session cookie**. Frontends never touch Firebase directly.
- **Files:** Cloudflare R2 (S3-compatible). Uploads go **browser → R2** via presigned URLs
  (bypasses Vercel's request-body limit); only the object key/URL is stored in Firestore.
- **Deploy:** Vercel serverless (`api/index.js` + `vercel.json`). Runs locally via `server.js`.

## Quick start

```bash
npm install
cp .env.example .env      # fill in Firebase + R2 values
npm run dev               # http://localhost:4000
curl http://localhost:4000/api/health
```

See **PROGRESS.md** for build status, credential setup, and the first-admin bootstrap.

## Project layout

```
backend/
├── api/index.js              # Vercel entry (exports the Express app)
├── server.js                 # local dev entry (listens on PORT)
├── vercel.json               # routes all requests → api/index.js
├── src/
│   ├── app.js                # Express assembly (CORS, cookies, routes, errors)
│   ├── routes.js             # mounts every module router under /api
│   ├── config/               # env, firebase (Admin), r2 (S3 client), permissions matrix
│   ├── middleware/           # requireAuth, requirePermission, error handling
│   ├── services/             # firebaseAuth, storage (R2), audit
│   ├── utils/                # repo (Firestore CRUD), crudController, validate, ApiError
│   └── modules/              # one folder per feature (service + routes)
│       ├── auth/  users/  roles/  files/
│       ├── academics/  students/  admissions/  staff/
│       ├── attendance/  fees/  timetable/  examinations/  results/
│       └── communication/  settings/  reports/  dashboard/
├── firebase.json .firebaserc firestore.rules storage.rules   # Firebase project config
```

## API surface (all under `/api`, all require the session cookie except where noted)

| Prefix | Purpose |
|--------|---------|
| `GET /health` | Readiness (public) — reports firebase/r2 config status |
| `/auth` | `POST /login`, `POST /logout`, `GET /me`, `POST /password-reset` |
| `/users` | User management (create login, role change, archive/restore) |
| `/roles` | Roles + permission matrix, runtime permission overrides |
| `/files` | `POST /presign-upload`, `GET /presign-download`, `GET /resolve` |
| `/academics` | academic-years, courses, classes, sections, subjects, teacher-allocations |
| `/students` | CRUD, search, `/documents`, `/promote`, `/transfer`, `/import`, `/export`, `/id-card` |
| `/admissions` | enquiries → followups → approve/reject → `/convert` |
| `/staff` | profiles, `/departments`, `/documents`, `/create-login` |
| `/attendance` | `/mark`, `/staff/mark`, `/reports/{daily,monthly,student-percentage}` |
| `/fees` | `/heads`, `/structures`, `/assignments`, `/collect`, `/dues`, `/receipts`, `/remind` |
| `/timetable` | `/periods`, `/entries` (conflict-checked), `/class`, `/teacher` |
| `/examinations` | `/exams`, `/schedules`, `/marks`, `/marks/verify` |
| `/results` | `/process`, `/publish`, `/report-card`, `/grade-settings`, `/history/:studentId` |
| `/communication` | `/notices` (+ `/send`), `/templates` |
| `/settings` | `/institution`, `/branding`, `/integrations`, `/backup` |
| `/reports` | `GET /` (list), `GET /:name`, `GET /:name/export` (CSV) |
| `/dashboard` | `/overview`, `/recent-activities` |
| `/my` | Mobile self-view (own data only): `/profile`, `/attendance`, `/fees`, `/timetable`, `/exams`, `/results`, `/notices`, `/downloads`; teacher: `/classes`, `/teaching-timetable` |

**PDF endpoints** (stream `application/pdf`): `GET /fees/receipts/:id/pdf`, `GET /results/report-card/pdf`, `GET /students/:id/id-card/pdf`.

Auth flow, permission model, and conventions are documented in **PROGRESS.md**.
