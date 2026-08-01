# Backend Module Frontend Tracker

Source of truth: backend routes under `backend/src/routes.js`.

Stitch is visual reference only. Frontend functionality must match backend modules, routes, permissions, and actions.

Current backend module coverage: 19/19 built, 0 remaining.

| Backend module | API prefix | Frontend status | Notes |
| --- | --- | --- | --- |
| Health | `/api/health` | Built | Covered inside Settings as system status for backend status, service, Firebase readiness, R2 readiness, and time. |
| Auth | `/api/auth` | Built | Backend login, session restore, logout, password reset. |
| Users | `/api/users` | Built | Backend-backed user list/detail, create, update, role change, student linking, archive, and restore. |
| Roles | `/api/roles` | Built | Backend-backed role list, permission catalog, permission override save, and reset to defaults. |
| Files | `/api/files` | Built | Backend-backed presign upload, direct PUT upload, presign download, resolve URL, and delete object by key. |
| Academics | `/api/academics` | Built | Backend-backed academic years, courses, classes, sections, subjects, teacher allocations. |
| Students | `/api/students` | Built | Backend-backed list/search/filter, create/edit, archive/restore, import/export, document upload/metadata with verify/reject, promotion/transfer, ID card data/PDF. |
| Admissions | `/api/admissions` | Built | Backend-backed enquiries, applications, follow-ups, approval/rejection, conversion to student, archive/restore. |
| Staff | `/api/staff` | Built | Backend-backed staff records, departments, staff documents, and staff login creation. |
| Attendance | `/api/attendance` | Built | Backend-backed student/staff date attendance marking plus daily, monthly, and student percentage reports. |
| Fees | `/api/fees` | Built | Backend-backed fee heads, structures, assignments, collections, receipts, dues, reminders, and online payment hook. |
| Timetable | `/api/timetable` | Built | Backend-backed periods, class timetable, teacher timetable, entry create/update with conflict override, and archive actions. |
| Examinations | `/api/examinations` | Built | Backend-backed exams, schedules, marks entry, verification, and unlock actions. |
| Results | `/api/results` | Built | Backend-backed grade settings, result processing/listing, publish, lock/unlock, report card/PDF, and history. |
| Communication | `/api/communication` | Built | Backend-backed notices, send action, delivery status, and message templates. |
| Settings | `/api/settings` | Built | Backend-backed institution, branding, integrations, and backup settings. |
| Reports | `/api/reports` | Built | Backend-backed report registry, named report runner, supported query filters, table results, summaries, and CSV export. |
| Dashboard | `/api/dashboard` | Built | Backend-backed overview cards, admissions/fees summaries, upcoming exams, latest notices, and recent audit activities. |
| My Portal | `/api/my` | Built | Backend-backed parent/student linked profile, attendance, fees, timetable, exams, results, notices, downloads, teacher classes, and teaching timetable self-view routes. |

Legacy frontend-only module cleanup:

| Legacy frontend module | Former route | Current handling |
| --- | --- | --- |
| Curriculum | `/modules/calendar` | Removed from registry and routing because there is no backend module. |
| Subject Notes | `/modules/subject-notes` | Removed from registry and routing because there is no backend module. File storage still supports the backend `subject-notes` folder through Files. |
| Hostel | `/modules/hostel-management` | Removed from registry and routing because there is no backend module. |
| Document Management | `/modules/document-management` | Folded to Files for old links; student/staff document workflows remain inside Students and Staff. |
| Financial Reports | `/modules/financial-reports` | Folded to backend Reports. |
| Parent Portal | `/modules/parent-portal` | Folded to backend My Portal. |
