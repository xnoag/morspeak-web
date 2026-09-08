import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
initializeApp({ projectId: 'morspeak-a5e46' })
const db = getFirestore()
const col = db.collection('chats').doc('TESTQA').collection('messages')
const snap = await col.get()
await Promise.all(snap.docs.map(d => d.ref.delete()))
console.log(`채팅 이력 ${snap.size}건 삭제 (에뮬레이터)`)
process.exit(0)
