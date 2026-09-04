'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Session = {
  patientName: string;
  caregiverName: string;
  donationLink?: string;
  customImageUrl?: string;
  videoUrl?: string;
  message?: string;
  submittedAt?: string;
};

export default function PersonalizedReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'review_sessions', id)).then(snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      const data = snap.data() as Session;
      setSession(data);
      setPatientName(data.patientName || '');
      setCaregiverName(data.caregiverName || '');
      if (data.message) setMessage(data.message);
      if (data.submittedAt) setSubmitted(true);
    });
  }, [id]);

  const handleSubmit = async () => {
    if (!message.trim() || !patientName.trim() || !caregiverName.trim() || !session || saving) return;
    setSaving(true);
    await updateDoc(doc(db, 'review_sessions', id), {
      patientName: patientName.trim(),
      caregiverName: caregiverName.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
    setSaving(false);
  };

  const base: React.CSSProperties = {
    minHeight: '100dvh',
    background: '#FFFBF0',
    fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
    WebkitFontSmoothing: 'antialiased',
  };

  if (notFound) return (
    <div style={{ ...base, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
        <div style={{ fontSize:16, color:'#6B6860' }}>링크를 찾을 수 없어요.</div>
      </div>
    </div>
  );

  if (!session) return (
    <div style={{ ...base, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontSize:14, color:'#9E9C96' }}>불러오는 중...</div>
    </div>
  );

  if (submitted) return (
    <div style={{ ...base, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'44px 28px', textAlign:'center', width:'100%', maxWidth:360, boxShadow:'0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>💛</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#1A1916', marginBottom:10, letterSpacing:'-0.5px' }}>감사합니다!</div>
        <div style={{ fontSize:15, color:'#6B6860', lineHeight:1.8 }}>
          기부자님께<br/>소중한 말씀이 잘 전달될 거예요.<br/>
          <span style={{ fontWeight:600, color:'#B07800' }}>모스픽</span>과 함께해주셔서 감사합니다 🙏
        </div>
      </div>
    </div>
  );

  return (
    <div style={base}>
      {/* 카드 이미지 */}
      <div style={{ width:'100%', background:'#FFC627' }}>
        {session.customImageUrl
          ? <img src={session.customImageUrl} alt="감사 카드" style={{ width:'100%', display:'block' }} />
          : <Image src="/gongjang-thankyou.jpeg" alt="곧장기부 감사 카드"
              width={800} height={533} style={{ width:'100%', height:'auto', display:'block' }} priority />
        }
      </div>

      <div style={{ padding:'20px 20px 48px' }}>
        {/* 기부 완료 링크 */}
        {session.donationLink && (
          <a href={session.donationLink} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background:'#1C1C1E', color:'#FFC627', textDecoration:'none',
              borderRadius:16, padding:'18px 20px', marginBottom:20,
              fontSize:16, fontWeight:700, boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
              WebkitTapHighlightColor:'transparent' }}>
            <span style={{ fontSize:20 }}>🎁</span>
            기부 완료 내역 확인하기
            <span style={{ fontSize:14, opacity:0.7 }}>→</span>
          </a>
        )}

        {/* 한마디 입력 */}
        <div style={{ background:'#fff', borderRadius:20, padding:'22px 18px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#1A1916', marginBottom:6, letterSpacing:'-0.3px' }}>
            기부자님께 전하는 한마디 ✍️
          </div>
          <div style={{ fontSize:14, color:'#9E9C96', lineHeight:1.7, marginBottom:6 }}>
            저희 가족을 위해 기부해주신 분들께 감사한 마음을 적어주세요.
          </div>
          <div style={{ background:'#FFF9E6', border:'1.5px solid #FFD700', borderRadius:12, padding:'12px 14px', marginBottom:18, fontSize:13, color:'#7A5800', lineHeight:1.7 }}>
            💛 <strong>정성껏 작성해주신 한마디</strong>는 기부자님들께 전달되고,<br/>
            더 많은 분들께 모스픽이 닿을 수 있는 큰 힘이 됩니다.<br/>
            <strong>공백 제외 500자 이상</strong> 작성해주시면 감사하겠습니다 🙏
          </div>

          {/* 이름 입력 */}
          <div style={{ display:'flex', gap:10, marginBottom:6 }}>
            {([['환우명', patientName, setPatientName], ['보호자명', caregiverName, setCaregiverName]] as const).map(([label, val, setter]) => (
              <div key={label} style={{ flex:1 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#B07800', display:'block', marginBottom:6 }}>{label}</label>
                <input type="text" value={val} onChange={e=>setter(e.target.value)}
                  placeholder={label}
                  style={{ width:'100%', padding:'14px 14px', border:'1.5px solid #E8E6DF', borderRadius:12, fontSize:16, fontFamily:"'Noto Sans KR', -apple-system, sans-serif", outline:'none', boxSizing:'border-box' as const, background:'#FAFAF8', WebkitAppearance:'none' as const }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize:12, color:'#C7C7CC', marginBottom:18, lineHeight:1.6 }}>
            * 이름은 가명으로 처리되어 공개되지만, 관리를 위해 본명을 입력해주세요.
          </div>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="예) 덕분에 제 어머니가 다시 소통할 수 있게 되었어요. 모스픽을 쓰기 전에는 눈빛으로만 소통했는데, 이제는 원하시는 걸 직접 표현하실 수 있게 되었습니다. 기부해주신 분들 덕분에 저희 가족에게 큰 선물이 되었어요. 정말 감사합니다 🙏"
            rows={12}
            style={{
              width: '100%',
              padding: '16px',
              border: '1.5px solid #E8E6DF',
              borderRadius: 14,
              fontSize: 16,
              fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
              resize: 'none',
              outline: 'none',
              lineHeight: 1.75,
              boxSizing: 'border-box',
              background: '#FAFAF8',
              color: '#1A1916',
              WebkitAppearance: 'none',
            }}
          />
          {(() => {
            const charCount = message.length;
            const remaining = Math.max(0, 500 - charCount);
            const done = remaining === 0;
            return (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8, marginBottom:20 }}>
                <span style={{ fontSize:13, fontWeight:600, color: done ? '#1A8C3A' : charCount >= 300 ? '#B07800' : '#9E9C96' }}>
                  {done ? '✅ 충분히 작성해주셨어요!' : `앞으로 ${remaining}자 더 필요해요`}
                </span>
                <span style={{ fontSize:12, color: done ? '#1A8C3A' : '#C7C7CC', fontVariantNumeric:'tabular-nums' }}>
                  {charCount} / 500자
                </span>
              </div>
            );
          })()}

          <button
            onClick={handleSubmit}
            disabled={message.length < 500 || !patientName.trim() || !caregiverName.trim() || saving}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: 16,
              border: 'none',
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
              cursor: message.trim() && !saving ? 'pointer' : 'not-allowed',
              background: message.length >= 500 && patientName.trim() && caregiverName.trim() && !saving ? '#FFC627' : '#F2F2F7',
              color: message.length >= 500 && patientName.trim() && caregiverName.trim() && !saving ? '#1A1916' : '#C7C7CC',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: '-0.2px',
            }}
          >
            {saving ? '저장 중...' : '전달하기 💛'}
          </button>
        </div>

        {/* 환우 영상 섹션 */}
        {session.videoUrl && (
          <div style={{ background:'#fff', borderRadius:20, padding:'22px 18px', marginTop:16, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#1A1916', marginBottom:4, letterSpacing:'-0.3px' }}>
              환우분이 모스픽으로 작성해주신 후기 💬
            </div>
            <div style={{ fontSize:13, color:'#9E9C96', lineHeight:1.65, marginBottom:14 }}>
              눈 깜빡임만으로 직접 작성하신 영상이에요.
            </div>
            <video
              controls
              playsInline
              style={{ width:'100%', borderRadius:14, background:'#000', display:'block' }}
            >
              <source src={session.videoUrl} />
            </video>
          </div>
        )}

        {/* 하단 브랜드 */}
        <div style={{ textAlign:'center', marginTop:28, color:'#C7C7CC', fontSize:12 }}>
          모스픽 · 눈 깜빡임으로 말하는 앱
        </div>
      </div>
    </div>
  );
}
