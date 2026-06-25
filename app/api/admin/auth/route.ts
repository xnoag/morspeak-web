import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { id, pw } = await req.json()

  const adminId = process.env.ADMIN_ID
  const adminPw = process.env.ADMIN_PASSWORD

  if (id !== adminId || pw !== adminPw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
