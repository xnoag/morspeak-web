import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, ensureTable } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const sql = getDb();
    await ensureTable();

    const result = await sql`
      INSERT INTO screening_results (
        patient_name, caregiver_name, caregiver_contact, region, sub_region,
        communication_method, video_url, blink_detected,
        device_type, user_agent
      ) VALUES (
        ${data.patientName}, ${data.caregiverName}, ${data.caregiverContact},
        ${data.region}, ${data.subRegion ?? null},
        ${data.communicationMethod ?? null},
        ${data.videoUrl ?? null}, ${data.blinkDetected ?? null},
        ${data.deviceType ?? null}, ${data.userAgent ?? null}
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (err) {
    console.error('[screening POST]', err);
    return NextResponse.json({ error: 'DB 오류. DATABASE_URL 확인 필요.' }, { status: 500 });
  }
}

export async function GET() {
  // 예전에는 관리자 비밀번호를 URL 쿼리스트링(?password=)으로 받았다.
  // 쿼리스트링은 서버 로그·Vercel 로그·브라우저 기록·리퍼러 헤더에 그대로 남는다.
  // 게다가 트래킹 대시보드와 같은 ADMIN_PASSWORD 였다.
  //
  // 나머지 관리자 화면과 같은 방식(admin_session 쿠키)으로 통일한다.
  // 쿠키는 /api/admin/auth 가 httpOnly·secure·sameSite=strict 로 발급한다.
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = getDb();
    await ensureTable();
    const results = await sql`SELECT * FROM screening_results ORDER BY created_at DESC`;
    return NextResponse.json(results);
  } catch (err) {
    console.error('[screening GET]', err);
    return NextResponse.json({ error: 'DB 오류.' }, { status: 500 });
  }
}
