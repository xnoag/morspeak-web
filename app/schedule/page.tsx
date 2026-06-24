'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

const DATES: { date: string; label: string; slots: string[] }[] = [
  { date: '2026-06-29', label: '6월 29일 (월)', slots: [
    '09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45','11:00','11:15',
  ]},
  { date: '2026-06-30', label: '6월 30일 (화)', slots: [
    '09:00','09:15','09:30','09:45',
    '10:00','10:15','10:30','10:45',
    '11:00','11:15','11:30','11:45',
    '12:00','12:15','12:30','12:45',
    '13:00','13:15','13:30','13:45',
    '14:00','14:15','14:30','14:45',
    '15:00','15:15','15:30','15:45',
  ]},
];

const BLOCKED = new Set(['20260629-1530', '20260629-1630']);

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g,'').slice(0,11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}시 ${m}분`;
};
const fmtRange = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const endM = m + 15;
  const endH = endM >= 60 ? h + 1 : h;
  const endMin = endM >= 60 ? endM - 60 : endM;
  const end = `${String(endH).padStart(2,'0')}:${String(endMin).padStart(2,'0')}`;
  return `${fmtTime(t)} ~ ${fmtTime(end)}`;
};

type Booking = { patientName: string; caregiverName: string; contactPhone: string; meetingType: string; bookedAt: string };
const slotId = (date: string, time: string) => `${date.replace(/-/g,'')}-${time.replace(':','')}`;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '2px solid #E5E5EA', borderRadius: 12,
  fontSize: 17, outline: 'none', fontFamily: F,
  boxSizing: 'border-box', background: '#fff',
  color: '#1C1C1E',
};

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [phone, setPhone] = useState('');
  const [meetingType, setMeetingType] = useState<'kakao' | 'zoom' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ date: string; time: string; dateLabel: string } | null>(null);
  const [altTime, setAltTime] = useState('');
  const [altName, setAltName] = useState('');
  const [altCaregiver, setAltCaregiver] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [altSubmitting, setAltSubmitting] = useState(false);
  const [altDone, setAltDone] = useState(false);
  const [slotsReady, setSlotsReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth).catch(() => {});
    const unsub = onSnapshot(collection(db, 'schedule_slots'), snap => {
      const map: Record<string, Booking> = {};
      snap.docs.forEach(d => { const data = d.data(); if (data.patientName) map[d.id] = data as Booking; });
      setBookings(map);
      setSlotsReady(true);
    });
    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!selected || !patientName.trim() || !caregiverName.trim() || !phone.trim() || !meetingType) return;
    const id = slotId(selected.date, selected.time);
    const savedSelected = { ...selected };
    setSubmitting(true);
    try {
      await runTransaction(db, async (tx) => {
        const slotDoc = doc(db, 'schedule_slots', id);
        const snap = await tx.get(slotDoc);
        if (snap.exists() && (snap.data() as Booking).patientName) {
          throw new Error('ALREADY_BOOKED');
        }
        tx.set(slotDoc, {
          date: savedSelected.date, time: savedSelected.time,
          patientName: patientName.trim(), caregiverName: caregiverName.trim(),
          contactPhone: phone.trim(), meetingType,
          bookedAt: new Date().toISOString(),
        });
      });
      const dateLabel = DATES.find(d => d.date === savedSelected.date)?.label ?? savedSelected.date;
      setDone({ ...savedSelected, dateLabel });
      setSelected(null); setPatientName(''); setCaregiverName(''); setPhone(''); setMeetingType('');
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

  const handleAlt = async () => {
    if (!altTime.trim() || !altName.trim() || !altPhone.trim()) return;
    setAltSubmitting(true);
    try {
      await addDoc(collection(db, 'schedule_alt'), {
        patientName: altName.trim(), caregiverName: altCaregiver.trim(),
        contactPhone: altPhone.trim(),
        preferredTime: altTime.trim(), submittedAt: new Date().toISOString(),
      });
      setAltDone(true);
    } catch {
      alert('오류가 발생했습니다.');
    }
    setAltSubmitting(false);
  };

  if (done) return (
    <div style={{ minHeight:'100svh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:64, marginBottom:20 }}>✅</div>
        <h2 style={{ fontSize:26, fontWeight:700, color:'#1C1C1E', marginBottom:10 }}>신청이 완료됐습니다</h2>
        <p style={{ fontSize:18, color:'#3C3C43', lineHeight:1.7, marginBottom:8 }}>
          <strong>{done.dateLabel}</strong><br/>{fmtRange(done.time)}
        </p>
        <p style={{ fontSize:16, color:'#8E8E93', lineHeight:1.7 }}>
          확인 후 담당자가 연락드릴 예정입니다.<br/>감사합니다 🙏
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100svh', background:'#F5F5F7', fontFamily:F }}>
      {/* 헤더 */}
      <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.08)', padding:'22px 24px', textAlign:'center' }}>
        <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height:36, display:'block', margin:'0 auto 12px' }} />
        <h1 style={{ fontSize:22, fontWeight:700, color:'#1C1C1E', marginBottom:6 }}>일정 신청</h1>
        <p style={{ fontSize:16, color:'#6E6E73', lineHeight:1.6 }}>
          카카오톡 영상통화 또는 ZOOM으로 진행됩니다
        </p>
      </div>

      <div style={{ maxWidth:540, margin:'0 auto', padding:'24px 16px 48px' }}>

        {/* ── SECTION 1: 날짜·시간 선택 ── */}
        <div style={{ background:'#fff', borderRadius:20, padding:'22px 20px', marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'#1C1C1E', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>1</div>
            <p style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', margin:0 }}>날짜와 시간을 선택해주세요</p>
          </div>

          {DATES.map(({ date, label, slots }) => {
            const morning = slots.filter(t => parseInt(t)<12);
            const afternoon = slots.filter(t => parseInt(t)>=12);
            const renderSlots = (list: string[]) => (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:8 }}>
                {list.map(time => {
                  const id = slotId(date, time);
                  const blocked = BLOCKED.has(id);
                  const booked = !!bookings[id];
                  const unavailable = blocked || booked;
                  const isSelected = selected?.date === date && selected?.time === time;
                  const [h,m] = time.split(':').map(Number);
                  const label12 = `${h>12?h-12:h}시${m>0?` ${m}분`:''}`;
                  return (
                    <button key={time} disabled={unavailable || !slotsReady}
                      onClick={() => setSelected(unavailable ? null : isSelected ? null : { date, time })}
                      style={{
                        height: 64, borderRadius: 12,
                        border: `2px solid ${isSelected?'#1C1C1E':unavailable?'#E5E5EA':'#D1D1D6'}`,
                        background: isSelected?'#1C1C1E':unavailable?'#F5F5F7':'#fff',
                        color: isSelected?'#fff':unavailable?'#C7C7CC':'#1C1C1E',
                        opacity: slotsReady ? 1 : 0.4,
                        fontFamily:F, fontSize:17, fontWeight:600,
                        cursor:unavailable?'not-allowed':'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.12s',
                        textDecoration:unavailable?'line-through':'none',
                      }}>
                      {label12}
                    </button>
                  );
                })}
              </div>
            );
            return (
              <div key={date} style={{ marginBottom:20 }}>
                <div style={{ background:'#1C1C1E', borderRadius:10, padding:'10px 16px', marginBottom:12 }}>
                  <p style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>{label}</p>
                </div>
                {morning.length > 0 && <>
                  <p style={{ fontSize:13, fontWeight:600, color:'#8E8E93', marginBottom:6, paddingLeft:2 }}>오전</p>
                  {renderSlots(morning)}
                </>}
                {afternoon.length > 0 && <>
                  <p style={{ fontSize:13, fontWeight:600, color:'#8E8E93', marginBottom:6, paddingLeft:2, marginTop:morning.length>0?10:0 }}>오후</p>
                  {renderSlots(afternoon)}
                </>}
              </div>
            );
          })}

          <p style={{ fontSize:14, color:'#AEAEB2', textAlign:'center', marginTop:4 }}>
            취소선 표시된 시간은 이미 마감됐습니다
          </p>
        </div>

        {/* ── SECTION 2: 정보 입력 (슬롯 선택 시) ── */}
        {selected && (
          <div style={{ background:'#fff', borderRadius:20, padding:'22px 20px', marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'2px solid #1C1C1E' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#1C1C1E', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>2</div>
              <p style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', margin:0 }}>정보를 입력해주세요</p>
            </div>

            <div style={{ background:'#F5F5F7', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:22 }}>📅</span>
              <div>
                <p style={{ fontSize:14, color:'#8E8E93', margin:0 }}>선택하신 시간</p>
                <p style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', margin:0 }}>
                  {DATES.find(d=>d.date===selected.date)?.label} {fmtRange(selected.time)}
                </p>
              </div>
              <button onClick={()=>setSelected(null)}
                style={{ marginLeft:'auto', fontSize:13, color:'#8E8E93', background:'none', border:'none', cursor:'pointer', fontFamily:F, padding:'4px 8px' }}>
                변경
              </button>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:15, fontWeight:600, color:'#3C3C43', marginBottom:8 }}>환우 성함</label>
              <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="홍길동" style={inputStyle} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:15, fontWeight:600, color:'#3C3C43', marginBottom:8 }}>보호자 성함</label>
              <input value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="보호자" style={inputStyle} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:15, fontWeight:600, color:'#3C3C43', marginBottom:8 }}>연락처</label>
              <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" style={inputStyle} />
            </div>

            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:15, fontWeight:600, color:'#3C3C43', marginBottom:10 }}>면담 방식</label>
              <div style={{ display:'flex', gap:10 }}>
                {[{val:'kakao',label:'카카오톡 영상통화'},{val:'zoom',label:'온라인 ZOOM'}].map(({val,label})=>(
                  <button key={val} type="button" onClick={()=>setMeetingType(val as 'kakao'|'zoom')}
                    style={{ flex:1, padding:'14px 0', borderRadius:12,
                      border:`2px solid ${meetingType===val?'#1C1C1E':'#D1D1D6'}`,
                      background:meetingType===val?'#1C1C1E':'#fff',
                      color:meetingType===val?'#fff':'#3C3C43',
                      fontFamily:F, fontSize:16, fontWeight:meetingType===val?700:400, cursor:'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleBook}
              disabled={submitting || !patientName.trim() || !caregiverName.trim() || !phone.trim() || !meetingType}
              style={{ width:'100%', padding:'16px', borderRadius:14, border:'none',
                background:(!patientName.trim()||!caregiverName.trim()||!phone.trim()||!meetingType||submitting)?'#C7C7CC':'#1C1C1E',
                color:'#fff', fontSize:18, fontWeight:700, cursor:'pointer', fontFamily:F }}>
              {submitting ? '신청 중…' : '신청하기'}
            </button>
          </div>
        )}

        {/* ── SECTION 3: 가능한 시간 없을 때 ── */}
        <div style={{ background:'#EEF2FF', border:'2px solid #A5B4FC', borderRadius:20, padding:'22px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ fontSize:28 }}>⏰</span>
            <p style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', margin:0 }}>가능한 시간이 없으신가요?</p>
          </div>
          <p style={{ fontSize:16, color:'#4C5880', marginBottom:18, lineHeight:1.6 }}>
            원하시는 일자와 시간대를 적어주시면<br/>담당자가 조율해드리겠습니다.
          </p>
          {altDone ? (
            <div style={{ textAlign:'center', padding:'14px 0' }}>
              <p style={{ fontSize:18, fontWeight:700, color:'#1C1C1E', marginBottom:6 }}>접수됐습니다 ✓</p>
              <p style={{ fontSize:15, color:'#6E6E73' }}>담당자가 확인 후 연락드릴게요.</p>
            </div>
          ) : (
            <>
              <input value={altName} onChange={e=>setAltName(e.target.value)} placeholder="환우 성함"
                style={{ ...inputStyle, border:'2px solid #A5B4FC', marginBottom:10 }} />
              <input value={altCaregiver} onChange={e=>setAltCaregiver(e.target.value)} placeholder="보호자 성함 (선택)"
                style={{ ...inputStyle, border:'2px solid #A5B4FC', marginBottom:10 }} />
              <input value={altPhone} onChange={e=>setAltPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric"
                style={{ ...inputStyle, border:'2px solid #A5B4FC', marginBottom:10 }} />
              <input value={altTime} onChange={e=>setAltTime(e.target.value)} placeholder="예: 6/29 오후 1시, 6/30 오전 중"
                style={{ ...inputStyle, border:'2px solid #A5B4FC', marginBottom:14 }} />
              <button onClick={handleAlt}
                disabled={altSubmitting || !altTime.trim() || !altName.trim() || !altPhone.trim()}
                style={{ width:'100%', padding:'15px', borderRadius:14, border:'none',
                  background:(!altTime.trim()||!altName.trim()||!altPhone.trim()||altSubmitting)?'#C7C7CC':'#4F46E5',
                  color:'#fff', fontSize:17, fontWeight:700, cursor:'pointer', fontFamily:F }}>
                {altSubmitting ? '제출 중…' : '시간 제출하기'}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:14, color:'#AEAEB2', marginTop:28 }}>문의: 모스픽팀</p>
      </div>
    </div>
  );
}
