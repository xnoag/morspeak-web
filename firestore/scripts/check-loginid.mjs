// usageStats 문서에 loginId 가 항상 있는지 — patients 조회를 get 으로 바꿀 수 있는지 판단용
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const us = await db.collection('usageStats').get();
let withLogin=0, withoutLogin=0, resolvable=0, docIdIsCode=0;
for (const d of us.docs) {
  const loginId = d.get('loginId');
  if (loginId) {
    withLogin++;
    const p = await db.collection('patients').doc(String(loginId)).get();
    if (p.exists) resolvable++;
  } else {
    withoutLogin++;
    // loginId 가 없어도 patients/{code} 가 바로 존재하면 get 으로 해결된다
    const direct = await db.collection('patients').doc(d.id).get();
    if (direct.exists) docIdIsCode++;
  }
}
console.log(`usageStats 문서 ${us.size}건`);
console.log(`  loginId 있음: ${withLogin}  (그중 patients 문서 존재: ${resolvable})`);
console.log(`  loginId 없음: ${withoutLogin}  (그중 patients/{code} 가 바로 존재: ${docIdIsCode})`);
console.log(`\n→ get 두 번으로 해결 가능: ${resolvable + docIdIsCode} / ${us.size}`);
