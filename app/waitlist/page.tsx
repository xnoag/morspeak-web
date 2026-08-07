'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '2px solid #E5E5EA', borderRadius: 12,
  fontSize: 17, outline: 'none', fontFamily: F,
  boxSizing: 'border-box', background: '#fff', color: '#1C1C1E',
};

export default function WaitlistPage() {
  const [waitingCount, setWaitingCount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);

  useEffect(() => {
    signInAnonymously(getAuth()).catch(() => {});
    const unsub = onSnapshot(collection(db, 'waitlist'), snap => {
      setWaitingCount(snap.docs.filter(d => !d.data().contacted).length);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || submitting) return;
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'waitlist'), {
        name: name.trim(), phone: phone.trim(), note: note.trim(),
        contacted: false, createdAt: serverTimestamp(),
      });
      const snap = await new Promise<number>(resolve => {
        const unsub = onSnapshot(collection(db, 'waitlist'), s => {
          unsub();
          const sorted = s.docs
            .filter(d => !d.data().contacted)
            .sort((a, b) => (a.data().createdAt?.seconds ?? 0) - (b.data().createdAt?.seconds ?? 0));
          const idx = sorted.findIndex(d => d.id === ref.id);
          resolve(idx >= 0 ? idx + 1 : sorted.length);
        });
      });
      setMyPosition(snap);
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
    setSubmitting(false);
  };

  if (myPosition !== null) return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>웨이팅 리스트에 등록됐습니다</h2>
        <p style={{ fontSize: 18, color: '#3C3C43', lineHeight: 1.7, marginBottom: 8 }}>
          현재 대기 순번은 <strong>{myPosition}번째</strong>입니다
        </p>
        <p style={{ fontSize: 16, color: '#8E8E93', lineHeight: 1.7 }}>
          순서대로 담당자가 직접 연락드릴 예정입니다.<br />감사합니다 🙏
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '22px 24px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height: 36, display: 'block', margin: '0 auto 12px' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>모스픽 이용 신청</h1>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.6 }}>
          {waitingCount !== null ? `현재 대기 인원 ${waitingCount}명` : ' '}
        </p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '22px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 15, color: '#3C3C43', lineHeight: 1.7, marginBottom: 20 }}>
            신청해주시면 순서대로 모스픽 담당자가 직접 연락드립니다.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#3C3C43', marginBottom: 8 }}>성함</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#3C3C43', marginBottom: 8 }}>연락처</label>
            <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#3C3C43', marginBottom: 8 }}>남기실 말씀 (선택)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="환자분 상태, 문의 내용 등을 자유롭게 적어주세요"
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button onClick={handleSubmit}
            disabled={submitting || !name.trim() || !phone.trim()}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: (!name.trim() || !phone.trim() || submitting) ? '#C7C7CC' : '#1C1C1E',
              color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: F,
            }}>
            {submitting ? '신청 중…' : '신청하기'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#AEAEB2', marginTop: 28 }}>문의: 모스픽팀</p>
      </div>
    </div>
  );
}
