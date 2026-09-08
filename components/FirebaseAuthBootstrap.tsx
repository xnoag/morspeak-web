'use client'
import { useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'

/**
 * 웹 전체에 **익명 인증을 한 번** 보장한다.
 *
 * ## 왜 필요한가
 *   Firestore 규칙을 `request.auth != null` 로 조이려면 **모든 클라이언트가 인증**해야
 *   한다. 앱 4종(환자 iOS/AOS · 보호자 iOS/AOS)과 신청앱은 이미 익명 인증을 한다.
 *   웹은 `waitlist` 페이지 두 개에서만 했다 — 나머지 40개 라우트는 인증 없이
 *   Firestore 를 읽고 쓴다. 그 상태로 규칙을 조이면 **웹이 통째로 죽는다.**
 *
 *   `lib/firebase.ts` 에 넣는 것으로는 부족하다. `app/tracking/*` 페이지들은 그 파일을
 *   import 하지 않고 **각자 inline `getDb()`** 로 같은 앱 인스턴스를 만든다.
 *   그래서 루트 레이아웃에서 보장한다 — 어느 라우트로 들어와도 걸린다.
 *
 * ## ⚠️ 무조건 `signInAnonymously()` 를 부르면 안 된다
 *   `/receipts/*` 는 **Firebase 이메일 링크 인증**을 쓴다(`lib/receiptAuth.ts`).
 *   그 세션이 살아 있는데 익명 로그인을 부르면 **로그인한 검토자를 익명으로 덮어쓴다.**
 *   그래서 `onAuthStateChanged` 로 **저장된 세션이 복원되기를 기다린 뒤**,
 *   그때도 사용자가 없을 때만 익명으로 들어간다. 판단은 한 번만 한다(리스너를 바로 해제).
 *
 * 실패해도 화면은 그대로 돈다 — 지금 규칙은 인증을 요구하지 않는다.
 * 이건 규칙을 조이기 위한 **준비**이고, 조이는 것은 별건이다.
 */
export default function FirebaseAuthBootstrap() {
  useEffect(() => {
    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    // 키가 없는 환경(로컬에 .env 가 없을 때)에서는 아무것도 하지 않는다
    if (!cfg.apiKey || !cfg.projectId) return

    let unsub: (() => void) | undefined
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(cfg)
      const auth = getAuth(app)
      unsub = onAuthStateChanged(auth, (user) => {
        unsub?.()          // 한 번만 판단한다
        if (!user) signInAnonymously(auth).catch(() => {})
      })
    } catch {
      // 인증 준비 실패가 페이지를 깨뜨리면 안 된다
    }
    return () => unsub?.()
  }, [])

  return null
}
