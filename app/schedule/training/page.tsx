'use client';
import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

function genSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

const DATES: { date: string; label: string; slots: string[] }[] = [
  { date: '2026-08-02', label: '8월 2일 (일)', slots: genSlots(15, 18) },
  { date: '2026-08-03', label: '8월 3일 (월)', slots: genSlots(13, 21) },
  { date: '2026-08-04', label: '8월 4일 (화)', slots: genSlots(11, 15) },
];

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

const fmtRange = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const endM = m + 30;
  const endH = endM >= 60 ? h + 1 : h;
  const endMin = endM >= 60 ? endM - 60 : endM;
  const end = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  return `${t}~${end}`;
};

type Booking = { name: string; contactPhone: string; bookedAt: string };
const slotId = (date: string, time: string) => `${date.replace(/-/g, '')}-${time.replace(':', '')}`;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '2px solid #E5E5EA', borderRadius: 12,
  fontSize: 17, outline: 'none', fontFamily: F,
  boxSizing: 'border-box', background: '#fff', color: '#1C1C1E',
};

export default function TrainingSchedulePage() {
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ date: string; time: string; dateLabel: string } | null>(null);
  const [slotsReady, setSlotsReady] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth).catch(() => {});
    const unsub = onSnapshot(collection(db, 'training_slots'), snap => {
      const map: Record<string, Booking> = {};
      snap.docs.forEach(d => { const data = d.data(); if (data.name) map[d.id] = data as Booking; });
      setBookings(map);
      setSlotsReady(true);
    });
    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!selected || !name.trim() || !phone.trim()) return;
    const id = slotId(selected.date, selected.time);
    const savedSelected = { ...selected };
    setSubmitting(true);
    try {
      await runTransaction(db, async (tx) => {
        const slotDoc = doc(db, 'training_slots', id);
        const snap = await tx.get(slotDoc);
        if (snap.exists() && (snap.data() as Booking).name) throw new Error('ALREADY_BOOKED');
        tx.set(slotDoc, {
          date: savedSelected.date, time: savedSelected.time,
          name: name.trim(), contactPhone: phone.trim(),
          bookedAt: new Date().toISOString(),
        });
      });
      const dateLabel = DATES.find(d => d.date === savedSelected.date)?.label ?? savedSelected.date;
      setDone({ ...savedSelected, dateLabel });
      setSelected(null); setName(''); setPhone('');
    } catch (e) {
      if ((e as Error).message === 'ALREADY_BOOKED') {
        alert('방금 다른 분이 이 시간을 예약하셨습니다.\n페이지를 새로고침 후 다른 시간을 선택해주세요.');
        setSelected(null);
      } else {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>신청이 완료됐습니다</h2>
        <p style={{ fontSize: 18, color: '#3C3C43', lineHeight: 1.7, marginBottom: 8 }}>
          <strong>{done.dateLabel}</strong><br />{fmtRange(done.time)}
        </p>
        <p style={{ fontSize: 16, color: '#8E8E93', lineHeight: 1.7, marginBottom: 16 }}>
          확인 후 담당자가 연락드릴 예정입니다.<br />감사합니다 🙏
        </p>
        <p style={{ fontSize: 15, color: '#1C1C1E', lineHeight: 1.7, background: '#F5F5F7', borderRadius: 12, padding: '14px 16px' }}>
          📱 예약하신 시간에 맞춰 환자분이 모스픽 앱 화면을 보고 계실 수 있도록 거치대에 아이패드를 끼운 후에 미리 준비해주세요.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '22px 24px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height: 36, display: 'block', margin: '0 auto 12px' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>원격 교육 신청</h1>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.6 }}>모스픽 앱을 통해 원격으로 진행됩니다</p>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 48px' }}>

        <div style={{ background: '#FFF6E5', border: '1px solid #F5D98E', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>📱</span>
          <p style={{ fontSize: 14, color: '#7A5B00', lineHeight: 1.6, margin: 0 }}>
            예약하신 시간에 맞춰 환자분이 모스픽 앱 화면을 보고 계실 수 있도록 거치대에 아이패드를 끼운 후에 미리 준비해주세요.
          </p>
        </div>

        {/* SECTION 1: 날짜·시간 선택 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '22px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1C1C1E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>1</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>날짜와 시간을 선택해주세요</p>
          </div>
          {DATES.map(({ date, label, slots }) => {
            const morning = slots.filter(t => parseInt(t) < 12);
            const afternoon = slots.filter(t => parseInt(t) >= 12);
            const renderSlots = (list: string[]) => (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
                {list.map(time => {
                  const id = slotId(date, time);
                  const booked = !!bookings[id];
                  const isSelected = selected?.date === date && selected?.time === time;
                  return (
                    <button key={time} disabled={booked || !slotsReady}
                      onClick={() => {
                        if (booked) return;
                        setSelected(isSelected ? null : { date, time });
                        if (!isSelected) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                      style={{
                        height: 64, borderRadius: 12,
                        border: `2px solid ${isSelected ? '#1C1C1E' : booked ? '#E5E5EA' : '#D1D1D6'}`,
                        background: isSelected ? '#1C1C1E' : booked ? '#F5F5F7' : '#fff',
                        color: isSelected ? '#fff' : booked ? '#C7C7CC' : '#1C1C1E',
                        fontFamily: F, fontSize: 14, fontWeight: 600,
                        cursor: booked ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', lineHeight: 1.3,
                        transition: 'all 0.12s',
                        textDecoration: booked ? 'line-through' : 'none',
                        opacity: slotsReady ? 1 : 0.4,
                      }}>
                      {fmtRange(time)}
                    </button>
                  );
                })}
              </div>
            );
            return (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{ background: '#1C1C1E', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>{label}</p>
                </div>
                {morning.length > 0 && <><p style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 6, paddingLeft: 2 }}>오전</p>{renderSlots(morning)}</>}
                {afternoon.length > 0 && <><p style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 6, paddingLeft: 2, marginTop: morning.length > 0 ? 10 : 0 }}>오후</p>{renderSlots(afternoon)}</>}
              </div>
            );
          })}
          <p style={{ fontSize: 14, color: '#AEAEB2', textAlign: 'center', marginTop: 4 }}>취소선 표시된 시간은 이미 마감됐습니다</p>
        </div>

        {/* SECTION 2: 정보 입력 */}
        {selected && (
          <div ref={formRef} style={{ background: '#fff', borderRadius: 20, padding: '22px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '2px solid #1C1C1E' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1C1C1E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>2</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>정보를 입력해주세요</p>
            </div>
            <div style={{ background: '#F5F5F7', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>📅</span>
              <div>
                <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>선택하신 시간</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>{DATES.find(d => d.date === selected.date)?.label} {fmtRange(selected.time)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', fontSize: 13, color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: '4px 8px' }}>변경</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#3C3C43', marginBottom: 8 }}>성함</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#3C3C43', marginBottom: 8 }}>연락처</label>
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" style={inputStyle} />
            </div>
            <button onClick={handleBook}
              disabled={submitting || !name.trim() || !phone.trim()}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: (!name.trim() || !phone.trim() || submitting) ? '#C7C7CC' : '#1C1C1E',
                color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: F,
              }}>
              {submitting ? '신청 중…' : '신청하기'}
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 14, color: '#AEAEB2', marginTop: 28 }}>문의: 모스픽팀</p>
      </div>
    </div>
  );
}
