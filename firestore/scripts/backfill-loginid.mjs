// usageStats/{chatCode}.loginId 를 채운다.
//
// ## 왜 필요한가
// 트래킹 대시보드의 환자 상세는 `usageStats/{code}.loginId` 로 `patients/{loginId}` 를
// **문서 하나만** 읽는다. 예전에는 `where('chatCode','==',code)` 쿼리였는데, 그러면
// 규칙에서 patients 의 list 를 열어야 하고 = 전 환자 문서를 통째로 긁을 수 있게 된다.
//
// 그래서 조회 방식을 바꿨는데, **옛 문서에는 loginId 가 없다.** 폴백도 없어서
// (app/tracking/patients/[code]/page.tsx:189) 그 환자들은 상세 화면에서
// 이름·연락처가 통째로 빈다. 2026-09-09 실측: 99건 중 75건.
//
// ## 하는 일
// patients 를 훑어 chatCode → loginId 지도를 만들고, loginId 가 없는 usageStats 문서에
// 그 값을 써 넣는다. **덮어쓰지 않는다** — 이미 있는 문서는 건드리지 않는다.
//
// ## 쓰는 법 (기본은 미리보기다)
//   export GOOGLE_APPLICATION_CREDENTIALS=…/serviceAccountKey.json
//   node backfill-loginid.mjs           # 무엇이 바뀔지만 보여준다
//   node backfill-loginid.mjs --apply   # 실제로 쓴다
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

// chatCode → loginId 지도. 한 코드에 환자가 둘이면 손대지 않는다(어느 쪽인지 알 수 없다).
const patients = await db.collection('patients').get();
const byCode = new Map();
const ambiguous = new Set();
for (const p of patients.docs) {
  const code = p.get('chatCode');
  if (!code) continue;
  if (byCode.has(code)) ambiguous.add(code);
  byCode.set(code, p.id);
}

const us = await db.collection('usageStats').get();
let already = 0, fixable = 0, noMatch = 0, skippedAmbiguous = 0;
const plan = [];
for (const d of us.docs) {
  if (d.get('loginId')) { already++; continue; }
  if (ambiguous.has(d.id)) { skippedAmbiguous++; continue; }
  const loginId = byCode.get(d.id);
  if (!loginId) { noMatch++; continue; }
  fixable++;
  plan.push({ code: d.id, loginId });
}

console.log(`patients ${patients.size}건 · usageStats ${us.size}건`);
console.log(`  loginId 이미 있음 : ${already}`);
console.log(`  채울 수 있음      : ${fixable}`);
console.log(`  짝을 못 찾음      : ${noMatch}   ← patients 에 그 chatCode 가 없다 (지워진 계정·테스트 등)`);
console.log(`  코드 중복이라 보류 : ${skippedAmbiguous}`);

if (!APPLY) {
  console.log('\n미리보기다. 실제로 쓰려면 --apply');
  process.exit(0);
}

let done = 0;
for (const { code, loginId } of plan) {
  await db.collection('usageStats').doc(code).set({ loginId }, { merge: true });
  done++;
}
console.log(`\n${done}건에 loginId 를 써 넣었다.`);
