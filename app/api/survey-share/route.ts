import { getApps, initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore/lite';
import { sharedSurveyRows } from '@/lib/survey-share';
import type { SurveyRow } from '@/lib/survey-records';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const app = getApps().find((item) => item.name === 'survey-share-read') ?? initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }, 'survey-share-read');
    const snapshot = await getDocs(collection(getFirestore(app), 'survey_responses'));
    const rows = snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as SurveyRow));
    return Response.json({ rows: sharedSurveyRows(rows) }, { headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    } });
  } catch (error) {
    console.error('[survey-share]', error);
    return Response.json({ error: '공유 데이터를 불러오지 못했습니다.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
