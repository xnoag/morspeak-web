// 깜빡임 입력이 실제로 끊겼는지 **사용 기록으로** 확인한다. 읽기 전용 · 이름 안 찍는다.
//
// 왜 (2026-09-11)
//   "임계값이 높아서 못 쓴다" 는 건 지금까지 추론이었다. 근거는 blinkProfiles 의 숫자뿐.
//   usageStats/{code}/daily 에 날짜별 입력 수가 쌓여 있으니 **실제로 줄었는지** 보면 된다.
//   줄었으면 추론이 아니라 사실이다.
//
//   FB_API_KEY=… FB_APP_ID=… node check-input-collapse.mjs [코드...]
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore'

const app = initializeApp({ apiKey: process.env.FB_API_KEY, authDomain: 'morspeak-a5e46.firebaseapp.com', projectId: 'morspeak-a5e46', appId: process.env.FB_APP_ID })
const db = getFirestore(app); await signInAnonymously(getAuth(app))

const codes = process.argv.slice(2)
if (!codes.length) { console.error('채팅코드를 하나 이상 주세요'); process.exit(1) }

for (const code of codes) {
  const prof = await getDoc(doc(db, 'blinkProfiles', code))
  const th = prof.exists() ? prof.data().enterTh : null
  const snap = await getDocs(collection(db, 'usageStats', code, 'daily'))
  const rows = []
  snap.forEach(d => {
    const v = d.data()
    const input = (v.keyboardInputTotal || 0) + (v.shortcutInputTotal || 0) + (v.aiInputTotal || 0)
    rows.push({ date: d.id, input, speak: v.speakCount || 0, sec: v.sessionSeconds || 0 })
  })
  rows.sort((a, b) => a.date.localeCompare(b.date))
  const last = rows.slice(-14)
  console.log(`\n■ ${code}   enterTh=${th}   기록 ${rows.length}일`)
  for (const r of last) {
    const bar = '█'.repeat(Math.min(30, Math.round(r.input / 10)))
    console.log(`  ${r.date}  입력 ${String(r.input).padStart(4)}  말하기 ${String(r.speak).padStart(3)}  ${Math.round(r.sec / 60)}분  ${bar}`)
  }
  if (rows.length >= 6) {
    const half = Math.floor(rows.length / 2)
    const avg = (a) => a.reduce((s, r) => s + r.input, 0) / (a.length || 1)
    const before = avg(rows.slice(0, half)), after = avg(rows.slice(half))
    const drop = before > 0 ? Math.round((1 - after / before) * 100) : 0
    console.log(`  전반 평균 ${before.toFixed(0)} → 후반 평균 ${after.toFixed(0)}  (${drop > 0 ? '−' : '+'}${Math.abs(drop)}%)`)
  }
}
process.exit(0)
