'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SurveyMindMap, { MindMapRow } from '@/components/SurveyMindMap';

const F = "system-ui,-apple-system,'SF Pro Text',sans-serif";

export default function SurveyMindMapPage() {
  const [rows, setRows] = useState<MindMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'survey_responses'), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then((snap) =>
        setRows(
          snap.docs
            .map((d) => d.data())
            .filter((r) => r.surveyType === 'pre')
            .map((r, i) => ({ id: String(i), answers: r.answers }))
        )
      )
      .catch((e) => { console.error('[survey-mindmap]', e); setError('데이터를 불러오는 중 오류가 발생했습니다.'); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>
      <div style={{ background: '#1d1d1f', height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px' }}>모스픽 사전 설문 요약</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 12 }}>{loading ? '' : `${rows.length}명 응답`}</span>
      </div>
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30', fontSize: 13 }}>{error}</div>
      ) : (
        <SurveyMindMap rows={rows} />
      )}
    </div>
  );
}
