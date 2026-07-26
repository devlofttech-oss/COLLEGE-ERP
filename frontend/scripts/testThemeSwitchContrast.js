import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync('src/modules/students/components/Sidebar.jsx', 'utf8');
const cssSource = readFileSync('src/index.css', 'utf8');

const themeButtonClassCount = (sidebarSource.match(/erp-theme-mode-button/g) || []).length;
const ariaPressedCount = (sidebarSource.match(/aria-pressed=\{themeMode ===/g) || []).length;

assert.equal(themeButtonClassCount, 4, 'desktop and mobile Light/Dark buttons should carry erp-theme-mode-button');
assert.equal(ariaPressedCount, 4, 'desktop and mobile Light/Dark buttons should expose aria-pressed state');

const broadLightButtonResets = cssSource.match(/\.erp-shell\.light-mode button:not\([^{}]+?\{/g) || [];
const unsafeBroadReset = broadLightButtonResets.find((selector) => !selector.includes(':not(.erp-theme-mode-button)'));

assert.equal(unsafeBroadReset, undefined, `broad light-mode button reset must exclude theme buttons: ${unsafeBroadReset || ''}`);
assert.match(
  cssSource,
  /\.erp-shell\.light-mode \.erp-sidebar \.erp-sidebar-theme-switch > \.erp-theme-mode-button\.is-active[\s\S]*?background:#033500!important;/,
  'active light-mode sidebar theme button should be filled dark green',
);
assert.match(
  cssSource,
  /\.erp-shell\.light-mode \.erp-sidebar \.erp-sidebar-theme-switch > \.erp-theme-mode-button\.is-active svg,[\s\S]*?stroke:#ffffff!important;/,
  'active light-mode theme button icon should be white',
);

console.log('Theme switch contrast tests passed.');
