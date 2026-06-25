import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/tracking') && !pathname.startsWith('/tracking/login')) {
    const session = req.cookies.get('admin_session')
    if (!session || session.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/tracking/login', req.url))
    }
  }

  return NextResponse.next()
}

export const proxyConfig = {
  matcher: ['/tracking/:path*'],
}
