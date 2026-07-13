import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/tracking', '/survey-admin']

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

export const proxyConfig = {
  matcher: ['/tracking/:path*', '/survey-admin/:path*'],
}
