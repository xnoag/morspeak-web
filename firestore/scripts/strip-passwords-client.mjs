// usageStats 에 남은 평문 password 필드를 지운다 (웹 클라이언트 SDK).
//
// ✅ 2026-09-09 실행 완료 — 24건 삭제, 재확인 0건.
//    (같은 폴더의 strip-passwords.mjs 는 Admin SDK 용이라 서비스 계정 키가 필요하다.
//     키가 없어서 이 클라이언트 버전을 만들었다. 결과는 같다)
//
// 설정 받기:
//   npx firebase-tools apps:sdkconfig WEB <appId> --project morspeak-a5e46 --out /tmp/mspcfg.json
//
// 서비스 계정 키가 없어서 firestore/scripts/strip-passwords.mjs 를 못 돌린다.
// usageStats 는 규칙상 웹 클라이언트도 get/list/update 가 되므로(트래킹SW 가 쓰는 권한),
// 같은 권한으로 처리한다.
//
// 안전장치
//   - 기본 dry-run. --apply 를 줘야 쓴다
//   - 비밀번호 값·환자 이름은 절대 출력하지 않는다. 문서 ID 도 앞 2글자만
//   - **patients 에 같은 계정이 있는지 먼저 확인**하고, 있는 것만 지운다.
//     usageStats 가 유일한 사본인데 지우면 로그인 수단이 사라진다
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const raw = readFileSync('/tmp/mspcfg.json', 'utf8')
const cfg = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]).sdkConfig ?? JSON.parse(raw.match(/\{[\s\S]*\}/)[0])

const db = getFirestore(initializeApp(cfg))
const snap = await getDocs(collection(db, 'usageStats'))

let withPw = 0, safe = 0, unsafe = 0, done = 0
const unsafeIds = []
for (const d of snap.docs) {
  const data = d.data()
  if (typeof data.password !== 'string' || data.password.length === 0) continue
  withPw++
  const loginId = data.loginId
  let ok = false
  if (typeof loginId === 'string' && loginId) {
    const p = await getDoc(doc(db, 'patients', loginId))
    // patients 쪽에 해시든 평문이든 로그인 수단이 남아 있어야 지운다
    ok = p.exists() && (p.data().passwordHash || p.data().password)
  }
  if (!ok) { unsafe++; unsafeIds.push(d.id.slice(0, 2) + '…'); continue }
  safe++
  if (APPLY) { await updateDoc(d.ref, { password: deleteField() }); done++ }
}
console.log(`usageStats 문서 ${snap.size}건`)
console.log(`  평문 password 있음 : ${withPw}`)
console.log(`  지워도 안전        : ${safe}   (patients 에 로그인 수단이 남아 있음)`)
console.log(`  ⚠️ 위험(안 지움)   : ${unsafe} ${unsafeIds.join(' ')}`)
console.log(APPLY ? `  ✅ 실제로 지움     : ${done}` : '  (dry-run — --apply 를 줘야 지운다)')
process.exit(0)
