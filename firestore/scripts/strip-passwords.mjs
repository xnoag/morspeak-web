// usageStats 문서에 남아있는 평문 password 필드를 제거한다.
//
// 배경
//   registerPatient 이 비밀번호를 patients/{loginId} 와 usageStats/{chatCode} 두 곳에
//   평문으로 썼다. usageStats 는 웹 트래킹SW 가 목록 조회(list)하는 컬렉션이라,
//   개별 아이디를 몰라도 전 환자 비밀번호가 한 번에 수집될 수 있는 위치였다.
//   신규 저장은 Morspeak b5a9bb8 로 막았지만 **이미 저장된 문서는 그대로 남아 있다.**
//   이 스크립트가 그걸 지운다.
//
//   patients/{loginId} 의 password 는 건드리지 않는다 — verifyPatientLogin 이 읽으므로
//   지우면 전 환자가 로그인할 수 없게 된다. 그쪽은 Firebase Auth 이관이 선행돼야 한다.
//
// 사용법
//   export GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
//   node strip-passwords.mjs            # dry-run — 세어보기만 한다
//   node strip-passwords.mjs --apply    # 실제 삭제
//
// 안전장치
//   기본이 dry-run 이다. --apply 를 줘야 쓴다.
//   비밀번호 값·환자 이름은 출력하지 않는다. 문서 ID 도 앞 2글자만 보여준다.
//   삭제는 password 필드 하나만 지운다(FieldValue.delete()). 문서는 남는다.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!KEY) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 지정해야 한다.');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(KEY, 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

console.log(`프로젝트: ${sa.project_id}`);
console.log(`모드: ${APPLY ? '⚠️  실제 삭제' : 'dry-run (아무것도 지우지 않음)'}\n`);

const snap = await db.collection('usageStats').get();
console.log(`usageStats 문서: ${snap.size}건`);

const targets = snap.docs.filter((d) => d.get('password') !== undefined);
console.log(`password 필드가 남아있는 문서: ${targets.length}건\n`);

if (targets.length === 0) {
  console.log('정리할 것이 없다.');
  process.exit(0);
}

// 어떤 문서인지 최소한만 보여준다 — 값은 절대 출력하지 않는다
console.log('대상 (문서 ID 앞 2글자만):');
for (const d of targets.slice(0, 20)) {
  console.log(`  ${d.id.slice(0, 2)}${'*'.repeat(Math.max(0, d.id.length - 2))}`);
}
if (targets.length > 20) console.log(`  … 외 ${targets.length - 20}건`);

if (!APPLY) {
  console.log('\ndry-run 이라 지우지 않았다. 실제로 지우려면 --apply 를 붙여라.');
  process.exit(0);
}

console.log('\n삭제 중…');
let done = 0;
// 배치는 500건 제한
for (let i = 0; i < targets.length; i += 400) {
  const batch = db.batch();
  for (const d of targets.slice(i, i + 400)) {
    batch.update(d.ref, { password: FieldValue.delete() });
  }
  await batch.commit();
  done += Math.min(400, targets.length - i);
  console.log(`  ${done}/${targets.length}`);
}

// 검증
const after = await db.collection('usageStats').get();
const left = after.docs.filter((d) => d.get('password') !== undefined).length;
console.log(`\n완료. 남은 password 필드: ${left}건`);
if (left > 0) console.log('⚠️ 남은 것이 있다 — 다시 실행하거나 원인을 확인할 것.');
