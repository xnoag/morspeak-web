'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const RELATIONS = ['배우자', '자녀', '부모', '형제/자매', '기타 가족', '간병인/요양보호사', '본인'];
const COMM_METHODS = ['추측', '직접 의사소통', '글자판', '안구마우스', '소통이 어려운 상태', '기타'];
const MOVEMENT_OPTIONS = [
  { key: 'finger', label: '손가락으로 키보드 버튼 하나는 누를 수 있어요' },
  { key: 'blink', label: '눈을 깜빡일 수 있어요' },
  { key: 'eyebrow', label: '눈썹을 위로 올릴 수 있어요' },
  { key: 'mouth', label: '입을 벌렸다가 닫을 수 있어요' },
  { key: 'blow', label: '바람을 불 수 있어요' },
];

// 안내는 2주 간격 월요일에 순차로 진행 — **가장 가까운 월요일부터** 14일 간격으로 N개를
// 뽑아서 신청자가 원하는 날짜를 직접 고르게 한다.
//
// ⚠️ 예전에는 가장 가까운 월요일을 "준비 기간이 부족하다" 며 건너뛰었다(`+ 14`).
//    그러면 화요일에 접수하는 사람은 **6일 뒤 월요일을 고를 수 없고** 20일 뒤부터만 보였다.
//    2026-09-08 대표 지시로 스킵을 없앴다 — 가장 가까운 월요일도 고를 수 있어야 한다.
//    날짜를 코드에 박지 않는다. 박으면 그 날이 지나는 순간 조용히 낡는다.
function getBiweeklyMondays(count: number): string[] {
  const d = new Date();
  const day = d.getDay(); // 0=일 ... 1=월
  const diffToNextMonday = ((8 - day) % 7) || 7; // 오늘이 월요일이면 당일이 아니라 다음주로
  d.setDate(d.getDate() + diffToNextMonday);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 14);
  }
  return dates;
}
function fmtMonday(iso: string) {
  const [, m, day] = iso.split('-').map(Number);
  return `${m}월 ${day}일 (월)`;
}
const GUIDANCE_DATES = getBiweeklyMondays(5);

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px',
  border: '1.5px solid #E5E5EA', borderRadius: 10,
  fontSize: 16, outline: 'none', fontFamily: F,
  boxSizing: 'border-box', background: '#fff', color: '#1C1C1E',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 14, fontWeight: 600, color: '#3C3C43', marginBottom: 7,
};

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1C1C1E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>{title}</p>
    </div>
  );
}

