'use client';

import { use, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display','SF Pro Text',sans-serif";
const M = "'SF Mono','Fira Mono','Cascadia Mono',monospace";

function todayKey() { return new Date().toISOString().slice(0, 10); }
function n(v: unknown) { return (v as number) ?? 0; }
function fmtT(sec?: number) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

type Daily = { id: string; speakCount?: number; callCount?: number; sessionSeconds?: number; iotCount?: number };
type Speak = { id: string; text?: string; timestamp?: { toDate: () => Date }; date?: string; keyboardCount?: number; aiCount?: number; shortcutCount?: number };

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e5ea', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Bar({ val, max, color }: { val: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((val / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: '#f0f0f5', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.2px', margin: '0 0 14px', color: '#1d1d1f' }}>{children}</h2>;
}

export default function PatientReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [today, setToday] = useState<Record<string, unknown>>({});
  const [daily, setDaily] = useState<Daily[]>([]);
  const [speaks, setSpeaks] = useState<Speak[]>([]);

  useEffect(() => {
    async function load() {
      const [sSnap, pByCode, pDirect, dSnap, tSnap, spSnap] = await Promise.all([
        getDoc(doc(db, 'usageStats', code)),
        getDocs(query(collection(db, 'patients'), where('chatCode', '==', code))),
        getDoc(doc(db, 'patients', code)),
        getDocs(query(collection(db, 'usageStats', code, 'daily'), orderBy('date', 'desc'), limit(21))),
        getDoc(doc(db, 'usageStats', code, 'daily', todayKey())),
        getDocs(query(collection(db, 'usageStats', code, 'speaks'), orderBy('timestamp', 'desc'), limit(300))),
      ]);
      const s = sSnap.exists() ? sSnap.data() : {};
      const p = !pByCode.empty ? pByCode.docs[0].data() : pDirect.exists() ? pDirect.data() : {};
      // 개인 식별 정보(이름/보호자명/병원/지역)는 외부 공유용 리포트에서 의도적으로 제외 —
      // 진단명만 참고용으로 남긴다.
      setDiagnosis((p?.diagnosis as string) || (s?.diagnosis as string) || '');
      setStats(s);
      setDaily(dSnap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
      if (tSnap.exists()) setToday(tSnap.data());
      setSpeaks(spSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f7', fontFamily: F, color: '#8e8e93', fontSize: 13 }}>
        불러오는 중...
      </div>
    );
  }

  const totalKbd = speaks.reduce((s, e) => s + (e.keyboardCount || 0), 0);
  const totalAI = speaks.reduce((s, e) => s + (e.aiCount || 0), 0);
  const totalSC = speaks.reduce((s, e) => s + (e.shortcutCount || 0), 0);
  const totalIn = totalKbd + totalAI + totalSC;

  const byDate: Record<string, Speak[]> = {};
  speaks.forEach((s) => {
    const d = s.date || (s.timestamp?.toDate ? s.timestamp.toDate().toISOString().slice(0, 10) : '—');
    (byDate[d] ??= []).push(s);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 14);

  const freq: Record<string, number> = {};
  speaks.forEach((s) => { if (s.text) freq[s.text] = (freq[s.text] || 0) + 1; });
  const ranked = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxFreq = ranked[0]?.[1] || 1;

  const maxDaily = Math.max(1, ...daily.map((d) => n(d.speakCount)));

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: F }}>
      <div style={{ background: '#1d1d1f', padding: '22px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-.3px' }}>모스픽 이용 리포트</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            {diagnosis || '이용자'} · 개인 식별 정보는 표시되지 않습니다
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="오늘 말하기" value={String(n(today.speakCount))} sub={`누적 ${n(stats.speakCount).toLocaleString()}`} color="#007AFF" />
          <StatCard label="오늘 호출" value={String(n(today.callCount))} sub={`누적 ${n(stats.callCount).toLocaleString()}`} color="#ff9500" />
          <StatCard label="오늘 사용 시간" value={fmtT(today.sessionSeconds as number)} sub={`누적 ${fmtT(stats.totalSessionSeconds as number)}`} color="#5856d6" />
          <StatCard label="오늘 IoT 제어" value={String(n(today.iotCount))} sub={`누적 ${n(stats.iotCount).toLocaleString()}`} color="#34c759" />
        </div>

        {totalIn > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e5ea', marginBottom: 20 }}>
            <SectionTitle>입력 방법 분석 (최근 {speaks.length}회 발화)</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: '키보드 직접 입력', val: totalKbd, color: '#007AFF' },
                { label: 'AI 추천 선택', val: totalAI, color: '#5856d6' },
                { label: '단축어 표현', val: totalSC, color: '#34c759' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#3a3a3c', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontFamily: M, fontSize: 12, color: item.color, fontWeight: 600 }}>{item.val}회</span>
                  </div>
                  <Bar val={item.val} max={totalIn} color={item.color} />
                </div>
              ))}
            </div>
          </div>
        )}

        {daily.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e5ea', marginBottom: 20 }}>
            <SectionTitle>최근 {daily.length}일간 말하기 횟수</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {daily.map((d) => (
                <div key={d.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: '100%', borderRadius: 4, background: '#007AFF',
                    height: Math.max(2, (n(d.speakCount) / maxDaily) * 90),
                  }} />
                  <span style={{ fontSize: 9, color: '#aeaeb2', fontFamily: M }}>{d.id.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ranked.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e5ea', marginBottom: 20 }}>
            <SectionTitle>자주 사용한 표현 TOP {ranked.length}</SectionTitle>
            <div style={{ display: 'grid', gap: 10 }}>
              {ranked.map(([text, cnt], i) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: M, fontSize: 11, color: '#c7c7cc', width: 16, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500, marginBottom: 4 }}>{text}</div>
                    <div style={{ height: 4, background: '#f0f0f5', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.round((cnt / maxFreq) * 100)}%`, background: '#1d1d1f', borderRadius: 2 }} />
                    </div>
                  </div>
                  <span style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{cnt}회</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dates.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e5ea' }}>
            <SectionTitle>발화 기록</SectionTitle>
            <div style={{ display: 'grid', gap: 20 }}>
              {dates.map((d) => (
                <div key={d}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8e8e93', marginBottom: 8 }}>{d}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {byDate[d].map((s, i) => {
                      const ts = s.timestamp?.toDate ? s.timestamp.toDate() : null;
                      const timeStr = ts ? ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '—';
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid #f5f5f7' }}>
                          <span style={{ fontFamily: M, fontSize: 11, color: '#aeaeb2', minWidth: 44, flexShrink: 0 }}>{timeStr}</span>
                          <span style={{ fontSize: 14, color: '#1d1d1f' }}>{s.text || '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
