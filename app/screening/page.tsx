'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import Image from 'next/image';

type Step = 'intro' | 'consent' | 'form' | 'camera' | 'recording' | 'review' | 'complete';

interface FormData {
  patientName: string;
  caregiverName: string;
  caregiverContact: string;
  region: string;
  communicationMethod: string;
  note: string;
  consent: boolean;
}

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const COMM_METHODS = ['말로 의사소통', '눈동자 판서판', '보완대체의사소통(AAC)', '기타 보조기기', '소통이 어려운 상태'];

const SEQUENCE: { text: string; duration: number; beep?: boolean }[] = [
  { text: '시작합니다.', duration: 3000 },
  { text: '눈을 감아주세요.', duration: 3500, beep: true },
  { text: '눈을 떠주세요.', duration: 3500 },
  { text: '눈을 감아주세요.', duration: 3500, beep: true },
  { text: '눈을 떠주세요.', duration: 3500 },
  { text: '눈을 감아주세요.', duration: 3500, beep: true },
  { text: '눈을 떠주세요.', duration: 3500 },
  { text: '완료되었습니다.', duration: 2500 },
];
const TOTAL_DURATION = SEQUENCE.reduce((s, x) => s + x.duration, 0);

const font = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, sans-serif';

// Liquid Glass card style
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.18)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
  borderRadius: 28,
};

const glassBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1)',
  borderRadius: 50,
  color: '#1a1a2e',
  fontWeight: 600,
  fontSize: 17,
  cursor: 'pointer',
  width: '100%',
  padding: '17px',
  transition: 'transform 0.15s ease, opacity 0.15s ease',
};

const glassBtnBlue: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(0,150,255,0.9) 0%, rgba(0,100,220,0.85) 100%)',
  border: '1px solid rgba(100,190,255,0.4)',
  boxShadow: '0 4px 20px rgba(0,120,255,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
  borderRadius: 50,
  color: '#fff',
  fontWeight: 600,
  fontSize: 17,
  cursor: 'pointer',
  width: '100%',
  padding: '17px',
  transition: 'transform 0.15s ease, opacity 0.15s ease',
};

// Page background
const pageBg: React.CSSProperties = {
  minHeight: '100svh',
  fontFamily: font,
  background: 'linear-gradient(145deg, #1a1a1a 0%, #2c2c2e 40%, #1c1c1e 70%, #111111 100%)',
  position: 'relative',
  overflow: 'hidden',
};

