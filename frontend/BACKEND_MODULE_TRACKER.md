# Backend Module Frontend Tracker

Source of truth: backend routes under `backend/src/routes.js`.

Stitch is visual reference only. Frontend functionality must match backend modules, routes, permissions, and actions.

| Backend module | API prefix | Frontend status | Notes |
| --- | --- | --- | --- |
| Health | `/api/health` | Pending | Use for app readiness/status only. |
| Auth | `/api/auth` | Built | Backend login, session restore, logout, password reset. |
| Users | `/api/users` | Pending | Existing UI must be rewired to backend users API. |
| Roles | `/api/roles` | Pending | Existing UI must be rewired to backend roles and permission catalog. |
| Files | `/api/files` | Pending | Presigned upload/download/resolve/delete utility. Used by student document upload, but no standalone Files frontend yet. |
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
| Settings | `/api/settings` | Pending | Existing UI must be rewired to backend settings API. |
| Reports | `/api/reports` | Pending | Existing UI must be rewired to backend reports API. |
| Dashboard | `/api/dashboard` | Pending | Existing UI must be rewired to backend overview/activity APIs. |
| My Portal | `/api/my` | Pending | Parent/student/teacher self-view routes. |

Non-backend frontend modules to remove or fold into backend-backed modules:

| Current frontend module | Current route | Backend match |
| --- | --- | --- |
| Curriculum | `/modules/calendar` | No dedicated backend module. |
| Subject Notes | `/modules/subject-notes` | No dedicated backend module. |
| Hostel | `/modules/hostel-management` | No backend module. |
| Document Management | `/modules/document-management` | Must be replaced or folded into `/api/files` plus student/staff document endpoints. |
