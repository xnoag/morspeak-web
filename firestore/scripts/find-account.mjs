// 보호자가 아이디·비밀번호를 잊었을 때 계정을 찾아주는 조회 도구.
//
// /support 안내에 따라 보호자가 "환우명 / 보호자 이름 / 보호자 연락처" 를 적어 문의하면,
// 그 값으로 계정을 찾는다. Console 에서 손으로 뒤지지 않아도 된다.
//
// 사용법
//   export GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
//   node find-account.mjs "홍길동"              # 환우명·보호자명 부분 일치
//   node find-account.mjs "010-1234-5678"       # 연락처 (하이픈 있든 없든)
//   node find-account.mjs ABC123                # 채팅 코드
//   node find-account.mjs "홍길동" --show-password
//
// 비밀번호는 기본적으로 가려서 출력한다. --show-password 를 줘야 보인다.
// 화면 공유 중이거나 로그가 남는 환경에서 실수로 노출되는 것을 막기 위함이다.
//
// ⚠️ 이 도구가 필요한 것 자체가 지금 구조의 문제다.
//    비밀번호가 평문으로 저장돼 있어서 운영자가 "찾아줄" 수 있는 상태다.
//    Firebase Auth 로 옮기면 아무도(운영자 포함) 비밀번호를 볼 수 없고,
//    대신 보호자가 스스로 재설정하게 된다. 그게 목표 상태다.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const SHOW_PW = args.includes('--show-password');
const term = args.filter((a) => !a.startsWith('--')).join(' ').trim();

if (!term) {
  console.error('찾을 값을 넣어라. 예: node find-account.mjs "홍길동"');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 지정해야 한다.');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const digits = (s) => String(s ?? '').replace(/\D/g, '');
const termDigits = digits(term);
const norm = (s) => String(s ?? '').replace(/\s/g, '').toLowerCase();
const termNorm = norm(term);

// patients 가 계정의 원본이다(문서 ID = loginId). usageStats 는 대시보드용 사본이라
// 환우명·보호자 정보가 함께 있어서 검색 대상으로 같이 본다.
const [pSnap, uSnap] = await Promise.all([
  db.collection('patients').get(),
  db.collection('usageStats').get(),
]);

const usByCode = new Map(uSnap.docs.map((d) => [d.id, d.data()]));

const hits = [];
for (const p of pSnap.docs) {
  const d = p.data();
  const code = d.chatCode;
  const u = code ? usByCode.get(code) ?? {} : {};
  const merged = { ...u, ...d };

  const haystackText = [merged.userName, merged.guardianName, merged.hospital]
    .map(norm)
    .filter(Boolean);
  const haystackDigits = [merged.guardianPhone, merged.patientBirth].map(digits).filter(Boolean);

  const matched =
    p.id.toLowerCase() === term.toLowerCase() ||
    String(code ?? '').toLowerCase() === term.toLowerCase() ||
    haystackText.some((h) => h.includes(termNorm)) ||
    (termDigits.length >= 4 && haystackDigits.some((h) => h.includes(termDigits)));

  if (matched) hits.push({ loginId: p.id, code, merged });
}

if (hits.length === 0) {
  console.log(`"${term}" 으로 찾은 계정이 없다.`);
  console.log('환우명 일부, 보호자 이름, 보호자 연락처, 채팅 코드로 다시 시도해봐라.');
  process.exit(0);
}

console.log(`"${term}" — ${hits.length}건\n`);
for (const h of hits) {
  const m = h.merged;
  console.log('─'.repeat(52));
  console.log(`  아이디      ${h.loginId}`);
  console.log(`  채팅 코드   ${h.code ?? '(없음)'}`);
  console.log(`  비밀번호    ${SHOW_PW ? (m.password ?? '(없음)') : '**** (--show-password 로 표시)'}`);
  console.log(`  환우명      ${m.userName ?? '-'}`);
  console.log(`  생년월일    ${m.patientBirth ?? '-'}`);
  console.log(`  보호자      ${m.guardianName ?? '-'} (${m.guardianRelation ?? '-'})`);
  console.log(`  연락처      ${m.guardianPhone ?? '-'}`);
  console.log(`  병원        ${m.hospital ?? '-'}`);
}
console.log('─'.repeat(52));
console.log('\n본인 확인을 먼저 하고 알려줘라. 문의 메일에 적힌 보호자 이름·연락처가');
console.log('위 값과 일치하는지 대조하는 것이 최소한의 확인이다.');
