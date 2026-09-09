// 운영 Firestore 에 **대시보드가 실제로 던지는 읽기**를 익명 클라이언트로 그대로 쏴 본다.
//
// 왜 이걸 하나
//   규칙 테스트(에뮬레이터)가 통과해도 운영에서 대시보드가 깨질 수 있다.
//   예전에 실제로 그랬다(#13 — usageStats 루트 목록). 페이지가 200 이라고 검증이 아니다.
//
// ⚠️ 읽기 전용이고 **내용을 찍지 않는다.** 허용/거부와 문서 개수만 본다.

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  getFirestore, collection, doc, getDoc, getDocs, query, limit,
} from 'firebase/firestore'

const cfg = {
  apiKey: process.env.FB_API_KEY,
  authDomain: 'morspeak-a5e46.firebaseapp.com',
  projectId: 'morspeak-a5e46',
  appId: process.env.FB_APP_ID,
}

const app = initializeApp(cfg)
const db = getFirestore(app)
await signInAnonymously(getAuth(app))

let denied = 0
async function probe(label, fn) {
  try {
    const n = await fn()
    console.log(`  ✓ ${label}${n === undefined ? '' : `  (${n}건)`}`)
  } catch (e) {
    denied++
    const msg = String(e?.code || e?.message || e).slice(0, 60)
    console.log(`  ✘ ${label}  → ${msg}`)
  }
}

const L = (path) => async () => (await getDocs(query(collection(db, ...path), limit(3)))).size
const G = (path) => async () => { await getDoc(doc(db, ...path)); return undefined }

// 막혀 있어야 정상인 것 — 막히면 ✓ 다
async function mustDeny(label, fn) {
  try {
    await fn()
    denied++
    console.log(`  ✘ ${label}  → 막혀야 하는데 통과했다`)
  } catch {
    console.log(`  ✓ ${label}  (차단됨)`)
  }
}

console.log('대시보드 목록 화면')
await probe('usageStats 루트 목록  (#13 에서 깨졌던 곳)', L(['usageStats']))
// 대시보드는 patients 를 **목록으로 읽지 않는다.** usageStats/{code}.loginId 로
// 아이디를 얻어 문서 하나만 가져간다. 루트 목록은 환자 전수 열람이라 막혀 있어야 한다.
await mustDeny('patients 루트 목록이 차단된다', async () => {
  await getDocs(query(collection(db, 'patients'), limit(1)))
})

// 실제 코드 하나를 잡아 상세 화면 경로를 따라간다
let code = null
try {
  const snap = await getDocs(query(collection(db, 'usageStats'), limit(1)))
  code = snap.docs[0]?.id ?? null
} catch { /* 위에서 이미 보고됨 */ }

if (!code) {
  console.log('\n환자 코드를 못 얻어서 상세 경로는 건너뛴다')
} else {
  console.log(`\n환자 상세 화면  (코드는 가림)`)
  await probe('usageStats/{code}',          G(['usageStats', code]))
  await probe('usageStats/{code}/daily',    L(['usageStats', code, 'daily']))
  await probe('usageStats/{code}/speaks',   L(['usageStats', code, 'speaks']))
  await probe('usageStats/{code}/sessions', L(['usageStats', code, 'sessions']))
  await probe('featureFlags/{code}',        G(['featureFlags', code]))
  await probe('blinkProfiles/{code}',       G(['blinkProfiles', code]))
  await probe('shortcuts/{code}',           G(['shortcuts', code]))
  await probe('deviceStatus/{code}',        G(['deviceStatus', code]))
  await probe('tutorialConfig/{code}',      G(['tutorialConfig', code]))
  await probe('youtubeSuggestions/{code}',  G(['youtubeSuggestions', code]))
  await probe('chats/{code}/messages',      L(['chats', code, 'messages']))
  // 교육 세션도 문서 하나로만 읽는다 (onSnapshot(doc(...)))
  await probe('educationSessions/{code}',   G(['educationSessions', code]))

  // 환자 상세는 usageStats/{code}.loginId 로 patients 문서 하나를 가져간다.
  // 이 경로가 막히면 상세 화면의 이름·연락처가 통째로 빈다.
  let loginId = null
  try {
    const s = await getDoc(doc(db, 'usageStats', code))
    loginId = s.data()?.loginId ?? null
  } catch { /* 위에서 보고됨 */ }
  if (loginId) {
    await probe('patients/{loginId}  (usageStats 를 거쳐서)', G(['patients', loginId]))
  } else {
    console.log('  – patients/{loginId}: usageStats 에 loginId 가 없어 건너뜀')
  }
}

// 상세 화면은 usageStats/{code}.loginId 로 patients 문서를 찾는다.
// 이 필드가 없는 문서는 상세 화면에서 이름·연락처가 통째로 빈다.
try {
  const all = await getDocs(collection(db, 'usageStats'))
  const missing = all.docs.filter((d) => !d.data()?.loginId).length
  console.log(`\nusageStats ${all.size}건 중 loginId 없는 문서: ${missing}건`
    + (missing ? '  ← 그 환자들은 상세 화면에서 이름·연락처가 빈다' : ''))
} catch {
  console.log('\nusageStats 전수 확인 실패 (목록 권한 없음)')
}

console.log(`\n거부된 읽기: ${denied}건`)
process.exit(denied === 0 ? 0 : 1)
