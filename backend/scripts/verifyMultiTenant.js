// Self-contained live multi-tenancy verification against real Firebase.
// Boots the app on a test port, provisions a super-admin + two institutions,
// exercises isolation / module-toggle / custom-module / feature-flag, then
// DELETES everything it created (auth users + institution subtrees).
//
// Run: node scripts/verifyMultiTenant.js

import 'dotenv/config';
import { createApp } from '../src/app.js';
import { authAdmin, db, admin } from '../src/config/firebase.js';

const PORT = 4099;
const BASE = `http://localhost:${PORT}/api`;
const stamp = Date.now();
const emails = {
  sa: `test-sa-${stamp}@example.com`,
  a: `test-admin-a-${stamp}@example.com`,
  b: `test-admin-b-${stamp}@example.com`,
};
const PW = 'Test1234!';

let pass = 0, fail = 0;
const created = { institutionIds: [], uids: [] };
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); };

// Minimal cookie-aware fetch.
async function api(method, path, { cookie, institutionId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (institutionId) headers['x-institution-id'] = institutionId;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCookie = res.headers.get('set-cookie');
  const session = setCookie ? setCookie.split(';')[0] : null;
  let data = null;
  try { data = await res.json(); } catch { /* non-json (e.g. pdf) */ }
  return { status: res.status, data, cookie: session };
}

async function bootstrapSuperAdmin() {
  const u = await authAdmin.createUser({ email: emails.sa, password: PW, displayName: 'Test SA' });
  created.uids.push(u.uid);
  await authAdmin.setCustomUserClaims(u.uid, { role: 'super-admin', institutionId: null });
  await db.collection('users').doc(u.uid).set({
    email: emails.sa, name: 'Test SA', role: 'super-admin', status: 'active',
    institutionId: null, archived: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return u.uid;
}

async function cleanup(server) {
  for (const id of created.institutionIds) {
    try { await db.recursiveDelete(db.collection('institutions').doc(id)); } catch (e) { console.error('cleanup inst', id, e.message); }
  }
  for (const uid of created.uids) {
    try { await authAdmin.deleteUser(uid); } catch { /* ignore */ }
    try { await db.collection('users').doc(uid).delete(); } catch { /* ignore */ }
  }
  server.close();
}

async function main() {
  const app = createApp();
  const server = app.listen(PORT);
  try {
    await bootstrapSuperAdmin();

    // Login super-admin
    const sa = await api('POST', '/auth/login', { body: { email: emails.sa, password: PW } });
    ok(sa.status === 200 && sa.data?.user?.role === 'super-admin', `super-admin login (${sa.status})`);
    const saCookie = sa.cookie;

    // Provision institution A and B (each with an admin)
    const provA = await api('POST', '/institutions', { cookie: saCookie, body: { name: 'College A', admin: { email: emails.a, password: PW, name: 'Admin A' } } });
    const provB = await api('POST', '/institutions', { cookie: saCookie, body: { name: 'College B', admin: { email: emails.b, password: PW, name: 'Admin B' } } });
    const A = provA.data?.institution?.id;
    const B = provB.data?.institution?.id;
    if (A) created.institutionIds.push(A);
    if (B) created.institutionIds.push(B);
    if (provA.data?.admin?.id) created.uids.push(provA.data.admin.id);
    if (provB.data?.admin?.id) created.uids.push(provB.data.admin.id);
    ok(!!A && !!B && A !== B, `provisioned two institutions A=${A} B=${B}`);

    // Login both admins
    const la = await api('POST', '/auth/login', { body: { email: emails.a, password: PW } });
    const lb = await api('POST', '/auth/login', { body: { email: emails.b, password: PW } });
    ok(la.status === 200 && la.data.user.institutionId === A, `admin A login scoped to A`);
    ok(lb.status === 200 && lb.data.user.institutionId === B, `admin B login scoped to B`);

    // 1. ISOLATION — A creates a student; B must not see it
    const s1 = await api('POST', '/students', { cookie: la.cookie, body: { name: 'Alice', gender: 'Female', dob: '2008-01-01', academicYear: '2026-27', className: 'PUC I', fatherMobile: '9999999999' } });
    ok(s1.status === 201, `A creates student S1 (${s1.status})`);
    const S1 = s1.data?.student?.id;
    const bList = await api('GET', '/students', { cookie: lb.cookie });
    ok(bList.status === 200 && !(bList.data.students || []).some((x) => x.id === S1), `B's student list excludes A's S1`);
    const bGet = await api('GET', `/students/${S1}`, { cookie: lb.cookie });
    ok(bGet.status === 404, `B GET A's student → 404 (${bGet.status})`);
    const aGet = await api('GET', `/students/${S1}`, { cookie: la.cookie });
    ok(aGet.status === 200, `A GET own student → 200 (${aGet.status})`);

    // 2. MODULE TOGGLE — super-admin disables fees for B
    await api('PATCH', `/institutions/${B}/modules`, { cookie: saCookie, body: { enabledModules: ['dashboard', 'students', 'settings'] } });
    const bFees = await api('GET', '/fees/heads', { cookie: lb.cookie });
    ok(bFees.status === 403 && bFees.data?.error?.details?.code === 'module-disabled', `B fees → 403 module-disabled (${bFees.status})`);
    const aFees = await api('GET', '/fees/heads', { cookie: la.cookie });
    ok(aFees.status === 200, `A fees still enabled → 200 (${aFees.status})`);
    const bCfg = await api('GET', '/institution/config', { cookie: lb.cookie });
    ok(!(bCfg.data?.enabledModules || []).includes('fees'), `B config omits fees`);

    // 3. CUSTOM MODULE — enable placements for A only
    await api('PATCH', `/institutions/${A}/modules`, { cookie: saCookie, body: { enabledModules: ['dashboard', 'students', 'fees', 'settings', 'placements'] } });
    const aPlace = await api('POST', '/placements', { cookie: la.cookie, body: { company: 'Acme', role: 'SDE', package: 12 } });
    ok(aPlace.status === 201, `A creates placement (custom module) → 201 (${aPlace.status})`);
    const bPlace = await api('GET', '/placements', { cookie: lb.cookie });
    ok(bPlace.status === 403, `B placements → 403 (not enabled) (${bPlace.status})`);

    // 4. FEATURE FLAG — A rounds fines to nearest 10; collect fine=23 → 20
    await api('PATCH', `/institutions/${A}/features`, { cookie: saCookie, body: { featureFlags: { fineRounding: 'nearest10' } } });
    const collect = await api('POST', '/fees/collect', { cookie: la.cookie, body: { studentId: S1, amount: 100, fine: 23, paymentMode: 'Cash' } });
    ok(collect.status === 201 && collect.data?.payment?.fine === 20, `A fine 23 → rounded to 20 via flag (got ${collect.data?.payment?.fine})`);

    // 5. CROSS-TENANT — super-admin platform view lists both
    const platform = await api('GET', '/dashboard/platform', { cookie: saCookie });
    const ids = (platform.data?.perInstitution || []).map((p) => p.institutionId);
    ok(platform.status === 200 && ids.includes(A) && ids.includes(B), `platform view lists A and B (${platform.status})`);

    // 6. TENANT-HOP GUARD — B admin sending A's header stays scoped to B
    const hop = await api('GET', '/students', { cookie: lb.cookie, institutionId: A });
    ok(hop.status === 200 && !(hop.data.students || []).some((x) => x.id === S1), `B admin + A header → still scoped to B (no leak)`);
  } catch (err) {
    console.error('TEST ERROR:', err);
    fail++;
  } finally {
    console.log('\nCleaning up test data...');
    await cleanup(server);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
