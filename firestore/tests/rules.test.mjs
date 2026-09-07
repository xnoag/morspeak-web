// Firestore 보안 규칙 단위 테스트
//
// 실행:  cd firestore/tests && npm test
//        (내부적으로 firebase emulators:exec 로 에뮬레이터를 띄운다 — 운영 DB 는 건드리지 않는다)
//
// 검증 목표 두 가지
//   1. 정상 클라이언트의 실제 접근 패턴이 전부 통과하는가
//      → 통과하지 않으면 배포 시 그 기능이 죽는다. 이게 제일 중요하다.
//   2. 전수 수집(list)과 임의 컬렉션 쓰기가 막히는가
//
// 접근 패턴은 클라이언트 6종(환자앱 iOS/AOS, 보호자앱 iOS/AOS, 판별앱, 웹) 코드에서
// 뽑았다. 근거는 ../firestore.rules 주석 참고.

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp,
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';

const CODE = 'ABC123';          // 채팅 코드
const LOGIN = 'testpatient01';  // 로그인 아이디

const testEnv = await initializeTestEnvironment({
  projectId: 'morspeak-rules-test',
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

// 인증되지 않은 컨텍스트 — 실제 클라이언트가 전부 이 상태다(앱·웹 모두 인증 없음)
const anon = testEnv.unauthenticatedContext().firestore();

let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); console.log(`  ✔ ${name}`); pass++; }
  catch (e) { console.log(`  ✘ ${name}\n      ${e.message.split('\n')[0]}`); fail++; }
}

console.log('\n── 정상 클라이언트 접근이 통과하는가 (깨지면 배포 시 기능이 죽는다) ──');

await check('환자앱: patients/{loginId} 읽기 — 로그인 검증', () =>
  assertSucceeds(getDoc(doc(anon, 'patients', LOGIN))));

await check('환자앱: patients 생성 — 회원가입', () =>
  assertSucceeds(setDoc(doc(anon, 'patients', LOGIN), { loginId: LOGIN, chatCode: CODE })));

await check('환자앱: usageStats/{code} 쓰기 — 사용 통계', () =>
  assertSucceeds(setDoc(doc(anon, 'usageStats', CODE), { userName: '테스트' })));

await check('환자앱: usageStats/{code}/daily/{day} 쓰기', () =>
  assertSucceeds(setDoc(doc(anon, 'usageStats', CODE, 'daily', '2026-09-07'), { n: 1 })));

await check('환자앱: usageStats/{code}/speaks 목록 조회', () =>
  assertSucceeds(getDocs(collection(anon, 'usageStats', CODE, 'speaks'))));

await check('환자앱: chats/{code}/messages 정렬 조회 — 실시간 채팅', () =>
  assertSucceeds(getDocs(query(
    collection(anon, 'chats', CODE, 'messages'), orderBy('clientTimestamp')))));

await check('환자앱: chats/{code}/messages 최신 1건', () =>
  assertSucceeds(getDocs(query(
    collection(anon, 'chats', CODE, 'messages'), orderBy('timestamp', 'desc'), limit(1)))));

await check('환자앱: featureFlags/{code} 단건 읽기 — 버튼 on/off', () =>
  assertSucceeds(getDoc(doc(anon, 'featureFlags', CODE))));

await check('환자앱: featureFlags 쓰기 — 설정 화면에서 입력 방식 변경', () =>
  assertSucceeds(setDoc(doc(anon, 'featureFlags', CODE), { oneKeyInput: true }, { merge: true })));

await check('환자앱: tutorialConfig/{code} 단건 읽기 — 원격 튜토리얼', () =>
  assertSucceeds(getDoc(doc(anon, 'tutorialConfig', CODE))));

await check('환자앱: blinkProfiles/{code} 읽기·쓰기 — 깜빡임 학습', () =>
  assertSucceeds(setDoc(doc(anon, 'blinkProfiles', CODE), { enterTh: 0.5 })));

await check('환자앱: shortcuts/{code} 읽기 — 단축어', () =>
  assertSucceeds(getDoc(doc(anon, 'shortcuts', CODE))));

await check('환자앱: snapshotRequests 처리 후 삭제', () =>
  assertSucceeds(deleteDoc(doc(anon, 'snapshotRequests', CODE))));

await check('환자앱: deviceTokens/{t}/logs/{type}/items 조회', () =>
  assertSucceeds(getDocs(collection(anon, 'deviceTokens', 'tok1', 'logs', 'blink', 'items'))));

await check('보호자앱: caregiverTokens 목록 조회', () =>
  assertSucceeds(getDocs(collection(anon, 'caregiverTokens'))));

await check('판별앱: screening_results 쓰기', () =>
  assertSucceeds(setDoc(doc(anon, 'screening_results', 'r1'), { ok: true })));

await check('웹: usageStats/{code} 단건 읽기 — 대시보드 진입', () =>
  assertSucceeds(getDoc(doc(anon, 'usageStats', CODE))));

await check('웹: loginId 로 patients 단건 읽기 — chatCode 쿼리 대체', () =>
  assertSucceeds(getDoc(doc(anon, 'patients', LOGIN))));

await check('웹: usageStats/{code}/daily 조회 — 하위 컬렉션은 허용', () =>
  assertSucceeds(getDocs(collection(anon, 'usageStats', CODE, 'daily'))));

await check('웹: waitlist 목록 조회', () =>
  assertSucceeds(getDocs(collection(anon, 'waitlist'))));

