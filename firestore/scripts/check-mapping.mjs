import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const us = await db.collection('usageStats').get();
const noLogin = us.docs.filter(d => !d.get('loginId'));
let foundByQuery=0, notFound=0;
for (const d of noLogin) {
  const q = await db.collection('patients').where('chatCode','==',d.id).limit(1).get();
  if (!q.empty) foundByQuery++; else notFound++;
}
console.log(`loginId 없는 usageStats: ${noLogin.length}건`);
console.log(`  chatCode 쿼리로 patients 를 찾음: ${foundByQuery}`);
console.log(`  patients 문서가 아예 없음:       ${notFound}`);

// patients 컬렉션 전체에서 loginId 필드/문서ID 관계 확인
const pt = await db.collection('patients').get();
let idEqCode=0;
for (const p of pt.docs) if (p.get('chatCode') === p.id) idEqCode++;
console.log(`\npatients 문서 ${pt.size}건 (문서ID == chatCode 인 것: ${idEqCode})`);
