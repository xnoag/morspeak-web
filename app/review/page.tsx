'use client';

import { useState } from 'react';
import Image from 'next/image';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ReviewPage() {
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !patientName.trim() || !caregiverName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'donation_messages'), {
        patientName: patientName.trim(),
        caregiverName: caregiverName.trim(),
        message: message.trim(),
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch {
      alert('저장 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', background:'#FFC627', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
        <div style={{ background:'#fff', borderRadius:20, padding:'40px 28px', textAlign:'center', maxWidth:400, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
          <div style={{ fontSize:56, marginBottom:12 }}>💛</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#1A1916', marginBottom:8 }}>소중한 한마디 감사해요!</div>
          <div style={{ fontSize:14, color:'#6B6860', lineHeight:1.7 }}>기부자님께 잘 전달할게요.<br/>모스픽과 함께해주셔서 감사합니다.</div>
        </div>
      </div>
    );
  }

  const canSubmit = patientName.trim() && caregiverName.trim() && message.trim() && !loading;

  return (
    <div style={{ minHeight:'100vh', background:'#FFC627', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ width:'100%', maxWidth:600, margin:'0 auto', padding:'24px 16px 0' }}>
        <Image src="/gongjang-thankyou.jpeg" alt="곧장기부 감사 카드"
          width={600} height={400}
          style={{ width:'100%', height:'auto', borderRadius:16, boxShadow:'0 4px 24px rgba(0,0,0,0.15)' }}
          priority />
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 16px 48px' }}>
        <div style={{ background:'#fff', borderRadius:20, padding:'24px 20px', boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#1A1916', marginBottom:4 }}>기부자님께 전하는 한마디 ✍️</div>
          <div style={{ fontSize:13, color:'#9E9C96', marginBottom:20, lineHeight:1.65 }}>
            기부자분들께 감사의 마음을 전해주세요.<br/>
            <span style={{ color:'#CC7000', fontWeight:600 }}>환우명·보호자명은 가명으로 처리되어 공개됩니다.</span><br/>
            본명으로 작성해 주세요.
          </div>

          <div style={{ display:'flex', gap:10, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#6B6860', display:'block', marginBottom:6 }}>환우명 <span style={{ color:'#FF3B30' }}>*</span></label>
              <input type="text" value={patientName} onChange={e=>setPatientName(e.target.value)}
                placeholder="환우 본명"
                style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#6B6860', display:'block', marginBottom:6 }}>보호자명 <span style={{ color:'#FF3B30' }}>*</span></label>
              <input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)}
                placeholder="보호자 본명"
                style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} />
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#6B6860', display:'block', marginBottom:6 }}>기부자님께 한마디 <span style={{ color:'#FF3B30' }}>*</span></label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)}
              placeholder="기부자님들께 전하고 싶은 말씀을 자유롭게 적어주세요..."
              rows={6}
              style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:15, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.7, boxSizing:'border-box' as const }} />
            <div style={{ fontSize:11, color:'#C7C7CC', textAlign:'right' as const, marginTop:4 }}>{message.length}자</div>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ width:'100%', padding:'16px', borderRadius:12, border:'none', fontSize:16, fontWeight:700, fontFamily:'inherit',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? '#FFC627' : '#F2F2F7',
              color: canSubmit ? '#1A1916' : '#C7C7CC',
              transition:'all 0.15s' }}>
            {loading ? '저장 중...' : '전달하기 💛'}
          </button>
        </div>
      </div>
    </div>
  );
}
