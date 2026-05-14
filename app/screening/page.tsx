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

const font = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif';

const blue = '#007AFF';
const green = '#34C759';
const red = '#FF3B30';
const label = '#000000';
const label2 = 'rgba(60,60,67,0.6)';
const sep = 'rgba(60,60,67,0.18)';
const bg = '#F2F2F7';

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
  background: blue, color: '#fff', fontSize: 17, fontWeight: 600,
  cursor: 'pointer', fontFamily: font,
};

const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
  background: 'transparent', color: blue, fontSize: 17, fontWeight: 500,
  cursor: 'pointer', fontFamily: font,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: `1px solid ${sep}`, borderRadius: 12,
  fontSize: 17, color: label, outline: 'none',
  background: '#fff', boxSizing: 'border-box', fontFamily: font,
};

export default function ScreeningPage() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<FormData>({
    patientName: '', caregiverName: '', caregiverContact: '',
    region: '', communicationMethod: '', note: '',
  });
  const [consents, setConsents] = useState({ privacy: false, video: false, marketing: false });
  const [instruction, setInstruction] = useState('');
  const [progress, setProgress] = useState(0);
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
      u.onend = () => resolve(); u.onerror = () => resolve();
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
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
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

  useEffect(() => { return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);

  const startRecording = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
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
      const expected = SEQUENCE.slice(0, SEQUENCE.indexOf(item) + 1).reduce((s, x) => s + x.duration, 0);
      const remaining = expected - (Date.now() - startTime);
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
      let videoUrl: string | null = null;
      try {
        const result = await upload(`screening/${Date.now()}_${form.patientName.replace(/\s/g, '_')}.${ext}`, blob, { access: 'public', handleUploadUrl: '/api/screening/upload' });
        videoUrl = result.url;
      } catch (e) { console.warn('Blob 업로드 실패:', e); }
      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
      await fetch('/api/screening', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, videoUrl, blinkDetected: null, deviceType, userAgent: navigator.userAgent }),
      });
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('complete');
    } catch (e) {
      console.error(e);
      setError('제출 중 오류가 발생했습니다.');
    } finally { setIsUploading(false); }
  }, [form, recordedMimeType]);

  const isFormValid = form.patientName && form.caregiverName && form.caregiverContact && form.region;

  const page: React.CSSProperties = { minHeight: '100svh', background: bg, fontFamily: font };
  const inner: React.CSSProperties = { maxWidth: 480, margin: '0 auto', padding: '60px 20px 48px' };

  // ── INTRO ────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={{ ...page, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: '0 28px', textAlign: 'center' }}>
        <Image src="/morspeak-logo2.svg" alt="Morspeak" width={148} height={42} priority style={{ marginBottom: 36 }} />
        <h1 style={{ fontSize: 32, fontWeight: 700, color: label, letterSpacing: '-0.5px', marginBottom: 16 }}>눈 깜빡임 테스트</h1>
        <p style={{ fontSize: 17, color: label2, lineHeight: 1.7, marginBottom: 48 }}>
          모스픽 앱 사용 가능 여부를 원격으로 확인합니다. 카메라로 짧은 영상이 녹화되며, 모스픽 팀 외에는 공유되지 않습니다.
        </p>
        <button style={primaryBtn} onClick={() => setStep('consent')}>시작하기</button>
        <p style={{ fontSize: 14, color: label2, marginTop: 16 }}>약 3분 소요</p>
      </div>
    </div>
  );

  // ── CONSENT ──────────────────────────────────────────────────
  if (step === 'consent') {
    const allRequired = consents.privacy && consents.video;
    const allChecked = consents.privacy && consents.video && consents.marketing;
    const toggleAll = () => { const n = !allChecked; setConsents({ privacy: n, video: n, marketing: n }); };

    const items = [
      { key: 'privacy' as const, required: true, title: '개인정보 수집·이용 동의',
        rows: [['수집 항목', '환자 이름, 보호자 이름·연락처, 거주 지역, 소통 방법, 메모'], ['수집 목적', '모스픽 앱 적합성 평가 및 결과 안내'], ['보유 기간', '평가 완료 후 1년, 이후 파기'], ['제3자 제공', '없음']] },
      { key: 'video' as const, required: true, title: '영상 수집·이용 동의',
        rows: [['수집 항목', '얼굴이 포함된 눈 깜빡임 영상'], ['수집 목적', '모스픽 팀의 적합성 평가'], ['보유 기간', '평가 완료 후 1년, 이후 삭제'], ['제3자 제공', '없음']] },
      { key: 'marketing' as const, required: false, title: '서비스 연락 동의 (선택)',
        rows: [['내용', '모스픽 신규 기능, 업데이트 안내'], ['수단', '문자, 전화']] },
    ];

    return (
      <div style={page}>
        <div style={{ ...inner, maxWidth: 520 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: label, letterSpacing: '-0.4px', marginBottom: 6 }}>동의 및 개인정보</h1>
          <p style={{ fontSize: 15, color: label2, marginBottom: 28 }}>테스트 진행을 위해 아래 항목을 확인해주세요.</p>

          {/* 전체 동의 */}
          <button onClick={toggleAll} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', marginBottom: 16, fontFamily: font }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: label }}>전체 동의</span>
            <Check checked={allChecked} />
          </button>

          <div style={{ height: 1, background: sep, marginBottom: 16 }} />

          {items.map(item => (
            <div key={item.key} style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, cursor: 'pointer' }}
                onClick={() => setConsents(c => ({ ...c, [item.key]: !c[item.key] }))}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: label }}>{item.title}</span>
                  {item.required && <span style={{ fontSize: 11, fontWeight: 600, color: red, background: 'rgba(255,59,48,0.1)', padding: '2px 7px', borderRadius: 20 }}>필수</span>}
                </div>
                <Check checked={consents[item.key]} />
              </div>
              {item.rows.map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '7px 0', borderTop: i > 0 ? `1px solid ${sep}` : 'none' }}>
                  <span style={{ fontSize: 13, color: label2, minWidth: 64, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, color: label, lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
          ))}

          <p style={{ fontSize: 13, color: label2, lineHeight: 1.6, margin: '16px 0 24px' }}>
            필수 항목에 동의하지 않으시면 테스트 참여가 어렵습니다. 동의는 언제든지 철회하실 수 있으며, 문의는 contact@morspeak.com으로 연락해주세요.
          </p>

          <button style={{ ...primaryBtn, opacity: allRequired ? 1 : 0.4, cursor: allRequired ? 'pointer' : 'not-allowed' }}
            disabled={!allRequired} onClick={() => setStep('form')}>
            동의하고 계속하기
          </button>
        </div>
      </div>
    );
  }

  // ── FORM ─────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={page}>
      <div style={inner}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: label, letterSpacing: '-0.4px', marginBottom: 6 }}>정보 입력</h1>
        <p style={{ fontSize: 15, color: label2, marginBottom: 28 }}>보호자가 입력해주세요.</p>

        {[
          { label: '환자 이름', key: 'patientName', placeholder: '홍길동', type: 'text' },
          { label: '보호자 이름', key: 'caregiverName', placeholder: '홍보호', type: 'text' },
          { label: '보호자 연락처', key: 'caregiverContact', placeholder: '010-0000-0000', type: 'tel' },
        ].map(({ label: l, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: label2, marginBottom: 6 }}>{l}</label>
            <input type={type} placeholder={placeholder} value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: label2, marginBottom: 6 }}>거주 지역</label>
          <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
            style={{ ...inputStyle, color: form.region ? label : label2, appearance: 'none' as const }}>
            <option value="">선택해주세요</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: label2, marginBottom: 6 }}>현재 소통 방법 (선택)</label>
          <select value={form.communicationMethod} onChange={e => setForm(f => ({ ...f, communicationMethod: e.target.value }))}
            style={{ ...inputStyle, color: form.communicationMethod ? label : label2, appearance: 'none' as const }}>
            <option value="">선택해주세요</option>
            {COMM_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: label2, marginBottom: 6 }}>메모 (선택)</label>
          <textarea placeholder="특이사항이 있으면 적어주세요" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            style={{ ...inputStyle, minHeight: 80, resize: 'none' as const }} />
        </div>

        {error && <p style={{ color: red, fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button style={{ ...primaryBtn, opacity: isFormValid ? 1 : 0.4, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
          disabled={!isFormValid} onClick={startCamera}>
          다음
        </button>
      </div>
    </div>
  );

  // ── CAMERA ───────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ minHeight: '100svh', background: '#000', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(22px)', transform: 'scaleX(-1) scale(1.12)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 48px' }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 8 }}>카메라를 설정해주세요</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, lineHeight: 1.6 }}>환자의 얼굴이 카메라 정면을 향하도록 기기를 놓아주세요.</p>
          {error && <p style={{ color: '#FF6B6B', fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button onClick={startRecording} style={{ ...primaryBtn, background: '#fff', color: '#000' }}>테스트 시작</button>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 14 }}>화면은 흐리게 표시되지만 녹화는 선명하게 저장됩니다</p>
        </div>
      </div>
    </div>
  );

  // ── RECORDING ────────────────────────────────────────────────
  if (step === 'recording') return (
    <div style={{ minHeight: '100svh', background: '#000', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(22px)', transform: 'scaleX(-1) scale(1.12)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)', zIndex: 2 }}>
          <div style={{ height: '100%', background: '#fff', width: `${progress}%`, transition: 'width 0.5s linear' }} />
        </div>
        {isRecording && (
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', padding: '5px 12px', borderRadius: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: red, animation: 'blink 1s infinite' }} />
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, letterSpacing: '0.06em' }}>REC</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
          <p style={{ fontSize: 'clamp(36px, 9vw, 60px)', fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '-0.5px', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
            {instruction}
          </p>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );

  // ── REVIEW ───────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={page}>
      <div style={inner}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="24" height="18" viewBox="0 0 24 18" fill="none"><path d="M2 9l7 7L22 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: label, letterSpacing: '-0.4px', marginBottom: 6 }}>녹화 완료</h1>
        <p style={{ fontSize: 15, color: label2, marginBottom: 28 }}>아래 정보를 확인하고 제출해주세요.</p>

        <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, marginBottom: 32, overflow: 'hidden' }}>
          {[['환자', form.patientName], ['보호자', form.caregiverName], ['연락처', form.caregiverContact], ['지역', form.region]].map(([l, v], i, arr) => (
            <div key={l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px' }}>
                <span style={{ fontSize: 16, color: label2 }}>{l}</span>
                <span style={{ fontSize: 16, color: label, fontWeight: 500 }}>{v}</span>
              </div>
              {i < arr.length - 1 && <div style={{ height: 1, background: sep, margin: '0 18px' }} />}
            </div>
          ))}
        </div>

        {error && <p style={{ color: red, fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button style={{ ...primaryBtn, opacity: isUploading ? 0.5 : 1 }} disabled={isUploading} onClick={submitResult}>
          {isUploading ? '제출 중...' : '제출하기'}
        </button>
        <button style={secondaryBtn} onClick={() => { chunksRef.current = []; setStep('camera'); }}>
          다시 녹화하기
        </button>
      </div>
    </div>
  );

  // ── COMPLETE ─────────────────────────────────────────────────
  if (step === 'complete') return (
    <div style={{ ...page, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 360, width: '100%', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none"><path d="M3 14l11 11L33 3" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: label, letterSpacing: '-0.4px', marginBottom: 12 }}>제출 완료</h1>
        <p style={{ fontSize: 17, color: label2, lineHeight: 1.7, marginBottom: 40 }}>
          테스트에 참여해 주셔서 감사합니다.<br />
          모스픽 팀이 검토 후 <strong style={{ color: label }}>{form.caregiverContact}</strong>으로 연락드리겠습니다.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.35)' }}>창을 닫으셔도 됩니다.</p>
      </div>
    </div>
  );

  return null;
}

function Check({ checked }: { checked: boolean }) {
  return (
    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? green : 'rgba(60,60,67,0.12)', border: checked ? 'none' : '1.5px solid rgba(60,60,67,0.25)' }}>
      {checked && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}
