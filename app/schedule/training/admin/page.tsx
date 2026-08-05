'use client';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const PW = '3578';

type Booking = {
  id: string;
  date: string;
  time: string;
  name: string;
  contactPhone: string;
  bookedAt: string;
  patientCode?: string;
  memo?: string;
};

const fmtRange = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t; // "방문" 같은 시간이 아닌 값은 그대로 표시
  const endM = m + 30;
  const endH = endM >= 60 ? h + 1 : h;
  const endMin = endM >= 60 ? endM - 60 : endM;
  const end = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  return `${t}~${end}`;
};

const DATE_LABELS: Record<string, string> = {
  '2026-08-05': '8월 5일 (수) · 방문 교육',
  '2026-08-02': '8월 2일 (일)',
  '2026-08-03': '8월 3일 (월)',
  '2026-08-04': '8월 4일 (화)',
  '2026-08-07': '8월 7일 (금)',
  '2026-08-08': '8월 8일 (토)',
};

export default function TrainingAdminPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authed) return;
    signInAnonymously(getAuth()).catch(() => {});
    return onSnapshot(collection(db, 'training_slots'), snap => {
      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Booking))
        .filter(b => b.name)
        .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));
      setBookings(rows);
    });
  }, [authed]);

  const saveCode = async (id: string) => {
    const code = (codeDrafts[id] ?? '').trim();
    await updateDoc(doc(db, 'training_slots', id), { patientCode: code });
  };

  const saveMemo = async (id: string) => {
    const memo = (memoDrafts[id] ?? '').trim();
    await updateDoc(doc(db, 'training_slots', id), { memo });
  };

  const remove = async (id: string) => {
    if (!confirm('이 예약을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'training_slots', id));
  };

  if (!authed) return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 300, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔒 원격 교육 신청 관리</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pw === PW && setAuthed(true)}
          placeholder="비밀번호" autoFocus
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 15, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <button onClick={() => pw === PW && setAuthed(true)}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
          확인
        </button>
      </div>
    </div>
  );

  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.date] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F, padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>원격 교육 신청 현황</h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginBottom: 20 }}>총 {bookings.length}건 예약됨</p>

        {Object.keys(grouped).length === 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#AEAEB2', fontSize: 15 }}>
            아직 신청된 예약이 없습니다.
          </div>
        )}

        {Object.entries(grouped).map(([date, rows]) => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ background: '#1C1C1E', borderRadius: 10, padding: '10px 16px', marginBottom: 10 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{DATE_LABELS[date] ?? date} · {rows.length}건</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(b => (
                <div key={b.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ minWidth: 100, fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>{fmtRange(b.time)}</div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{b.name}</div>
                      <div style={{ fontSize: 13, color: '#8E8E93' }}>{b.contactPhone}</div>
                    </div>
                    <input
                      value={codeDrafts[b.id] ?? b.patientCode ?? ''}
                      onChange={e => setCodeDrafts(p => ({ ...p, [b.id]: e.target.value }))}
                      onBlur={() => saveCode(b.id)}
                      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      placeholder="환자 코드 매칭"
                      style={{ width: 130, padding: '8px 10px', border: '1.5px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: F, outline: 'none' }}
                    />
                    <button onClick={() => remove(b.id)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#FDEBEC', color: '#D92D20', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
                      삭제
                    </button>
                  </div>
                  <textarea
                    value={memoDrafts[b.id] ?? b.memo ?? ''}
                    onChange={e => setMemoDrafts(p => ({ ...p, [b.id]: e.target.value }))}
                    onBlur={() => saveMemo(b.id)}
                    placeholder="교육 내용 메모 (진행 상황, 특이사항 등)"
                    rows={2}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1C1C1E' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
