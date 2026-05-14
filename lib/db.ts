import { neon } from '@neondatabase/serverless';

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 환경변수가 없습니다.');
  return neon(process.env.DATABASE_URL);
}

export function getDb() {
  return getSql();
}

export async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS screening_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      patient_name TEXT NOT NULL,
      caregiver_name TEXT NOT NULL,
      caregiver_contact TEXT NOT NULL,
      region TEXT NOT NULL,
      communication_method TEXT,
      note TEXT,
      video_url TEXT,
      blink_detected BOOLEAN,
      device_type TEXT,
      user_agent TEXT
    )
  `;
}