// Decorative blobs
function Blobs() {
  return (
    <>
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,120,128,0.2) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,100,108,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', right: '20%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,80,88,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

export default function ScreeningPage() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<FormData>({
    patientName: '', caregiverName: '', caregiverContact: '',
    region: '', communicationMethod: '', note: '', consent: false,
  });
  const [instruction, setInstruction] = useState('');
  const [progress, setProgress] = useState(0);
  const [consents, setConsents] = useState({ privacy: false, video: false, marketing: false });
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedMimeType, setRecordedMimeType] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = 0.85;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep('camera');
    } catch {
      setError('카메라 접근이 거부되었습니다. 설정에서 카메라 권한을 허용해주세요.');
    }
  }, []);

  useEffect(() => {
    if ((step === 'camera' || step === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const startRecording = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    setRecordedMimeType(mimeType);
    recorder.start(1000);
    setIsRecording(true);
    setStep('recording');

    const startTime = Date.now();
    for (const item of SEQUENCE) {
      setInstruction(item.text);
      if (item.beep) playBeep();
      await speak(item.text);
      const elapsed = Date.now() - startTime;
      const expected = SEQUENCE.slice(0, SEQUENCE.indexOf(item) + 1).reduce((s, x) => s + x.duration, 0);
      const remaining = expected - elapsed;
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      setProgress(Math.min(100, Math.round((Date.now() - startTime) / TOTAL_DURATION * 100)));
    }

    recorder.stop();
    setIsRecording(false);
    setProgress(100);
    await new Promise<void>(resolve => { recorder.onstop = () => resolve(); setTimeout(resolve, 1000); });
    setStep('review');
  }, [speak, playBeep]);

  const submitResult = useCallback(async () => {
    setIsUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: recordedMimeType });
      const ext = recordedMimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `screening/${Date.now()}_${form.patientName.replace(/\s/g, '_')}.${ext}`;

      let videoUrl: string | null = null;
      try {
        const result = await upload(filename, blob, { access: 'public', handleUploadUrl: '/api/screening/upload' });
        videoUrl = result.url;
      } catch (e) { console.warn('Blob 업로드 실패:', e); }

      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
        : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

      await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, videoUrl, blinkDetected: null, deviceType, userAgent: navigator.userAgent }),
      });

      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('complete');
    } catch (e) {
      console.error(e);
      setError('제출 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [form, recordedMimeType]);

  const isFormValid = form.patientName && form.caregiverName && form.caregiverContact && form.region;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '15px 18px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 16,
    color: '#fff', fontSize: 16,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: font,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.04em',
    marginBottom: 8, display: 'block',
  };

  // ─── INTRO ───────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={pageBg}>
      <Blobs />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ ...glass, padding: '40px 32px', maxWidth: 400, width: '100%' }}>
          <Image src="/morspeak-logo2.svg" alt="Morspeak" width={140} height={40} priority style={{ marginBottom: 28 }} />

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 16 }}>눈 깜빡임<br />테스트</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: 36 }}>
            모스픽 앱이 도움이 될 수 있는지 원격으로 확인합니다. 카메라로 짧은 영상이 녹화되며, 모스픽 팀 외에는 공유되지 않습니다.
          </p>

          <button style={glassBtnBlue} onClick={() => setStep('consent')}>시작하기</button>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 14 }}>약 3분 소요</p>
        </div>
      </div>
    </div>
  );

  // ─── CONSENT ─────────────────────────────────────────────────
  if (step === 'consent') {
    const allRequired = consents.privacy && consents.video;
    const allChecked = consents.privacy && consents.video && consents.marketing;

    const toggleAll = () => {
      const next = !allChecked;
      setConsents({ privacy: next, video: next, marketing: next });
    };

    const items = [
      {
        key: 'privacy' as const,
        required: true,
        title: '개인정보 수집·이용 동의',
        rows: [
          ['수집 항목', '환자 이름, 보호자 이름·연락처, 거주 지역, 현재 소통 방법, 메모'],
          ['수집 목적', '모스픽 앱 적합성 평가 및 결과 안내 연락'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 파기'],
          ['제3자 제공', '없음'],
        ],
      },
      {
        key: 'video' as const,
        required: true,
        title: '영상 수집·이용 동의',
        rows: [
          ['수집 항목', '얼굴이 포함된 눈 깜빡임 영상'],
          ['수집 목적', '모스픽 팀의 앱 사용 적합성 평가'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 삭제'],
          ['제3자 제공', '없음'],
        ],
      },
      {
        key: 'marketing' as const,
        required: false,
        title: '서비스 관련 연락 동의',
        rows: [
          ['내용', '모스픽 신규 기능, 업데이트, 관련 안내 수신'],
          ['수단', '문자, 전화'],
        ],
      },
    ];

    return (
      <div style={pageBg}>
        <Blobs />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ ...glass, padding: '32px 24px', maxWidth: 440, width: '100%', maxHeight: '90svh', overflowY: 'auto' as const }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>동의 및 개인정보</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>테스트 진행을 위해 아래 항목에 동의해주세요.</p>

            {/* 모두 동의 */}
            <button onClick={toggleAll} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>전체 동의</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: allChecked ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', boxShadow: allChecked ? '0 0 12px rgba(52,199,89,0.4)' : 'none', flexShrink: 0 }}>
                {allChecked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5l4 4L12 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />

            {/* 개별 항목 */}
            {items.map(item => (
              <div key={item.key} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 18px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => setConsents(c => ({ ...c, [item.key]: !c[item.key] }))}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{item.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: item.required ? 'rgba(255,69,58,0.25)' : 'rgba(255,255,255,0.12)', color: item.required ? '#FF6B6B' : 'rgba(255,255,255,0.5)' }}>
                      {item.required ? '필수' : '선택'}
                    </span>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: consents[item.key] ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', boxShadow: consents[item.key] ? '0 0 10px rgba(52,199,89,0.35)' : 'none' }}>
                    {consents[item.key] && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>

                {/* 세부 내용 */}
                <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                  {item.rows.map(([label, value], i) => (
                    <div key={label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 64, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: '16px 0 20px' }}>
              필수 항목에 동의하지 않으시면 테스트 참여가 어렵습니다. 동의는 언제든지 철회하실 수 있으며, 문의는 contact@morspeak.com으로 연락해주세요.
            </p>

            <button style={{ ...glassBtnBlue, opacity: allRequired ? 1 : 0.4, cursor: allRequired ? 'pointer' : 'not-allowed' }}
              disabled={!allRequired} onClick={() => setStep('form')}>
              동의하고 계속하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM ────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={pageBg}>
      <Blobs />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ ...glass, padding: '36px 28px', maxWidth: 440, width: '100%', maxHeight: '90svh', overflowY: 'auto' as const }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>정보 입력</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>보호자가 입력해주세요.</p>

          {[
            { label: '환자 이름', key: 'patientName', placeholder: '홍길동', type: 'text' },
            { label: '보호자 이름', key: 'caregiverName', placeholder: '홍보호', type: 'text' },
            { label: '보호자 연락처', key: 'caregiverContact', placeholder: '010-0000-0000', type: 'tel' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{label}</label>
              <input type={type} placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ ...inputStyle }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>거주 지역</label>
            <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              style={{ ...inputStyle, color: form.region ? '#fff' : 'rgba(255,255,255,0.4)', appearance: 'none' as const }}>
              <option value="">선택해주세요</option>
              {REGIONS.map(r => <option key={r} value={r} style={{ color: '#000' }}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>현재 소통 방법 (선택)</label>
            <select value={form.communicationMethod} onChange={e => setForm(f => ({ ...f, communicationMethod: e.target.value }))}
              style={{ ...inputStyle, color: form.communicationMethod ? '#fff' : 'rgba(255,255,255,0.4)', appearance: 'none' as const }}>
              <option value="">선택해주세요</option>
              {COMM_METHODS.map(m => <option key={m} value={m} style={{ color: '#000' }}>{m}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>메모 (선택)</label>
            <textarea placeholder="특이사항이 있으면 적어주세요"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              style={{ ...inputStyle, minHeight: 80, resize: 'none' as const }} />
          </div>

          {error && <p style={{ color: '#FF6B6B', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

          <button style={{ ...glassBtnBlue, opacity: isFormValid ? 1 : 0.4, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
            disabled={!isFormValid} onClick={startCamera}>
            다음
          </button>
        </div>
      </div>
    </div>
  );

  // ─── CAMERA ──────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ ...pageBg, display: 'flex', flexDirection: 'column' }}>
      <Blobs />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(22px)', transform: 'scaleX(-1) scale(1.12)' }} />

        <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px' }}>
          <div style={{ ...glass, padding: '28px 24px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 8 }}>카메라를 설정해주세요</p>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 24, lineHeight: 1.55 }}>환자의 얼굴이 카메라 정면을 향하도록 기기를 놓아주세요.</p>
            <button style={glassBtn} onClick={startRecording}>테스트 시작</button>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12 }}>화면은 흐리게 표시되지만 녹화는 선명하게 저장됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RECORDING ───────────────────────────────────────────────
  if (step === 'recording') return (
    <div style={{ ...pageBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(22px)', transform: 'scaleX(-1) scale(1.12)' }} />

        {/* 진행 바 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)', zIndex: 2 }}>
          <div style={{ height: '100%', background: 'rgba(255,255,255,0.9)', width: `${progress}%`, transition: 'width 0.5s linear', borderRadius: '0 2px 2px 0' }} />
        </div>

        {/* REC 뱃지 */}
        {isRecording && (
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, ...glass, padding: '6px 14px', borderRadius: 50 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF453A', animation: 'blink 1s infinite' }} />
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, letterSpacing: '0.06em' }}>REC</span>
          </div>
        )}

        {/* 안내 텍스트 */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
          <p style={{ fontSize: 'clamp(36px, 9vw, 60px)', fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '-0.5px', textShadow: '0 2px 32px rgba(0,0,0,0.4)' }}>
            {instruction}
          </p>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );

  // ─── REVIEW ──────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={pageBg}>
      <Blobs />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ ...glass, padding: '36px 28px', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(145deg, rgba(52,199,89,0.9), rgba(36,138,61,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 6px 20px rgba(52,199,89,0.35)' }}>
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none"><path d="M2 9l7 7L22 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>녹화 완료</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 28 }}>아래 정보를 확인하고 제출해주세요.</p>

          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '4px 0', marginBottom: 28, border: '1px solid rgba(255,255,255,0.15)' }}>
            {[['환자', form.patientName], ['보호자', form.caregiverName], ['연락처', form.caregiverContact], ['지역', form.region]].map(([label, value], i, arr) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px' }}>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                  <span style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{value}</span>
                </div>
                {i < arr.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />}
              </div>
            ))}
          </div>

          {error && <p style={{ color: '#FF6B6B', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
          <button style={{ ...glassBtnBlue, opacity: isUploading ? 0.5 : 1, marginBottom: 12 }} disabled={isUploading} onClick={submitResult}>
            {isUploading ? '제출 중...' : '제출하기'}
          </button>
          <button style={{ ...glassBtn, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}
            onClick={() => { chunksRef.current = []; setStep('camera'); }}>
            다시 녹화하기
          </button>
        </div>
      </div>
    </div>
  );

  // ─── COMPLETE ────────────────────────────────────────────────
  if (step === 'complete') return (
    <div style={pageBg}>
      <Blobs />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ ...glass, padding: '44px 32px', maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(145deg, rgba(52,199,89,0.9), rgba(36,138,61,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(52,199,89,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none"><path d="M3 14l11 11L33 3" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 12 }}>제출 완료</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: 36 }}>
            테스트에 참여해 주셔서 감사합니다.<br />
            모스픽 팀이 검토 후<br />
            <strong style={{ color: '#fff' }}>{form.caregiverContact}</strong>으로 연락드리겠습니다.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>창을 닫으셔도 됩니다.</p>
        </div>
      </div>
    </div>
  );

  return null;
}
