'use client';

import { use, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  F, M, ColTitle, Bar, DailySection, SpeakLogSection, SessionSection,
  NAV_ITEMS, FN_BTNS, KBD_C, KBD_V, fmtT, fmtS, n, todayKey,
} from '@/app/tracking/patients/[code]/page';

// 원본 관리자 페이지(app/tracking/patients/[code]/page.tsx)와 완전히 같은 레이아웃/스타일을
// 그대로 재사용한다 — 다른 점은 딱 두 가지: (1) 로그인 없이 외부에 공유 가능하고,
// (2) 이름/보호자명/병원/지역 같은 개인 식별 정보와, 기기에 실제 명령을 보내거나 데이터를
// 쓰는 조작 버튼(교육 명령 전송, 기능 토글, 계정 삭제, FaceTime 주소 편집 등)은 아예 빼서
// 읽기 전용 탭(개요/발화기록/일별데이터/세션기록/버튼분석)만 보이게 한다.
const PUBLIC_NAV_ITEMS = NAV_ITEMS.filter((it) =>
  ['개요', '발화기록', '일별데이터', '세션기록', '버튼분석'].includes(it.id)
);

export default function PatientReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [tab, setTab] = useState('개요');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [blink, setBlink] = useState<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [daily, setDaily] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [today, setToday] = useState<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [speaks, setSpeaks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sS, bS, dS, pS, pD, spS] = await Promise.all([
        getDoc(doc(db, 'usageStats', code)), getDoc(doc(db, 'blinkProfiles', code)),
        getDocs(query(collection(db, 'usageStats', code, 'daily'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'patients'), where('chatCode', '==', code))), getDoc(doc(db, 'patients', code)),
        getDocs(query(collection(db, 'usageStats', code, 'speaks'), orderBy('timestamp', 'desc'), limit(500))),
      ]);
      const ssSnap = await getDocs(query(collection(db, 'usageStats', code, 'sessions'), orderBy('start', 'desc'), limit(200)));
      setSessions(ssSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      const tS = await getDoc(doc(db, 'usageStats', code, 'daily', todayKey()));
      let m: Record<string, unknown> = sS.exists() ? sS.data() : {};
      if (!pS.empty) m = { ...pS.docs[0].data(), ...m };
      else if (pD.exists()) m = { ...pD.data(), ...m };
      setStats(m);
      if (bS.exists()) setBlink(bS.data());
      setDaily(dS.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (tS.exists()) setToday(tS.data());
      setSpeaks(spS.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, [code]);

  const totalKbd = speaks.reduce((s, e) => s + (e.keyboardCount || 0), 0);
  const totalAI = speaks.reduce((s, e) => s + (e.aiCount || 0), 0);
  const totalSC = speaks.reduce((s, e) => s + (e.shortcutCount || 0), 0);
  const totalIn = totalKbd + totalAI + totalSC;
  const shortMean = blink.onboardingShortDurations?.length ? blink.onboardingShortDurations.reduce((a: number, b: number) => a + b, 0) / blink.onboardingShortDurations.length : null;
  const longMean = blink.onboardingLongDurations?.length ? blink.onboardingLongDurations.reduce((a: number, b: number) => a + b, 0) / blink.onboardingLongDurations.length : null;

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f7', fontFamily: F, color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F, color: '#1d1d1f' }}>

      {/* 상단 헤더 — 이름/진단명/병원은 표시하지 않고, 조작 버튼(교육 시작·삭제·FaceTime 편집)도 없음 */}
      <div style={{ background: '#1d1d1f', flexShrink: 0, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-.3px' }}>모스픽 이용 리포트</div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: M }}>개인 식별 정보는 표시되지 않습니다</div>
      </div>

      {/* 메인: 사이드바 + 콘텐츠 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 좌측 사이드바 */}
        <div style={{ width: 200, background: '#fff', borderRight: '1px solid #e5e5ea', flexShrink: 0, display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
          {PUBLIC_NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: 'none',
              background: tab === item.id ? '#f2f2f7' : 'transparent',
              borderRadius: 10, margin: '2px 8px', cursor: 'pointer', fontFamily: F,
              color: tab === item.id ? '#007AFF' : '#3a3a3c',
              fontWeight: tab === item.id ? 600 : 400, fontSize: 13, textAlign: 'left',
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 영역 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

          {/* ── 개요 ── */}
          {tab === '개요' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
                {[
                  { label: '오늘 말하기', v: n(today.speakCount), total: n(stats.speakCount), color: '#007AFF' },
                  { label: '오늘 호출', v: n(today.callCount), total: n(stats.callCount), color: '#ff9500' },
                  { label: '오늘 사용 시간', v: fmtT(today.sessionSeconds), total: fmtT(stats.totalSessionSeconds), color: '#5856d6' },
                  { label: '오늘 IoT 제어', v: n(today.iotCount), total: n(stats.iotCount), color: '#34c759' },
                ].map((c) => (
                  <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e5ea', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color, letterSpacing: '-.5px' }}>{c.v}</div>
                    <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 3 }}>누적 {c.total}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e5ea' }}>
                  <ColTitle>모드별 사용 시간 (오늘)</ColTitle>
                  {(() => {
                    const modes: [string, number, string][] = [
                      ['키보드', n(today.modeSeconds_keyboard), '#007AFF'],
                      ['단축어', n(today.modeSeconds_shortcut), '#34c759'],
                      ['기능', n(today.modeSeconds_function), '#ff9500'],
                      ['YouTube', n(today.modeSeconds_youtubeSurf), '#8e8e93'],
                    ];
                    const total = modes.reduce((s, [, v]) => s + v, 0);
                    if (!total) return <p style={{ color: '#aeaeb2', fontSize: 13 }}>오늘 데이터 없음</p>;
                    return modes.map(([l, v, c]) => (
                      <div key={l} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#3a3a3c' }}>{l}</span>
                          <span style={{ fontFamily: M, fontSize: 12, color: c, fontWeight: 600 }}>{fmtT(v)}</span>
                        </div>
                        <Bar val={v} max={total} color={c} />
                      </div>
                    ));
                  })()}
                </div>
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e5ea' }}>
                  <ColTitle>누적 현황</ColTitle>
                  {[
                    ['총 말하기', n(stats.speakCount), '회'],
                    ['총 호출', n(stats.callCount), '회'],
                    ['총 사용 시간', null, fmtT(stats.totalSessionSeconds)],
                    ['총 잠금', n(stats.lockCount), '회'],
                    ['YouTube 선택', n(stats.youtubeSelectCount), '회'],
                  ].map(([l, v, u]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f7' }}>
                      <span style={{ fontSize: 13, color: '#3c3c43' }}>{l}</span>
                      <span style={{ fontFamily: M, fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        {v !== null ? `${n(v as number).toLocaleString()} ${u}` : (u as string)}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: '12px', background: '#f9f9fb', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>캘리브레이션</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div><div style={{ fontSize: 10, color: '#aeaeb2' }}>경계값</div><div style={{ fontFamily: M, fontSize: 14, fontWeight: 700, color: '#007AFF' }}>{fmtS(blink.dotDashBoundary)}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aeaeb2' }}>짧은 평균</div><div style={{ fontFamily: M, fontSize: 14, fontWeight: 700, color: '#007AFF' }}>{fmtS(shortMean ?? undefined)}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aeaeb2' }}>긴 평균</div><div style={{ fontFamily: M, fontSize: 14, fontWeight: 700, color: '#007AFF' }}>{fmtS(longMean ?? undefined)}</div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e5ea' }}>
                <ColTitle>입력 방법 분석 (최근 {speaks.length}회 발화)</ColTitle>
                {totalIn > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[
                      { label: '키보드 직접 입력', val: totalKbd, color: '#007AFF', desc: '자모를 직접 타이핑' },
                      { label: 'AI 추천 선택', val: totalAI, color: '#5856d6', desc: 'AI가 제안한 단어' },
                      { label: '단축어 표현', val: totalSC, color: '#34c759', desc: '등록된 표현 바로 사용' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#3a3a3c', fontWeight: 500 }}>{item.label}</span>
                          <span style={{ fontFamily: M, fontSize: 12, color: item.color, fontWeight: 600 }}>{item.val}회</span>
                        </div>
                        <Bar val={item.val} max={totalIn} color={item.color} />
                        <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 3 }}>{item.desc} · {totalIn > 0 ? Math.round((item.val / totalIn) * 100) : 0}%</div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: '#aeaeb2', fontSize: 13 }}>발화 기록 없음</p>}
              </div>
            </div>
          )}

          {/* ── 발화 기록 ── */}
          {tab === '발화기록' && <SpeakLogSection speaks={speaks} />}

          {/* ── 버튼 통계 ── */}
          {tab === '버튼분석' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 48px' }}>
              <div>
                <ColTitle>기능 버튼</ColTitle>
                <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.7, marginBottom: 24 }}>각 기능 버튼의 누적 사용 횟수입니다.</p>
                {FN_BTNS.map(([l, m, k]) => {
                  const val = n(stats[k as string]);
                  const mx = Math.max(1, ...FN_BTNS.map(([, , k2]) => n(stats[k2 as string])));
                  return (
                    <div key={k as string} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#1d1d1f' }}>{l} <span style={{ fontSize: 10, fontFamily: M, color: '#aeaeb2' }}>({m})</span></span>
                        <span style={{ fontFamily: M, fontSize: 12, fontWeight: 600, color: val > 0 ? '#1d1d1f' : '#d1d1d6' }}>{val > 0 ? val : '0'}</span>
                      </div>
                      <Bar val={val} max={mx} color="#06c" />
                    </div>
                  );
                })}
              </div>
              <div>
                <ColTitle>자음 키</ColTitle>
                <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.7, marginBottom: 24 }}>키보드 모드에서 각 자음을 누른 횟수입니다.</p>
                {KBD_C.map((k) => {
                  const val = n(stats[`btn_kbd_${k}`]);
                  const mx = Math.max(1, ...KBD_C.map((x) => n(stats[`btn_kbd_${x}`])));
                  return (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: M, fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{k}</span>
                        <span style={{ fontFamily: M, fontSize: 12, fontWeight: 600, color: val > 0 ? '#06c' : '#d1d1d6' }}>{val > 0 ? val : '0'}</span>
                      </div>
                      <Bar val={val} max={mx} color="#06c" />
                    </div>
                  );
                })}
              </div>
              <div>
                <ColTitle>모음 키</ColTitle>
                <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.7, marginBottom: 24 }}>키보드 모드에서 각 모음을 누른 횟수입니다.</p>
                {KBD_V.map((k) => {
                  const val = n(stats[`btn_kbd_${k}`]);
                  const mx = Math.max(1, ...KBD_V.map((x) => n(stats[`btn_kbd_${x}`])));
                  return (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: M, fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{k}</span>
                        <span style={{ fontFamily: M, fontSize: 12, fontWeight: 600, color: val > 0 ? '#5856d6' : '#d1d1d6' }}>{val > 0 ? val : '0'}</span>
                      </div>
                      <Bar val={val} max={mx} color="#5856d6" />
                    </div>
                  );
                })}
                {(() => {
                  const sc = Object.keys(stats).filter((k) => k.startsWith('btn_sc_')).map((k) => ({ label: k.replace('btn_sc_', ''), val: n(stats[k]) })).sort((a, b) => b.val - a.val).slice(0, 8);
                  if (!sc.length) return null;
                  const mx = sc[0].val;
                  return (
                    <>
                      <div style={{ marginTop: 24, marginBottom: 12, paddingTop: 16, borderTop: '1px solid #d2d2d7' }}>
                        <ColTitle>단축어 슬롯 TOP</ColTitle>
                      </div>
                      {sc.map((s) => (
                        <div key={s.label} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#1d1d1f' }}>{s.label}</span>
                            <span style={{ fontFamily: M, fontSize: 12, fontWeight: 600, color: '#34c759' }}>{s.val}</span>
                          </div>
                          <Bar val={s.val} max={mx} color="#34c759" />
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── 일별 데이터 ── */}
          {tab === '일별데이터' && <DailySection daily={daily} />}

          {/* ── 세션 기록 ── */}
          {tab === '세션기록' && <SessionSection sessions={sessions} />}
        </div>
      </div>
    </div>
  );
}
