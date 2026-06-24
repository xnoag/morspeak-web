'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

// 슬롯 정의
const SLOTS: Record<string, string[]> = {
  '2026-06-29': ['15:00','15:30','16:00','16:30','17:00','17:30'],
  '2026-06-30': ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'],
};
const DATE_LABELS: Record<string, string> = {
  '2026-06-29': '6월 29일 (월)',
  '2026-06-30': '6월 30일 (화)',
};

type Booking = { patientName: string; contactPhone: string; bookedAt: string };

const slotId = (date: string, time: string) =>
  `${date.replace(/-/g,'')}-${time.replace(':','')}`;

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [activeDate, setActiveDate] = useState('2026-06-29');
  const [selected, setSelected] = useState<{date: string; time: string} | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{date: string; time: string} | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth).then(() => setAuthReady(true)).catch(() => setAuthReady(true));
    const unsub = onSnapshot(collection(db, 'schedule_slots'), snap => {
      const map: Record<string, Booking> = {};
      snap.docs.forEach(d => {
        const data = d.data() as Booking;
        if (data.patientName) map[d.id] = data;
      });
      setBookings(map);
    });
    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!selected || !name.trim() || !phone.trim()) return;
    if (!authReady) { alert('잠시 후 다시 시도해주세요.'); return; }
    const id = slotId(selected.date, selected.time);
    setSubmitting(true);
    try {
      // 이미 예약됐는지 확인
      const snap = await getDoc(doc(db, 'schedule_slots', id));
      if (snap.exists() && (snap.data() as Booking).patientName) {
        alert('이미 다른 분이 선택하신 시간입니다. 다른 시간을 선택해주세요.');
        setSubmitting(false);
        return;
      }
      await setDoc(doc(db, 'schedule_slots', id), {
        date: selected.date, time: selected.time,
        patientName: name.trim(), contactPhone: phone.trim(),
        bookedAt: new Date().toISOString(),
      });
      setDone(selected);
      setSelected(null); setName(''); setPhone('');
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ minHeight:'100svh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#1C1C1E', marginBottom:8 }}>신청이 완료됐습니다</h2>
        <p style={{ fontSize:15, color:'#3C3C43', lineHeight:1.6, marginBottom:6 }}>
          <strong>{DATE_LABELS[done.date]}</strong> {done.time}
        </p>
        <p style={{ fontSize:14, color:'#8E8E93', lineHeight:1.6 }}>
          확인 후 담당자가 연락드릴 예정입니다.<br/>감사합니다 🙏
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100svh', background:'#F7F7F9', fontFamily:F }}>
      {/* 헤더 */}
      <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'16px 24px', textAlign:'center' }}>
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height:32, marginBottom:10, display:'block', margin:'0 auto 10px' }} />
        <h1 style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', marginBottom:4 }}>온라인 면담 일정 신청</h1>
        <p style={{ fontSize:13, color:'#8E8E93', lineHeight:1.5 }}>
          카카오톡 페이스톡으로 진행됩니다<br/>
          원하시는 날짜와 시간을 선택해주세요
        </p>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px' }}>
        {/* 날짜 탭 */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {Object.keys(SLOTS).map(date => (
            <button key={date} onClick={() => { setActiveDate(date); setSelected(null); }}
              style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontFamily:F,
                fontSize:14, fontWeight:activeDate===date?700:400,
                background:activeDate===date?'#1C1C1E':'#fff',
                color:activeDate===date?'#fff':'#8E8E93',
                boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              {DATE_LABELS[date]}
            </button>
          ))}
        </div>

        {/* 시간 슬롯 */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:16, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            시간 선택 (30분 단위)
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {SLOTS[activeDate].map(time => {
              const id = slotId(activeDate, time);
              const booked = !!bookings[id];
              const isSelected = selected?.date === activeDate && selected?.time === time;
              return (
                <button key={time}
                  disabled={booked}
                  onClick={() => setSelected(booked ? null : { date: activeDate, time })}
                  style={{ padding:'12px 0', borderRadius:10, border:`1.5px solid ${isSelected?'#1C1C1E':booked?'#F2F2F7':'#E5E5EA'}`,
                    background: isSelected?'#1C1C1E':booked?'#F7F7F9':'#fff',
                    color: isSelected?'#fff':booked?'#C7C7CC':'#1C1C1E',
                    fontFamily:F, fontSize:15, fontWeight:600,
                    cursor:booked?'not-allowed':'pointer', transition:'all 0.12s' }}>
                  {time}
                  {booked && <div style={{ fontSize:10, color:'#C7C7CC', fontWeight:400, marginTop:2 }}>마감</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 입력 폼 */}
        {selected && (
          <div style={{ background:'#fff', borderRadius:14, padding:20, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#1C1C1E', marginBottom:16 }}>
              📅 {DATE_LABELS[selected.date]} {selected.time} 신청
            </p>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>환우 성함</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="홍길동"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:14, outline:'none', fontFamily:F, boxSizing:'border-box' as const }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>연락처</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="010-0000-0000"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:14, outline:'none', fontFamily:F, boxSizing:'border-box' as const }} />
            </div>
            <button onClick={handleBook} disabled={submitting || !name.trim() || !phone.trim()}
              style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
                background: (!name.trim()||!phone.trim()||submitting)?'#C7C7CC':'#1C1C1E',
                color:'#fff', fontSize:15, fontWeight:600, cursor:(!name.trim()||!phone.trim()||submitting)?'not-allowed':'pointer', fontFamily:F }}>
              {submitting ? '신청 중…' : '신청하기'}
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'#C7C7CC', marginTop:24 }}>
          문의: 모스픽팀
        </p>
      </div>
    </div>
  );
}