await check('웹: 계정 삭제 플로우 — patients 삭제', () =>
  assertSucceeds(deleteDoc(doc(anon, 'patients', LOGIN))));

console.log('\n── 전수 수집·임의 쓰기가 막히는가 ──');

await check('featureFlags 전체 목록 조회 차단 — 「호출」 원격 차단 방지', () =>
  assertFails(getDocs(collection(anon, 'featureFlags'))));

await check('tutorialConfig 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'tutorialConfig'))));

await check('blinkProfiles 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'blinkProfiles'))));

await check('shortcuts 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'shortcuts'))));

await check('educationSessions 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'educationSessions'))));

await check('snapshotRequests 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'snapshotRequests'))));

await check('deviceStatus 전체 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'deviceStatus'))));

await check('deviceTokens 루트 목록 조회 차단', () =>
  assertFails(getDocs(collection(anon, 'deviceTokens'))));

await check('patients 전수 수집 차단 — 평문 비밀번호가 아직 여기 있다', () =>
  assertFails(getDocs(collection(anon, 'patients'))));

await check('patients 를 chatCode 로 쿼리하는 것도 차단', () =>
  assertFails(getDocs(query(collection(anon, 'patients'), where('chatCode', '==', CODE)))));

// 🔴 이 검사는 예전에 `assertFails` 였다. 닫은 채로 배포했더니 트래킹 대시보드가
//   빈 화면이 됐다(그 화면은 환자 명단이고 루트 전수 조회가 기능 자체다).
//   지금은 **열려 있는 것이 사실**이므로 사실대로 고정한다 — 테스트가 규칙과
//   어긋난 상태로 남으면 다음 사람이 "닫혀 있다" 고 믿는다.
//   닫는 것은 대시보드를 서버 사이드로 옮긴 다음이다(3단계).
await check('usageStats 전수 수집은 아직 열려 있다 — 대시보드가 명단을 그린다', () =>
  assertSucceeds(getDocs(collection(anon, 'usageStats'))));

await check('patients 전수 수집은 닫혀 있다 — 평문 비밀번호가 여기 있다', () =>
  assertFails(getDocs(collection(anon, 'patients'))));

await check('알려지지 않은 컬렉션 쓰기 차단 — 스토리지·요금 남용 방지', () =>
  assertFails(setDoc(doc(anon, 'attacker_junk', 'x'), { a: 1 })));

await check('알려지지 않은 컬렉션 읽기 차단', () =>
  assertFails(getDoc(doc(anon, 'attacker_junk', 'x'))));

await check('재단 정산: 인증 없이 orgs 읽기 차단', () =>
  assertFails(getDoc(doc(anon, 'orgs', 'org1'))));

await check('featureFlags 삭제 차단', () =>
  assertFails(deleteDoc(doc(anon, 'featureFlags', CODE))));

await check('웹: 문의 폼 제출 — /contact', () =>
  assertSucceeds(addDoc(collection(anon, 'inquiries'), {
    kind: 'contact', organization: '테스트병원', name: '홍길동',
    phone: '010-0000-0000', email: 'a@b.com', message: '문의합니다',
    locale: 'ko', handled: false, createdAt: serverTimestamp(),
  })));

await check('웹: 소식 구독 제출 — /eng·/jpn', () =>
  assertSucceeds(addDoc(collection(anon, 'inquiries'), {
    kind: 'newsletter', email: 'a@b.com', locale: 'en',
    handled: false, createdAt: serverTimestamp(),
  })));

await check('웹: 문의 목록 조회 — /admin/inquiries', () =>
  assertSucceeds(getDocs(collection(anon, 'inquiries'))));

console.log('\n── 문의 폼이 공개 입구라서 검증되는가 (스팸·요금 남용 방지) ──');

await check('문의: 모르는 필드가 섞이면 차단 — 임의 데이터 저장소로 쓰이는 것 방지', () =>
  assertFails(addDoc(collection(anon, 'inquiries'), {
    kind: 'contact', junk: 'x'.repeat(100), createdAt: serverTimestamp(),
  })));

await check('문의: kind 가 정해진 둘 중 하나가 아니면 차단', () =>
  assertFails(addDoc(collection(anon, 'inquiries'), {
    kind: 'attacker', createdAt: serverTimestamp(),
  })));

await check('문의: 본문 2000자 초과 차단', () =>
  assertFails(addDoc(collection(anon, 'inquiries'), {
    kind: 'contact', message: 'a'.repeat(2001), createdAt: serverTimestamp(),
  })));

await check('문의: createdAt 을 직접 지정하면 차단 — 목록 앞에 끼워넣기 방지', () =>
  assertFails(addDoc(collection(anon, 'inquiries'), {
    kind: 'contact', createdAt: new Date(2000, 0, 1),
  })));

await check('문의: handled=true 로 만들어 처리된 척하는 것 차단', () =>
  assertFails(addDoc(collection(anon, 'inquiries'), {
    kind: 'contact', handled: true, createdAt: serverTimestamp(),
  })));

await testEnv.cleanup();

console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
if (fail > 0) {
  console.log('\n⚠️ 실패가 있으면 배포하지 말 것.');
  console.log('   "정상 클라이언트" 항목이 실패 = 배포 시 그 기능이 죽는다.');
  console.log('   "차단" 항목이 실패 = 규칙이 의도대로 막지 못한다.');
  process.exit(1);
}
console.log('전부 통과 — 규칙이 의도대로 동작한다.');
