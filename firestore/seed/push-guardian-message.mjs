// 에뮬레이터의 환자 채팅방에 **보호자 메시지**를 밀어넣는다.
//
// 왜 필요한가
//   「새 메시지」 시트는 보호자 쪽에서 메시지가 도착해야만 뜬다. UI 테스트 안에서는
//   Firestore 에 쓸 수 없어서, 이 화면만 순회에서 계속 빠져 있었다.
//   테스트를 돌리는 동안 이 스크립트를 뒤에서 같이 돌려 메시지를 도착시킨다.
//
// 사용법
//   node push-guardian-message.mjs                    한 번 보낸다
//   node push-guardian-message.mjs --repeat 6 --every 12
//       12초 간격으로 6번 보낸다 — 앱이 언제 로그인을 끝낼지 몰라서, 창을 넓게 잡는다
//   node push-guardian-message.mjs --seed-history
//       **앱 실행 전에** 과거 메시지 1건을 심는다.
//       ⚠️ 이게 없으면 시트가 안 뜬다 — `ChatViewModel` 은 `prevCount == 0` 을
//          "초기 로드" 로 보고 건너뛰기 때문이다. 이력이 0건인 환자에게 오는
//          **첫 보호자 메시지는 시트가 안 뜬다**(2026-09-08 확인). 그 자체가 결함이지만,
//          여기서는 정상 경로를 재현하기 위해 이력을 먼저 깔아 준다.

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'

const CODE = 'TESTQA'
const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}

initializeApp({ projectId: 'morspeak-a5e46' })
const db = getFirestore()

const messages = db.collection('chats').doc(CODE).collection('messages')

async function send(text, secondsAgo = 0) {
  const ts = Date.now() / 1000 - secondsAgo
  await messages.add({
    userRole: 'guardian',
    userName: '보호자',
    text,
    isCall: false,
    // 서버 타임스탬프를 쓰면 클라이언트가 읽는 순간까지 null 이라 정렬이 흔들린다.
    // 여기서는 순서가 중요해서 명시적으로 넣는다.
    timestamp: FieldValue.serverTimestamp(),
    clientTimestamp: ts,
  })
  console.log(`→ 보냈다: ${text}`)
}

if (args.includes('--seed-history')) {
  await send('어제 잘 잤어요?', 3600)
  console.log('✅ 과거 메시지 1건을 심었다 (prevCount > 0 을 만들기 위함)')
  process.exit(0)
}

const repeat = Number(flag('repeat', 1))
const every = Number(flag('every', 12)) * 1000

for (let i = 0; i < repeat; i++) {
  if (i > 0) await new Promise((r) => setTimeout(r, every))
  await send(`약 드실 시간이에요 (${i + 1})`)
}
process.exit(0)
