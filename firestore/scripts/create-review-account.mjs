// Play·App Store 심사자용 계정을 운영에 만든다.
//
// ## 왜 필요한가
// 두 스토어 모두 로그인이 필요한 앱에는 **동작하는 계정**을 요구한다.
// QA 계정(TESTSIM01)은 에뮬레이터에만 있어서 그대로 제출하면 심사자가 로그인에 실패하고
// 「Guideline 2.1 - Information Needed」로 거부된다.
//
// ## 만드는 것
// 가입 흐름(PatientRegistration.kt / FirebaseManager.registerPatient)과 **같은 스키마**로
//   patients/{loginId}      로그인용 문서 (비밀번호는 해시+솔트만)
//   usageStats/{chatCode}   대시보드가 loginId 를 찾는 문서
//
// ## 지우는 법
// 심사가 끝나면 지운다. 앱 안의 「계정 삭제」로도 되고, 이 스크립트에 --delete 를 줘도 된다.
//
//   export GOOGLE_APPLICATION_CREDENTIALS=…/serviceAccountKey.json
//   node create-review-account.mjs            # 미리보기
//   node create-review-account.mjs --apply
//   node create-review-account.mjs --delete --apply
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { make } from './password-hash.mjs';

const APPLY = process.argv.includes('--apply');
const DELETE = process.argv.includes('--delete');

// 심사자용임이 한눈에 보이는 값으로 둔다 — 실제 환자와 헷갈리면 안 된다
const LOGIN_ID = 'storereview';
const PASSWORD = 'Review2026!';
const CHAT_CODE = 'STOREREV';
const USER_NAME = '스토어 심사용';

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

if (DELETE) {
  console.log(`삭제 대상: patients/${LOGIN_ID} · usageStats/${CHAT_CODE}`);
  if (!APPLY) { console.log('미리보기다. 실제로 지우려면 --apply'); process.exit(0); }
  await db.collection('patients').doc(LOGIN_ID).delete();
  await db.collection('usageStats').doc(CHAT_CODE).delete();
  console.log('지웠다.');
  process.exit(0);
}

const exists = (await db.collection('patients').doc(LOGIN_ID).get()).exists;
console.log(`아이디 ${LOGIN_ID} / 비밀번호 ${PASSWORD} / 채팅코드 ${CHAT_CODE}`);
console.log(`이미 있음: ${exists}`);
if (!APPLY) { console.log('\n미리보기다. 실제로 만들려면 --apply'); process.exit(0); }

const { salt, hash } = make(PASSWORD);

await db.collection('patients').doc(LOGIN_ID).set({
  loginId: LOGIN_ID,
  chatCode: CHAT_CODE,
  userName: USER_NAME,
  createdAt: FieldValue.serverTimestamp(),
  passwordSalt: salt,
  passwordHash: hash,
  patientBirth: '', diagnosis: '',
  guardianName: '모스픽', guardianRelation: '기타',
  guardianAgeGroup: '', guardianPhone: '010-7641-1026',
  hospital: '',
  privacyConsent: true,
  privacyConsentAt: FieldValue.serverTimestamp(),
  isStoreReviewAccount: true,   // 나중에 찾아 지우기 쉽게
}, { merge: true });

await db.collection('usageStats').doc(CHAT_CODE).set({
  userName: USER_NAME,
  userCode: CHAT_CODE,
  loginId: LOGIN_ID,
  lastUpdated: FieldValue.serverTimestamp(),
  guardianName: '모스픽', guardianPhone: '010-7641-1026',
  isStoreReviewAccount: true,
}, { merge: true });

// 기능이 전부 켜져 있어야 심사자가 앱을 제대로 본다
await db.collection('featureFlags').doc(CHAT_CODE).set({
  speak: true, sendMessage: true, call: true, lock: true,
  shortcut: true, functionMode: true, repeatSpeak: true,
  reset: true, delete: true, keyboardMode: true, commandMode: true,
  blinkDetection: true, youtube: true, aiSuggest: true,
  outlet1: false, outlet2: false, outlet3: false,
}, { merge: true });

console.log('만들었다. 심사가 끝나면 --delete --apply 로 지운다.');
