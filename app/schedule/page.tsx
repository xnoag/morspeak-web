'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

const DATES: { date: string; label: string; slots: string[] }[] = [
  { date: '2026-06-29', label: '6월 29일 (월)', slots: ['15:00','15:30','16:00','16:30','17:00','17:30'] },
  { date: '2026-06-30', label: '6월 30일 (화)', slots: ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'] },
];

type Booking = { patientName: string; caregiverName: string; contactPhone: string; meetingType: string; bookedAt: string };
const slotId = (date: string, time: string) => `${date.replace(/-/g,'')}-${time.replace(':','')}`;

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [phone, setPhone] = useState('');
  const [meetingType, setMeetingType] = useState<'kakao' | 'zoom' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ date: string; time: string; dateLabel: string } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth).catch(() => {});
    const unsub = onSnapshot(collection(db, 'schedule_slots'), snap => {
      const map: Record<string, Booking> = {};
      snap.docs.forEach(d => { const data = d.data(); if (data.patientName) map[d.id] = data as Booking; });
      setBookings(map);
    });
    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!selected || !patientName.trim() || !caregiverName.trim() || !phone.trim() || !meetingType) return;
    const id = slotId(selected.date, selected.time);
    setSubmitting(true);
    try {
      const snap = await getDoc(doc(db, 'schedule_slots', id));
      if (snap.exists() && (snap.data() as Booking).patientName) {
        alert('이미 다른 분이 선택하신 시간입니다. 다른 시간을 선택해주세요.');
        setSubmitting(false);
        return;
      }
      await setDoc(doc(db, 'schedule_slots', id), {
        date: selected.date, time: selected.time,
        patientName: patientName.trim(), caregiverName: caregiverName.trim(),
        contactPhone: phone.trim(), meetingType,
        bookedAt: new Date().toISOString(),
      });
      const dateLabel = DATES.find(d => d.date === selected.date)?.label ?? selected.date;
      setDone({ ...selected, dateLabel });
      setSelected(null); setPatientName(''); setCaregiverName(''); setPhone(''); setMeetingType('');
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ minHeight:'100svh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#1C1C1E', marginBottom:8 }}>신청이 완료됐습니다</h2>
        <p style={{ fontSize:15, color:'#3C3C43', lineHeight:1.7, marginBottom:6 }}>
          <strong>{done.dateLabel}</strong> {done.time}
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
      <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'20px 24px', textAlign:'center' }}>
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height:32, display:'block', margin:'0 auto 10px' }} />
        <h1 style={{ fontSize:19, fontWeight:700, color:'#1C1C1E', marginBottom:4 }}>온라인 면담 일정 신청</h1>
        <p style={{ fontSize:13, color:'#8E8E93', lineHeight:1.6 }}>
          카카오톡 페이스톡 또는 ZOOM으로 진행됩니다<br/>
          원하시는 날짜와 시간을 선택해주세요
        </p>
      </div>

      <div style={{ maxWidth:520, margin:'0 auto', padding:'20px 16px 40px' }}>
        {/* 전체 슬롯 — 날짜별로 쭉 표시 */}
        {DATES.map(({ date, label, slots }) => (
          <div key={date} style={{ marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#1C1C1E', marginBottom:8, paddingLeft:4 }}>{label}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {slots.map(time => {
                const id = slotId(date, time);
                const booked = !!bookings[id];
                const isSelected = selected?.date === date && selected?.time === time;
                return (
                  <button key={time} disabled={booked}
                    onClick={() => setSelected(booked ? null : isSelected ? null : { date, time })}
                    style={{ padding:'11px 0', borderRadius:10,
                      border:`1.5px solid ${isSelected?'#1C1C1E':booked?'#F2F2F7':'#E5E5EA'}`,
                      background:isSelected?'#1C1C1E':booked?'#F7F7F9':'#fff',
                      color:isSelected?'#fff':booked?'#C7C7CC':'#1C1C1E',
                      fontFamily:F, fontSize:14, fontWeight:600,
                      cursor:booked?'not-allowed':'pointer', transition:'all 0.12s' }}>
                    {time}
                    {booked && <div style={{ fontSize:10, color:'#C7C7CC', fontWeight:400, marginTop:1 }}>마감</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* 입력 폼 */}
        {selected && (
          <div style={{ background:'#fff', borderRadius:14, padding:20, marginTop:8, boxShadow:'0 2px 10px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'#1C1C1E', marginBottom:16 }}>
              📅 {DATES.find(d=>d.date===selected.date)?.label} {selected.time} 신청
            </p>

            {/* 환우 이름 */}
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>환우 성함</label>
              <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="홍길동"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:14, outline:'none', fontFamily:F, boxSizing:'border-box' as const }} />
            </div>

            {/* 보호자 이름 */}
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>보호자 성함</label>
              <input value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="홍보호자"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:14, outline:'none', fontFamily:F, boxSizing:'border-box' as const }} />
            </div>

            {/* 연락처 */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>연락처</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="010-0000-0000"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:14, outline:'none', fontFamily:F, boxSizing:'border-box' as const }} />
            </div>

            {/* 면담 방식 */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:8, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>면담 방식</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{val:'kakao',label:'카카오톡 페이스톡'},{val:'zoom',label:'온라인 ZOOM'}].map(({val,label})=>(
                  <button key={val} type="button"
                    onClick={()=>setMeetingType(val as 'kakao'|'zoom')}
                    style={{ flex:1, padding:'11px 0', borderRadius:10,
                      border:`1.5px solid ${meetingType===val?'#1C1C1E':'#E5E5EA'}`,
                      background:meetingType===val?'#1C1C1E':'#fff',
                      color:meetingType===val?'#fff':'#3C3C43',
                      fontFamily:F, fontSize:13, fontWeight:meetingType===val?600:400, cursor:'pointer', transition:'all 0.12s' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleBook}
              disabled={submitting || !patientName.trim() || !caregiverName.trim() || !phone.trim() || !meetingType}
              style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
                background:(!patientName.trim()||!caregiverName.trim()||!phone.trim()||!meetingType||submitting)?'#C7C7CC':'#1C1C1E',
                color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:F, transition:'background 0.15s' }}>
              {submitting ? '신청 중…' : '신청하기'}
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'#C7C7CC', marginTop:24 }}>문의: 모스픽팀</p>
      </div>
    </div>
  );
}
