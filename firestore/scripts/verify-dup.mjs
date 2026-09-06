// usageStats 의 password 가 patients 쪽에도 있는지 확인 — 값은 출력하지 않는다
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const snap = await db.collection('usageStats').get();
const targets = snap.docs.filter(d => d.get('password') !== undefined);
let safe=0, noLoginId=0, noPatientDoc=0, mismatch=0;
const risky=[];
for (const d of targets) {
  const loginId = d.get('loginId');
  if (!loginId) { noLoginId++; risky.push(`${d.id.slice(0,2)}** loginId 필드 없음`); continue; }
  const p = await db.collection('patients').doc(String(loginId)).get();
  if (!p.exists) { noPatientDoc++; risky.push(`${d.id.slice(0,2)}** patients 문서 없음`); continue; }
  const pw = p.get('password');
  if (pw === undefined) { noPatientDoc++; risky.push(`${d.id.slice(0,2)}** patients 에 password 없음`); continue; }
  if (pw !== d.get('password')) { mismatch++; risky.push(`${d.id.slice(0,2)}** 값 불일치`); continue; }
  safe++;
}
console.log(`대상 ${targets.length}건`);
console.log(`  안전(patients 에 동일 값 존재): ${safe}`);
console.log(`  loginId 필드 없음: ${noLoginId}`);
console.log(`  patients 문서/필드 없음: ${noPatientDoc}`);
console.log(`  값 불일치: ${mismatch}`);
if (risky.length) { console.log('\n주의 대상:'); risky.forEach(r=>console.log('  '+r)); }
