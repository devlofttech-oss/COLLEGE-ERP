import { useMemo } from 'react';
import { GraduationCap } from 'lucide-react';
import { getEnabledModules, sortModulesByDisplayOrder, isModuleEnabledForInstitution } from '../../moduleRegistry';
import { canAccess, defaultRoles } from '../../userRoles/rolePermissions';

// Teal Tiles sidebar — a floating dark-teal rail: an app brand block at the top
// (logo slot + app name), then icon-over-label module items with a white rounded
// tile on the active one. Fixed + scrollable with a hidden scrollbar.
export default function Sidebar({ activePage, currentUser, onNavigate, appName = 'Collegesoft', appLogo, enabledModules = null }) {
  const currentRoleId = currentUser?.roleId || 'admin';
  const isSuperAdmin = currentRoleId === 'super-admin';
  const isAdmin = currentRoleId === 'admin';

  const navItems = useMemo(() => {
    const canShowHiddenModule = (module) => {
      if (module.id === 'dashboard') return isAdmin || isSuperAdmin;
      if (module.id === 'my-portal') return ['parent', 'student', 'teacher'].includes(currentRoleId);
      return isSuperAdmin;
    };
    const items = sortModulesByDisplayOrder(getEnabledModules()
      .filter((module) => !module.permission || canAccess(defaultRoles, currentRoleId, module.permission))
      .filter((module) => !module.hideFromSidebar || canShowHiddenModule(module))
      // Per-institution gating (fail-safe: shows all when enabledModules is null)
      .filter((module) => isSuperAdmin || isModuleEnabledForInstitution(module.id, enabledModules)));
    return items.map((module) => ({ id: module.id, label: module.label, icon: module.icon, status: module.status }));
  }, [currentRoleId, isAdmin, isSuperAdmin, enabledModules]);

  return (
    <aside className="tt-sidebar no-scrollbar">
      {/* App brand — drop the real app logo image into appLogo */}
      <div className="tt-brand">
        <div className="tt-brand-logo">
          {appLogo ? <img src={appLogo} alt="" className="h-full w-full object-contain rounded-[15px]" /> : <GraduationCap size={28} />}
        </div>
        <span className="tt-brand-name">{appName}</span>
      </div>

      <nav className="tt-nav">
        {navItems.map(({ id, label, icon: Icon, status }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`tt-nav-item ${active ? 'is-active' : ''}`}
              title={label}
            >
              <span className="tt-nav-icon"><Icon size={24} /></span>
              <span className="tt-nav-label">{label}</span>
              {(status === 'planned' || status === 'demo') && (
                <span className="tt-nav-badge">{status === 'planned' ? 'Soon' : 'Demo'}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
