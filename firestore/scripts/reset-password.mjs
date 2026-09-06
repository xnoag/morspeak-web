// 보호자가 비밀번호를 잊었을 때 운영자가 재설정해서 알려주는 도구.
//
// 왜 "읽어서 알려주기" 가 아니라 "재설정해서 알려주기" 인가
//   보호자는 이미 잊은 상태다. 원래 값을 알려줄 필요가 없고, 새 값을 정해서 알려주면
//   보호자 경험은 같다. 그런데 저장 방식은 완전히 달라진다 — 해시로 저장하면
//   유출돼도 비밀번호가 나오지 않는다. 사람들은 같은 비밀번호를 은행·메일에도 쓰므로
//   평문 유출은 피해가 모스픽 밖으로 번진다.
//
//   "우리가 알려준다" 는 방식은 그대로 유지된다(2026-09-07 결정). 보호자가 고령이거나
//   이메일이 없는 경우가 많아 셀프 재설정 링크보다 이 경로가 더 맞다.
//
// 사용법
//   export GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
//   node reset-password.mjs <아이디>                  # 임시 비밀번호 자동 생성
//   node reset-password.mjs <아이디> --password 1234  # 직접 지정
//
//   아이디를 모르면 먼저 찾는다:  node find-account.mjs "홍길동"
//
// 안전장치
//   본인 확인 정보(환우명·보호자 이름·연락처)를 먼저 보여주고 y 를 입력해야 진행한다.
//   문의 메일에 적힌 값과 대조하는 것이 최소한의 확인이다.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { make, makeTempPassword } from './password-hash.mjs';

const args = process.argv.slice(2);
const loginId = args.find((a) => !a.startsWith('--'));
const pwIdx = args.indexOf('--password');
const givenPw = pwIdx >= 0 ? args[pwIdx + 1] : undefined;

if (!loginId) {
  console.error('아이디를 넣어라.  예: node reset-password.mjs testpatient01');
  console.error('아이디를 모르면:  node find-account.mjs "홍길동"');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 지정해야 한다.');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const ref = db.collection('patients').doc(loginId);
const snap = await ref.get();
if (!snap.exists) {
  console.error(`patients/${loginId} 문서가 없다. 아이디를 확인해라.`);
  console.error('find-account.mjs 로 환우명·연락처로 찾을 수 있다.');
  process.exit(1);
}

const d = snap.data();
const code = d.chatCode;
const us = code ? (await db.collection('usageStats').doc(String(code)).get()).data() ?? {} : {};
const info = { ...us, ...d };

console.log('\n본인 확인 — 문의 내용과 대조해라');
console.log('─'.repeat(52));
console.log(`  아이디      ${loginId}`);
console.log(`  환우명      ${info.userName ?? '-'}`);
console.log(`  생년월일    ${info.patientBirth ?? '-'}`);
console.log(`  보호자      ${info.guardianName ?? '-'} (${info.guardianRelation ?? '-'})`);
console.log(`  연락처      ${info.guardianPhone ?? '-'}`);
console.log('─'.repeat(52));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question('\n이 계정의 비밀번호를 재설정한다. 문의한 사람과 일치하나? (y/N) ')).trim();
rl.close();
if (answer.toLowerCase() !== 'y') {
  console.log('취소했다. 아무것도 바꾸지 않았다.');
  process.exit(0);
}

const newPw = givenPw ?? makeTempPassword();
const { salt, hash } = make(newPw);

await ref.update({
  passwordSalt: salt,
  passwordHash: hash,
  // 평문 필드가 남아있으면 함께 지운다. 이 계정은 이제 해시로만 검증된다.
  // (구 버전 앱은 평문만 비교하므로, 이 계정은 새 버전 앱에서만 로그인된다 —
  //  재설정을 안내할 때 앱을 최신으로 업데이트하라고 함께 알려줘야 한다)
  password: FieldValue.delete(),
  passwordResetAt: FieldValue.serverTimestamp(),
});

console.log('\n✅ 재설정 완료\n');
console.log('  보호자에게 이렇게 알려주면 된다:');
console.log('  ─'.repeat(24));
console.log(`   아이디     ${loginId}`);
console.log(`   비밀번호   ${newPw}`);
console.log('  ─'.repeat(24));
console.log('\n  ⚠️ 앱이 최신 버전이어야 로그인된다. 구 버전은 평문만 비교하므로');
console.log('     App Store 에서 업데이트하도록 함께 안내해라.');
console.log('\n  이 값은 지금 화면에만 있다. 저장되는 것은 해시뿐이라 다시 볼 수 없다.');
