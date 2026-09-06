import { NextRequest, NextResponse } from 'next/server'

// 관리자·내부 화면. 여기에 접두어를 추가하면 아래 matcher 에도 같이 넣어야 한다.
// /receipts 는 제외 — Firebase 이메일 링크 인증(lib/receiptAuth.ts)을 쓰는 별도 체계라
// admin_session 으로 막으면 재단 검토자가 잠긴다.
const PROTECTED_PREFIXES = [
  '/tracking',
  '/survey-admin',
  '/survey-mindmap',
  '/admin',
  '/waitlist/admin',
  '/review/admin',
  '/schedule/training/admin',
]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected =
    PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) && !pathname.startsWith('/tracking/login')

  if (isProtected) {
    const session = req.cookies.get('admin_session')
    if (!session || session.value !== 'authenticated') {
      const loginUrl = new URL('/tracking/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Next 16 문서(node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
// 가 정하는 이름은 `config` 다. `proxyConfig` 는 문서에 없는 이름이어서 matcher 가
// 무시되고 있었다 — 접두어 검사가 실제 관문이라 보호는 됐지만 proxy 가 모든 요청에서 돌았다.
export const config = {
  matcher: [
    '/tracking/:path*',
    '/survey-admin/:path*',
    '/survey-mindmap/:path*',
    '/admin/:path*',
    '/waitlist/admin/:path*',
    '/review/admin/:path*',
    '/schedule/training/admin/:path*',
  ],
}
