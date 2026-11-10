import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { BASE, COOKIE, MAX_AGE, configured, issueSession, validPassword, validSession } from '@/lib/skhappiness/auth'
import { readUsageFeed } from '@/lib/skhappiness/shared-usage.mjs'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const privateDir = path.join(process.cwd(), 'share-report')
const dayCache = new Map()
const attempts = new Map<string, { count: number, until: number }>()
let seed: Promise<unknown> | undefined
const headers = {
 'Cache-Control': 'private, no-store, max-age=0',
 'X-Robots-Tag': 'noindex, nofollow, noarchive',
 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}
function response(body: BodyInit | null, status = 200, type = 'text/plain; charset=utf-8') {
 return new NextResponse(body, { status, headers: { ...headers, 'Content-Type': type } })
}
function persist(res: NextResponse, req: NextRequest, clear = false) {
 res.cookies.set(COOKIE, clear ? '' : issueSession(), { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax', path: BASE, maxAge: clear ? 0 : MAX_AGE })
 return res
}
function login(error = '', status = 200) {
 return response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Morspeak — 사용 현황</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;background:#f7f7f7;color:#282828;font:14px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;display:grid;place-items:center;padding:24px}.panel{width:min(100%,380px);background:#fff;border:1px solid #eee;border-radius:18px;padding:32px;box-shadow:0 4px 24px #00000004}.brand{font-size:13px;display:flex;align-items:center;gap:10px}.brand-divider{height:19px;width:1px;background:#ddd;flex-shrink:0}.partner-logo{position:relative;display:block;width:98px;height:26px;overflow:hidden;flex-shrink:0;top:-1.5px}.partner-logo img{position:absolute;width:100.577%;height:auto;max-width:none;left:-.192%;top:50%;transform:translateY(-50.785%)}@media(max-width:420px){.brand-logo{width:94px!important;height:22px!important}.partner-logo{width:76px;height:22px}}.brand-logo{display:block;position:relative;overflow:hidden;width:128px;height:26px}.brand-logo img{position:absolute;width:124.315%;height:auto;max-width:none;left:-12.21%;top:50%;transform:translateY(-54.74%)}h1{font-size:24px;letter-spacing:-.8px;margin:32px 0 8px}p{font-size:13px;line-height:1.6;color:#666;margin:0 0 28px}label{display:block;font-size:12px;margin-bottom:8px}input{font:inherit;width:100%;height:44px;border:1px solid #ddd;border-radius:8px;padding:0 12px;background:#fff}button{font:inherit;width:100%;height:44px;margin-top:12px;border:0;border-radius:8px;background:#292929;color:white;cursor:pointer}input:focus-visible,button:focus-visible{outline:2px solid #777;outline-offset:3px}.note{font-size:11px;color:#666;margin:18px 0 0}.error{color:#b42318;font-size:12px;margin:12px 0 0}</style><main class="panel"><div class="brand"><span class="brand-logo"><img src="/morspeak-share-logo-wordmark.png?v=18" alt="Morspeak" width="3584" height="1256"></span><span class="brand-divider" aria-hidden="true"></span><span class="partner-logo"><img src="/share-partner-logo.png?v=18" alt="곧장기부" width="523" height="382"></span></div><h1>사용 현황</h1><p>공유받은 비밀번호로 접속해 주세요.</p><form method="post" action="${BASE}"><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128" autofocus><button type="submit">들어가기</button>${error ? `<div class="error" role="alert">${error}</div>` : ''}</form><p class="note">이 브라우저에서는 다음 접속부터 자동으로 로그인됩니다.</p></main></html>`, status, 'text/html; charset=utf-8')
}
function resource(req: NextRequest) { return req.nextUrl.pathname.slice(BASE.length).replace(/^\//, '').replace(/\/$/, '') }
export async function GET(req: NextRequest) {
 if (!configured()) return response('공유 페이지를 준비하고 있습니다.', 503)
 const name = resource(req)
 if (!validSession(req.cookies.get(COOKIE)?.value)) return name ? response('로그인이 필요합니다.', 401) : login()
 if (name === 'usage') {
  try {
   seed ??= readFile(path.join(privateDir, 'usage-seed.json'), 'utf8').then(JSON.parse)
   const feed = readUsageFeed(await seed, { after: req.nextUrl.searchParams.get('after') || '', dayCache })
   return persist(response(JSON.stringify(feed), 200, 'application/json; charset=utf-8'), req)
  } catch { return response('기록을 불러오지 못했습니다.', 400) }
 }
 const files: Record<string, [string, string]> = {
  '': ['index.html', 'text/html; charset=utf-8'], 'data.json': ['data.json.gz', 'application/json; charset=utf-8'],
  'morspeak-logo-wordmark.png': ['morspeak-logo-wordmark.png', 'image/png'],
  'morspeak-logo-orange.png': ['morspeak-logo-orange.png', 'image/png'],
  'morspeak-logo.svg': ['morspeak-logo.svg', 'image/svg+xml'],
  'partner-logo.png': ['partner-logo.png', 'image/png'],
  'usage-time.js': ['usage-time.js', 'text/javascript; charset=utf-8'],
  'app.js': ['app.js', 'text/javascript; charset=utf-8'], 'replay.js': ['replay.js', 'text/javascript; charset=utf-8'],
  'shared-usage-ui.js': ['shared-usage-ui.js', 'text/javascript; charset=utf-8'], 'feature-metrics.js': ['feature-metrics.js', 'text/javascript; charset=utf-8'],
  'style.css': ['style.css', 'text/css; charset=utf-8'], 'gaon-tokens.css': ['gaon-tokens.css', 'text/css; charset=utf-8'], 'NOTICE.txt': ['NOTICE.txt', 'text/plain; charset=utf-8'],
 }
 if (!Object.hasOwn(files, name)) return response('찾을 수 없습니다.', 404)
 const [file, type] = files[name]
 const bytes = await readFile(path.join(privateDir, file))
 let body: BodyInit = new Uint8Array(bytes)
 if (!name) body = bytes.toString('utf8').replace('<html lang="ko">', `<html lang="ko" data-report-base="${BASE}">`).replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`)
 const res = response(body, 200, type)
 if (name === 'data.json') { res.headers.set('Content-Encoding', 'gzip'); res.headers.set('Vary', 'Cookie, Accept-Encoding') }
 return persist(res, req)
}
export async function POST(req: NextRequest) {
 if (!configured()) return response('공유 페이지를 준비하고 있습니다.', 503)
 if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin && req.headers.get('sec-fetch-site') !== 'same-origin') return response('허용되지 않은 요청입니다.', 403)
 const name = resource(req)
 if (name === 'logout') return persist(NextResponse.redirect(new URL(BASE, req.url), 303), req, true)
 if (name) return response('찾을 수 없습니다.', 404)
 if (Number(req.headers.get('content-length')) > 2048) return response('요청이 너무 큽니다.', 413)
 const key = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local', now = Date.now()
 for (const [ip, value] of attempts) if (value.until < now) attempts.delete(ip)
 const attempt = attempts.get(key)
 if (attempt && attempt.count >= 10) return login('잠시 후 다시 시도해 주세요.', 429)
 let password = ''
 try { password = String((await req.formData()).get('password') || '') } catch { return login('비밀번호를 다시 입력해 주세요.', 400) }
 if (!validPassword(password)) {
  if (attempt) attempt.count++; else attempts.set(key, { count: 1, until: now + 60000 })
  return login('비밀번호를 확인해 주세요.', 401)
 }
 attempts.delete(key)
 const res = NextResponse.redirect(new URL(BASE, req.url), 303)
 for (const [key, value] of Object.entries(headers)) res.headers.set(key, value)
 return persist(res, req)
}
