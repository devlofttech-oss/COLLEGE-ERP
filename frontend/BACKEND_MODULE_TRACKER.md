# Backend Module Frontend Tracker

Source of truth: backend routes under `backend/src/routes.js`.

Stitch is visual reference only. Frontend functionality must match backend modules, routes, permissions, and actions.

| Backend module | API prefix | Frontend status | Notes |
| --- | --- | --- | --- |
| Health | `/api/health` | Pending | Use for app readiness/status only. |
| Auth | `/api/auth` | Built | Backend login, session restore, logout, password reset. |
| Users | `/api/users` | Pending | Existing UI must be rewired to backend users API. |
| Roles | `/api/roles` | Pending | Existing UI must be rewired to backend roles and permission catalog. |
| Files | `/api/files` | Pending | Presigned upload/download/resolve/delete utility. |
| Academics | `/api/academics` | Built | Backend-backed academic years, courses, classes, sections, subjects, teacher allocations. |
| Students | `/api/students` | Pending | Existing UI must be rewired to backend students API. |
| Admissions | `/api/admissions` | Pending | Needs backend-backed enquiries/applications/followups/approval/conversion. |
| Staff | `/api/staff` | Pending | Existing UI must be rewired to backend staff API. |
| Attendance | `/api/attendance` | Pending | Existing UI must be rewired to backend attendance API. |
| Fees | `/api/fees` | Pending | Existing UI must be rewired to backend fee APIs. |
| Timetable | `/api/timetable` | Pending | Existing UI must be rewired to backend timetable APIs. |
| Examinations | `/api/examinations` | Pending | Existing UI must be rewired to backend exam/schedule/marks APIs. |
| Results | `/api/results` | Pending | Existing UI must be rewired to backend result/report-card APIs. |
| Communication | `/api/communication` | Pending | Existing UI must be rewired to backend notices/templates APIs. |
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
