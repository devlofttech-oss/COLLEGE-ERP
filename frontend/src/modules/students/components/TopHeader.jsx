import { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, MonitorSmartphone } from 'lucide-react';
import { defaultRoles, getRoleById } from '../../userRoles/rolePermissions';
import { logoutEverywhere } from '../../../api/auth';

// Teal Tiles top bar — clean and low-clutter: a warm greeting + the page title on
// the left; compact academic-year / course controls, search, notifications and a
// profile menu (with sign out) on the right. Keeps all the data props the shell
// already passes, so cross-module course/year context is preserved.
export default function TopHeader({
  title = 'Dashboard',
  academicYear,
  academicYears = [],
  courseCode = 'all',
  courses = [],
  onAcademicYearChange,
  onCourseChange,
  user,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const menuRef = useRef(null);

  const handleLogoutEverywhere = async () => {
    if (!window.confirm('Sign out of all devices? All active sessions will end immediately.')) return;
    setSigningOutAll(true);
    try { await logoutEverywhere(); } catch { /* best-effort */ }
    onLogout?.();
  };
  const roleId = user?.roleId || 'admin';
  const roleLabel = (getRoleById(defaultRoles, roleId)?.name || 'Admin');
  const name = user?.name || user?.displayName || user?.email || 'User';
  const firstName = String(name).trim().split(' ')[0];
  const initial = String(name).trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="tt-header">
      <div className="min-w-0">
        <div className="tt-welcome">Welcome back, {firstName} 👋</div>
        <h1 className="tt-title">{title}</h1>
      </div>

      <div className="tt-header-right">
        {courses.length > 0 && (
          <select className="tt-select" value={courseCode} onChange={(e) => onCourseChange?.(e.target.value)} aria-label="Course">
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.courseCode} value={c.courseCode}>{c.courseName || c.name || c.courseCode}</option>
            ))}
          </select>
        )}
        {academicYears.length > 0 && (
          <select className="tt-select" value={academicYear || academicYears[0]} onChange={(e) => onAcademicYearChange?.(e.target.value)} aria-label="Academic year">
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        <button type="button" className="tt-icon-btn" aria-label="Search"><Search size={19} /></button>
        <button type="button" className="tt-icon-btn" aria-label="Notifications"><Bell size={19} /><span className="tt-dot" /></button>

        <div className="tt-profile" ref={menuRef}>
          <button type="button" className="tt-profile-btn" onClick={() => setProfileOpen((o) => !o)}>
            <span className="tt-avatar-fallback">{initial}</span>
            <span className="tt-profile-name hidden sm:block">{name}</span>
            <ChevronDown size={16} className="text-muted" />
          </button>
          {profileOpen && (
            <div className="tt-profile-menu">
              <div className="tt-profile-meta">
                <div className="tt-profile-name-lg">{name}</div>
                <div className="tt-profile-role">{roleLabel}</div>
              </div>
              <button type="button" className="tt-profile-logout" onClick={onLogout}>
                <LogOut size={16} /> Sign out
              </button>
              <button type="button" className="tt-profile-logout" onClick={handleLogoutEverywhere} disabled={signingOutAll} style={{ opacity: signingOutAll ? 0.6 : 1, fontSize: '12px' }}>
                <MonitorSmartphone size={14} /> Sign out of all devices
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
