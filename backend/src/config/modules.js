// Catalog of module ids the product ships. `enabledModules` on an institution is
// a subset of these. STANDARD modules are on by default for a new tenant; CUSTOM
// modules are bespoke features toggled on only for the clients that need them.

export const STANDARD_MODULES = [
  'dashboard',
  'students',
  'admissions',
  'attendance',
  'fees',
  'academics',
  'timetable',
  'examinations',
  'results',
  'staff',
  'communication',
  'reports',
  'settings',
];

// Bespoke modules present in the shared codebase, off by default.
export const CUSTOM_MODULES = ['placements'];

export const ALL_MODULE_IDS = [...STANDARD_MODULES, ...CUSTOM_MODULES];

export function isKnownModule(id) {
  return ALL_MODULE_IDS.includes(id);
}
