// QA 용 테스트 계정을 **에뮬레이터에** 심는다.
//
// 운영 Firestore 에는 절대 쓰지 않는다 — FIRESTORE_EMULATOR_HOST 가 없으면 즉시 종료한다.
// 로그인 이후 화면(자모 입력·단축어·기능 모드·설정)을 자동 테스트하려면 계정이 필요한데,
// 운영에 테스트 계정을 만들면 실제 환자 데이터와 섞이고 대시보드에도 나타난다.
//
// 실행:
//   firebase emulators:exec --only firestore,auth --project morspeak-a5e46 \
//     "node firestore/seed/seed-emulator.mjs"
//
// 계정: TESTSIM01 / 1234  (채팅 코드 TESTQA)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('❌ FIRESTORE_EMULATOR_HOST 가 없다. 이 스크립트는 에뮬레이터에서만 실행한다.');
  console.error('   firebase emulators:exec --only firestore,auth ... 로 감싸서 실행해라.');
  process.exit(1);
}

// 에뮬레이터에서는 자격증명이 필요 없다 — 아무 값이나 넣어도 통과한다.
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'morspeak-a5e46' });
const db = getFirestore();

// PasswordHash 와 동일 파라미터 (iOS/Android/Node 3플랫폼 일치)
const ITER = 200_000, KEYLEN = 32, SALTLEN = 16;
const salt = randomBytes(SALTLEN);
const hash = pbkdf2Sync(Buffer.from('1234', 'utf8'), salt, ITER, KEYLEN, 'sha256');

const LOGIN = 'TESTSIM01';
const CODE = 'TESTQA';

await db.collection('patients').doc(LOGIN).set({
  loginId: LOGIN,
  chatCode: CODE,
  userName: '테스트환우',
  passwordSalt: salt.toString('base64'),
  passwordHash: hash.toString('base64'),
  patientBirth: '1960년 05월 10일',
  diagnosis: 'G12.21 : 산발성 루게릭병(근위축성 측삭경화증)',
  guardianName: '테스트보호자',
  guardianRelation: '배우자',
  guardianAgeGroup: '50대',
  guardianPhone: '010-0000-0000',
  hospital: '테스트병원',
  privacyConsent: true,
  privacyConsentAt: FieldValue.serverTimestamp(),
  createdAt: FieldValue.serverTimestamp(),
});

await db.collection('usageStats').doc(CODE).set({
  userName: '테스트환우',
  userCode: CODE,
  loginId: LOGIN,
  lastUpdated: FieldValue.serverTimestamp(),
});

// 훈련을 마친 상태로 둔다 — 로그인 후 바로 메인 화면이 나와야 QA 가 편하다.
// (미완료면 화면 결정 캐스케이드가 waitingForTraining 으로 보낸다)
//
// ⚠️ BlinkProfile 의 **모든 필드**를 넣어야 한다.
//    BlinkProfileStore.syncFromCloud 가 JSONDecoder().decode(BlinkProfile.self) 를 쓰는데,
//    Swift 는 프로퍼티에 기본값이 있어도 **키가 없으면 디코딩이 실패한다**(합성된 init(from:)
//    은 기본값을 폴백으로 쓰지 않는다). 하나라도 빠지면 통째로 실패해서 조용히 기본값
//    프로필이 남고, isOnboardingComplete=false 라 대기 화면에 걸린다.
//    (2026-09-07 QA 에서 이것 때문에 로그인 후 메인 화면이 안 나왔다)
//
//    updatedAt 도 필요하다 — syncFromCloud 는 downloaded.updatedAt > profile.updatedAt
//    일 때만 반영한다. 로컬 기본값이 .distantPast 이므로 현재 시각을 넣는다.
await db.collection('blinkProfiles').doc(CODE).set({
  enterTh: 0.36,
  dotDashBoundary: 0.60,
  oneKeyDotDashBoundary: 0.45,
  oneKeyCommitInterval: 1.8,
  openL: 0.0,
  openR: 0.0,
  closeL: 0.65,
  closeR: 0.65,
  peakBuffer: [],
  shortBuffer: [],
  longBuffer: [],
  onboardingShortDurations: [0.2, 0.22, 0.19],
  onboardingLongDurations: [0.9, 0.95, 0.88],
  isOnboardingComplete: true,
  onboardingShortAttempts: [],
  onboardingLongAttempts: [],
  // JSONDecoder 의 기본 Date 전략은 timeIntervalSinceReferenceDate(2001-01-01 기준 초)다
  updatedAt: (Date.now() / 1000) - 978307200,
  blinkTimerInterval: 2.5,
  minBlinkOverride: 0.08,
  enterThOverride: 0.0,
});

// 단축어 몇 개 — 단축어 모드 QA 용
await db.collection('shortcuts').doc(CODE).set({
  items: ['물 주세요', '아파요', '자세 바꿔주세요', '고맙습니다'],
});

// 기능 버튼은 전부 켜둔다 — QA 에서 눌러봐야 하므로
await db.collection('featureFlags').doc(CODE).set({
  speak: true, sendMessage: true, call: true, lock: true,
  shortcut: true, functionMode: true, repeatSpeak: true,
  reset: true, delete: true, keyboardMode: true, commandMode: true,
  blinkDetection: true,
  // 미구현 기능은 꺼둔다 (안드로이드는 ANDROID_UNIMPLEMENTED 로 한 번 더 막힌다)
  youtube: false, outlet1: false, outlet2: false, outlet3: false, aiSuggest: false,
});

console.log('✅ 에뮬레이터에 테스트 계정을 심었다');
console.log(`   아이디 ${LOGIN} / 비밀번호 1234 / 채팅코드 ${CODE}`);
console.log('   훈련 완료 상태 · 단축어 4개 · 미구현 기능 off');
