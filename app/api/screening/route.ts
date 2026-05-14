import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureTable } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const sql = getDb();
    await ensureTable();

    const result = await sql`
      INSERT INTO screening_results (
        patient_name, caregiver_name, caregiver_contact, region,
        communication_method, note, video_url, blink_detected,
        device_type, user_agent
      ) VALUES (
        ${data.patientName}, ${data.caregiverName}, ${data.caregiverContact},
        ${data.region}, ${data.communicationMethod ?? null}, ${data.note ?? null},
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

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('password');
  if (!password || password !== process.env.ADMIN_PASSWORD) {
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
