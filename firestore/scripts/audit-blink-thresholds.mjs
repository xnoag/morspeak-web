// 깜빡임 임계값(enterTh)이 상한에 붙은 환자를 센다. 읽기 전용 · 이름 안 찍는다.
//
// 왜 필요한가 (2026-09-11)
//   승일희망요양병원에서 "터치로는 써지는데 눈깜빡임으로는 반영이 안 된다" 는 피드백이 왔다.
//   앱 고장이 아니라 **학습 로직이 실패한 깜빡임을 기록하지 않아** 임계값이 한 번
//   올라가면 안 내려오는 구조였다. 43명 중 35명이 상한 0.55 에 붙어 있었다.
//   자세한 분석: ~/knowledge/notes/깜빡임-임계값-학습이-실패를-못-본다.md
//
//   FB_API_KEY=… FB_APP_ID=… node audit-blink-thresholds.mjs
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore'
const app = initializeApp({ apiKey: process.env.FB_API_KEY, authDomain: 'morspeak-a5e46.firebaseapp.com', projectId: 'morspeak-a5e46', appId: process.env.FB_APP_ID })
const db = getFirestore(app); await signInAnonymously(getAuth(app))
const codes = []; (await getDocs(collection(db, 'usageStats'))).forEach(d => codes.push(d.id))
let n = 0, capped = 0, declining = 0, rows = []
for (const c of codes) {
  const s = await getDoc(doc(db, 'blinkProfiles', c))
  if (!s.exists()) continue
  const p = s.data(); const pb = p.peakBuffer || []
  if (!pb.length) continue
  n++
  const th = p.enterTh ?? 0
  const last3 = pb.slice(-3)
  const mean = pb.reduce((a, b) => a + b, 0) / pb.length
  const weak = last3.filter(v => v < th).length          // 최근 3회 중 임계값 미달
  if (th >= 0.549) capped++
  if (weak > 0) { declining++; rows.push({ c, th: +th.toFixed(2), last3: last3.map(v => +v.toFixed(2)), mean: +mean.toFixed(2), weak }) }
}
console.log(`깜빡임 프로필 있는 환자 ${n}명`)
console.log(`  enterTh 가 상한 0.55 에 붙음: ${capped}명`)
console.log(`  최근 3회 중 임계값 미달이 있음: ${declining}명\n`)
rows.sort((a, b) => b.weak - a.weak).slice(0, 12).forEach(r =>
  console.log(`  ${r.c}  th=${r.th}  최근3=${JSON.stringify(r.last3)}  평균=${r.mean}  미달 ${r.weak}/3`))
process.exit(0)