export default function WaitlistPage() {
  const [waitingCount, setWaitingCount] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [commMethod, setCommMethod] = useState('');
  const [movements, setMovements] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [confirmedDate, setConfirmedDate] = useState('');

  const toggleMovement = (key: string) => {
    setMovements((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  useEffect(() => {
    signInAnonymously(getAuth()).catch(() => {});
    const unsub = onSnapshot(collection(db, 'waitlist'), snap => {
      setWaitingCount(snap.docs.filter(d => !d.data().contacted).length);
    });
    return () => unsub();
  }, []);

  const canSubmit = patientName.trim() && applicantName.trim() && relationship && phone.trim() && region && commMethod && preferredDate;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'waitlist'), {
        patientName: patientName.trim(),
        diagnosis: diagnosis.trim(),
        name: applicantName.trim(),
        relationship,
        phone: phone.trim(),
        region,
        commMethod,
        movements,
        preferredDate,
        note: note.trim(),
        contacted: false,
        createdAt: serverTimestamp(),
      });
      setConfirmedDate(preferredDate);
      // 안내 순번은 "전체 대기열"이 아니라 "같은 날짜를 고른 사람들 안에서" 몇 번째인지가
      // 신청자에게 실제로 의미 있는 숫자라, preferredDate가 같은 문서들끼리만 순위를 매긴다.
      const position = await new Promise<number>(resolve => {
        const unsub = onSnapshot(collection(db, 'waitlist'), s => {
          unsub();
          const sorted = s.docs
            .filter(d => !d.data().contacted && d.data().preferredDate === preferredDate)
            .sort((a, b) => (a.data().createdAt?.seconds ?? 0) - (b.data().createdAt?.seconds ?? 0));
          const idx = sorted.findIndex(d => d.id === ref.id);
          resolve(idx >= 0 ? idx + 1 : sorted.length);
        });
      });
      setMyPosition(position);
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
    setSubmitting(false);
  };

  if (myPosition !== null) return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>신청이 접수됐습니다</h2>
        <p style={{ fontSize: 18, color: '#3C3C43', lineHeight: 1.7, marginBottom: 8 }}>
          <strong>{fmtMonday(confirmedDate)}</strong> 안내 순번은 <strong>{myPosition}번째</strong>입니다
        </p>
        <p style={{ fontSize: 16, color: '#8E8E93', lineHeight: 1.7 }}>
          해당 날짜에 순서대로 모스픽 담당자가 유선으로 안내드립니다.<br />조금만 기다려주세요 🙏
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F }}>
      <div style={{ background: '#1C1C1E', padding: '32px 24px 28px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height: 34, display: 'block', margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#fff', marginBottom: 8 }}>모스픽 이용 신청</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
          루게릭병(ALS) 등 신체 움직임이 어려운 환우를 위한 눈짓·시선 기반 의사소통 솔루션입니다.
        </p>
        {waitingCount !== null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.1)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#30D158' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>현재 대기 {waitingCount}명 접수 중</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ background: '#EEF3FF', border: '1px solid #D6E4FF', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <p style={{ fontSize: 13.5, color: '#3255A8', lineHeight: 1.6, margin: 0 }}>
            모스픽 이용 안내는 <strong>2주 간격(매주 월요일)</strong>으로 진행됩니다. 원하시는 날짜를 선택하시면 해당 날 접수 순서대로 모스픽 담당자가 직접 연락드려 이용 절차를 안내합니다.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader n={1} title="환우 정보" />
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>환우 성함</label>
            <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="환우분 성함" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>진단명 / 질환 <span style={{ color: '#AEAEB2', fontWeight: 400 }}>(선택)</span></label>
            <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="예: 근위축성측삭경화증(ALS), 뇌병변 등" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader n={2} title="현재 소통 방식" />
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>현재 사용 중인 보조기기 / 소통 방법</label>
            <select value={commMethod} onChange={e => setCommMethod(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">선택</option>
              {COMM_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>조금이라도 자유롭게 움직일 수 있는 부분 <span style={{ color: '#AEAEB2', fontWeight: 400 }}>(해당하는 항목 모두 선택, 선택)</span></label>
            <div style={{ display: 'grid', gap: 8 }}>
              {MOVEMENT_OPTIONS.map(o => (
                <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${movements.includes(o.key) ? '#1C1C1E' : '#E5E5EA'}`, borderRadius: 10, cursor: 'pointer', background: movements.includes(o.key) ? '#F5F5F7' : '#fff' }}>
                  <input type="checkbox" checked={movements.includes(o.key)} onChange={() => toggleMovement(o.key)} style={{ width: 16, height: 16, flexShrink: 0, accentColor: '#1C1C1E' }} />
                  <span style={{ fontSize: 14, color: '#1C1C1E' }}>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader n={3} title="안내받고 싶은 날짜" />
          <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 12 }}>2주 간격 월요일 중 원하시는 날짜를 선택해주세요.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {GUIDANCE_DATES.map(d => (
              <button key={d} type="button" onClick={() => setPreferredDate(d)}
                style={{
                  padding: '12px 0', borderRadius: 10,
                  border: `1.5px solid ${preferredDate === d ? '#1C1C1E' : '#D1D1D6'}`,
                  background: preferredDate === d ? '#1C1C1E' : '#fff',
                  color: preferredDate === d ? '#fff' : '#3C3C43',
                  fontSize: 14, fontWeight: preferredDate === d ? 700 : 500, cursor: 'pointer', fontFamily: F,
                }}>
                {fmtMonday(d)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader n={4} title="신청인 정보" />
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>신청인(보호자) 성함</label>
            <input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="신청하시는 분 성함" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>환우와의 관계</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">선택</option>
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>거주 지역</label>
              <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">선택</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>연락처</label>
            <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader n={5} title="문의 내용" />
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="환자분 현재 상태, 궁금하신 점 등을 자유롭게 남겨주세요 (선택)"
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <button onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: (!canSubmit || submitting) ? '#C7C7CC' : '#1C1C1E',
            color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: F,
          }}>
          {submitting ? '접수 중…' : '신청하기'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#AEAEB2', marginTop: 24, lineHeight: 1.6 }}>
          남겨주신 정보는 상담 목적으로만 사용되며 안전하게 관리됩니다.<br />
          문의: 모스픽팀
        </p>
      </div>
    </div>
  );
}
