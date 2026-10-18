/* eslint-disable @typescript-eslint/no-require-imports */
// 운영 접근을 차단하고 demo- 에뮬레이터에서만 로그인·같은 원본·화면을 검증한다.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { initializeApp } = require(require.resolve('firebase-admin/app', { paths: [path.join(__dirname, '../firestore/seed')] }));
const { getFirestore, Timestamp } = require(require.resolve('firebase-admin/firestore', { paths: [path.join(__dirname, '../firestore/seed')] }));
const ts = require('typescript');
const root = path.join(__dirname, '..');
const origin = process.env.ADMIN_QA_ORIGIN || 'http://127.0.0.1:3107';
assert.equal(new URL(origin).hostname, '127.0.0.1', 'QA must use loopback');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:18080', 'Explicit local emulator required');
initializeApp({ projectId: 'demo-morspeak-admin' });
const db = getFirestore();
const out = process.env.ADMIN_QA_OUTPUT || path.join(root, '.next/admin-qa');
fs.mkdirSync(out, { recursive: true });
const synthetic = '가상 환우 01';

async function main() {
  const navExports = {};
  new Function('exports', ts.transpileModule(fs.readFileSync(path.join(root, 'lib/admin-navigation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(navExports);
  for (const value of [null, '//outside.example', 'https://outside.example', '/\\outside.example', '/admin/login', '/tracking/login', '/receipts/asannanumfoundation', '/admin-evil']) assert.equal(navExports.safeAdminRedirect(value), navExports.ADMIN_HOME);
  assert.equal(navExports.safeAdminRedirect('/admin/workspace/survey?stage=pre'), '/admin/workspace/survey?stage=pre');
  assert.equal(navExports.adminPath('/tracking/patients/QA01'), '/admin/workspace/tracking/patients/QA01');

  const now = Timestamp.now();
  const fixtures = {
    'usageStats/QA01': { userCode: 'QA01', userName: synthetic, loginId: 'QAUSER01', speakCount: 12, callCount: 3, totalSessionSeconds: 720, lastUpdated: now },
    'usageStats/QA02': { userCode: 'QA02', userName: '가상 환우 02', speakCount: 4, callCount: 1, totalSessionSeconds: 120, lastUpdated: now },
    'patients/QAUSER01': { userName: synthetic, diagnosis: '합성 검증', guardianName: '가상 보호자', guardianPhone: '010-0000-0000' },
    'blinkProfiles/QA01': { isOnboardingComplete: true, dotDashBoundary: .6 },
    'shortcuts/QA01': { items: ['합성 검증 문장'] },
    'youtubeSuggestions/QA01': { items: [] },
    'waitlist/qa-wait': { name: '가상 보호자', patientName: synthetic, phone: '010-0000-0000', region: '서울', contacted: false, note: '', createdAt: now },
    'screening_results/qa-screen': { patientName: synthetic, caregiverName: '가상 보호자', caregiverContact: '010-0000-0000', region: '서울', subRegion: '종로', communicationMethod: '눈 깜빡임', status: '미검토', createdAt: now, blinkLog: [{ step: 'short', attempt: 1, duration: .2, success: true }], videoUrl: null, deviceType: 'QA' },
    'survey_responses/qa-survey': { patientName: synthetic, caregiverName: '가상 보호자', surveyType: 'pre', recordStatus: 'recorded', answers: { A1: 'a' }, createdAt: now },
    'inquiries/qa-inquiry': { name: '가상 문의자', organization: '합성 기관', email: 'qa@example.invalid', message: '합성 문의입니다.', kind: 'contact', handled: false, createdAt: now },
    'training_slots/qa-training': { name: synthetic, date: '2026-10-20', time: '10:00', contactPhone: '010-0000-0000', bookedAt: '2026-10-18' },
    'review_sessions/qa-review': { patientName: synthetic, caregiverName: '가상 보호자', createdAt: '2026-10-18T00:00:00Z' },
  };
  for (const [doc, data] of Object.entries(fixtures)) await db.doc(doc).set(data);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.ADMIN_QA_CHROMIUM || undefined });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => {
    // 개발 전용 Next 표시가 제품의 계정 버튼을 가리지 않게 한다. 운영에는 표시되지 않는다.
    document.addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = 'nextjs-portal { display: none !important; }'; document.head.appendChild(style); });
  });
  const external = [], errors = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) { external.push(url.hostname); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', err => errors.push(err.message));
  const unauthorized = await context.request.get(origin + '/admin/workspace/tracking', { maxRedirects: 0 });
  assert.equal(unauthorized.status(), 307);
  assert.ok(unauthorized.headers().location.includes('/admin/login'));
  const invalid = await context.request.post(origin + '/api/admin/auth', { data: {} });
  assert.equal(invalid.status(), 401);
  await page.goto(origin + '/admin/login');
  await page.waitForFunction(() => { const input = document.querySelector('#admin-id'); return input && Object.keys(input).some(key => key.startsWith('__reactProps')); });
  await page.getByLabel('아이디', { exact: true }).fill('qa-admin');
  await page.getByLabel('비밀번호', { exact: true }).fill('qa-local-only');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL('**/admin/workspace/tracking');
  await page.getByRole('link', { name: synthetic + ' 상세', exact: true }).waitFor();
  const colors = await page.evaluate(() => ({ frame: getComputedStyle(document.querySelector('.admin-workspace')).backgroundColor, menu: getComputedStyle(document.querySelector('.admin-menu')).backgroundColor, radius: getComputedStyle(document.querySelector('.admin-workspace-surface')).borderRadius }));
  assert.deepEqual(colors, { frame: 'rgb(247, 247, 247)', menu: 'rgb(253, 253, 253)', radius: '18px' });
  await page.screenshot({ path: path.join(out, 'admin-workspace-desktop.png') });
  await page.getByPlaceholder('환우 검색...').fill(synthetic);
  await page.getByRole('link', { name: synthetic + ' 상세', exact: true }).click();
  await page.locator('[data-admin-page="patient"]').waitFor();
  assert.equal(await page.getByPlaceholder('환우 검색...').inputValue(), synthetic, 'List search remains mounted');
  await page.screenshot({ path: path.join(out, 'admin-workspace-detail.png') });
  await page.locator('.admin-tracking-detail').getByRole('link', { name: '목록', exact: true }).click();
  await page.waitForURL('**/admin/workspace/tracking');
  assert.equal(await page.getByPlaceholder('환우 검색...').inputValue(), synthetic, 'Closing detail keeps search');

  await page.getByRole('link', { name: '대기자', exact: true }).click();
  await page.locator('[data-admin-page="waitlist"]').getByText(synthetic, { exact: true }).waitFor();
  await page.locator('[data-admin-page="waitlist"] textarea').fill('통합 웹 합성 메모');
  await page.locator('[data-admin-page="waitlist"] h1').click();
  await page.waitForFunction(() => !document.querySelector('[data-admin-page="waitlist"] textarea')?.matches(':focus'));
  for (let i = 0; i < 30 && (await db.doc('waitlist/qa-wait').get()).data().note !== '통합 웹 합성 메모'; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal((await db.doc('waitlist/qa-wait').get()).data().note, '통합 웹 합성 메모');
  await page.goto(origin + '/waitlist/admin');
  // 기존 화면의 화면별 게이트는 그대로 둔다. 합성 시험에서만 번들 상수를 읽는다.
  const legacySource = fs.readFileSync(path.join(root, 'app/waitlist/admin/page.tsx'), 'utf8');
  const legacyPassword = legacySource.match(/const PW\s*=\s*['"]([^'"]+)/)[1];
  await page.getByPlaceholder('비밀번호', { exact: true }).fill(legacyPassword);
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await page.locator('textarea').waitFor();
  assert.equal(await page.locator('textarea').inputValue(), '통합 웹 합성 메모', 'Legacy reads same original');
  await page.locator('textarea').fill('기존 화면 합성 메모');
  await page.locator('h1').click();
  await page.goto(origin + '/admin/workspace/waitlist');
  await page.locator('textarea').waitFor();
  assert.equal(await page.locator('textarea').inputValue(), '기존 화면 합성 메모', 'Workspace reads legacy update');

  for (const [title, selector] of [['스크리닝·선정', 'screening'], ['설문 관리', 'survey'], ['설문 마인드맵', 'survey-map'], ['교육 신청', 'training'], ['후기', 'reviews'], ['문의', 'inquiries'], ['그룹 교육', 'group']]) {
    await page.getByRole('link', { name: title, exact: true }).click();
    await page.locator(`[data-admin-page="${selector}"]`).waitFor();
    assert.equal(await page.getByPlaceholder('비밀번호', { exact: true }).count(), 0, title + ' has no second login');
    if (selector === 'screening') {
      const row = page.locator('[data-admin-page="screening"] tbody tr').filter({ hasText: synthetic }).first();
      await row.waitFor();
      await row.click();
      await page.screenshot({ path: path.join(out, 'admin-screening-detail.png') });
      for (const tab of ['서비스 신청서', '종합', '최종', '대여관리', '일정']) await page.locator('[data-admin-tabs] button').filter({ hasText: tab }).click();
    }
  }
  await page.getByLabel('메뉴 검색', { exact: true }).fill('없는 메뉴');
  await page.getByText('일치하는 메뉴가 없습니다.').waitFor();
  await page.getByLabel('메뉴 검색', { exact: true }).fill('');
  await page.getByRole('link', { name: '사용 현황', exact: true }).last().click();
  await page.getByRole('link', { name: synthetic + ' 상세', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('.admin-menu').isVisible()) await page.getByRole('button', { name: '메뉴 표시 전환', exact: true }).click();
  await page.screenshot({ path: path.join(out, 'admin-workspace-mobile.png') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'No whole-page horizontal overflow');
  await page.getByRole('button', { name: '계정 메뉴', exact: true }).click();
  await page.getByRole('menu', { name: '계정' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('menu', { name: '계정' }).count(), 0);
  await page.getByRole('button', { name: '계정 메뉴', exact: true }).click();
  await page.getByRole('menuitem', { name: '로그아웃', exact: true }).click();
  await page.waitForURL('**/admin/login');
  const afterLogout = await context.request.get(origin + '/admin/workspace/screening', { maxRedirects: 0 });
  assert.equal(afterLogout.status(), 307);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  const report = { result: 'passed', project: 'demo-morspeak-admin', modules: 9, tested: ['login/logout/direct access', 'all menus without second login', 'tracking list/detail and search retention', 'legacy/workspace shared-data round trip', 'screening tabs', 'Gaon frame tokens', 'menu empty state', 'mobile overflow', 'account popover/Escape'], blockedExternalHosts: [...new Set(external)], productionWrites: 0, browserErrors: errors };
  fs.writeFileSync(path.join(out, 'admin-qa-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}
main().catch(error => { console.error(error.message); process.exit(1); });
