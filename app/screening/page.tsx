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
const lbl = '#000';
const lbl2 = 'rgba(60,60,67,0.6)';
const sep = 'rgba(60,60,67,0.18)';
const bg = '#F2F2F7';

// 이전 단계 맵
const prevStep: Partial<Record<Step, Step>> = {
  consent: 'intro', form: 'consent', camera: 'form', review: 'camera',
};

// 레이아웃: 스크롤 영역 + 하단 고정 버튼
function Layout({ children, footer, onBack }: { children: React.ReactNode; footer: React.ReactNode; onBack?: () => void }) {
  return (
    <div style={{ minHeight: '100svh', background: bg, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      {/* 상단 뒤로가기 */}
      {/* 스크롤 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: onBack ? '20px 20px 0' : '52px 20px 0', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {children}
      </div>
      {/* 고정 하단 버튼 */}
      <div style={{ position: 'sticky', bottom: 0, background: bg, padding: '16px 20px 32px', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {footer}
      </div>
    </div>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? green : 'rgba(60,60,67,0.1)', border: checked ? 'none' : `1.5px solid ${sep}`, transition: 'background 0.15s' }}>
      {checked && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

export default function ScreeningPage() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<FormData>({ patientName: '', caregiverName: '', caregiverContact: '', region: '', communicationMethod: '', note: '' });
  const [consents, setConsents] = useState({ privacy: false, video: false, marketing: false });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  const goBack = () => { const p = prevStep[step]; if (p) setStep(p); };

  const speak = useCallback((text: string): Promise<void> => new Promise(resolve => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.85;
    u.onend = () => resolve(); u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  }), []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStep('camera');
    } catch { setError('카메라 접근이 거부되었습니다. 설정에서 카메라 권한을 허용해주세요.'); }
  }, []);

  useEffect(() => {
    if ((step === 'camera' || step === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const startRecording = useCallback(async () => {
    const stream = streamRef.current; if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder; chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    setRecordedMimeType(mimeType); recorder.start(1000); setIsRecording(true); setStep('recording');
    const startTime = Date.now();
    for (const item of SEQUENCE) {
      setInstruction(item.text); if (item.beep) playBeep(); await speak(item.text);
      const expected = SEQUENCE.slice(0, SEQUENCE.indexOf(item) + 1).reduce((s, x) => s + x.duration, 0);
      const remaining = expected - (Date.now() - startTime);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      setProgress(Math.min(100, Math.round((Date.now() - startTime) / TOTAL_DURATION * 100)));
    }
    recorder.stop(); setIsRecording(false); setProgress(100);
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
        const r = await upload(`screening/${Date.now()}_${form.patientName.replace(/\s/g, '_')}.${ext}`, blob, { access: 'public', handleUploadUrl: '/api/screening/upload' });
        videoUrl = r.url;
      } catch (e) { console.warn('Blob 업로드 실패:', e); }
      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
      await fetch('/api/screening', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, videoUrl, blinkDetected: null, deviceType, userAgent: navigator.userAgent }) });
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('complete');
    } catch (e) { console.error(e); setError('제출 중 오류가 발생했습니다.'); }
    finally { setIsUploading(false); }
  }, [form, recordedMimeType]);

  const isFormValid = !!(form.patientName && form.caregiverName && form.caregiverContact && form.region);
  const primaryBtn = (disabled?: boolean): React.CSSProperties => ({ padding: '16px', borderRadius: 14, border: 'none', background: disabled ? 'rgba(60,60,67,0.12)' : blue, color: disabled ? lbl2 : '#fff', fontSize: 17, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: font });
  const prevBtn: React.CSSProperties = { padding: '16px 20px', borderRadius: 14, border: `1.5px solid ${sep}`, background: '#fff', color: lbl2, fontSize: 17, fontWeight: 500, cursor: 'pointer', fontFamily: font };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', border: `1px solid ${sep}`, borderRadius: 12, fontSize: 17, color: lbl, outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: font };

  // ── INTRO ─────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Image src="/morspeak-logo2.svg" alt="Morspeak" width={148} height={42} priority style={{ marginBottom: 40 }} />
        <h1 style={{ fontSize: 32, fontWeight: 700, color: lbl, letterSpacing: '-0.5px', marginBottom: 16 }}>눈 깜빡임 테스트</h1>
        <p style={{ fontSize: 17, color: lbl2, lineHeight: 1.7 }}>
          모스픽 앱 사용 가능 여부를 원격으로 확인합니다.<br />카메라로 짧은 영상이 녹화되며, 모스픽 팀 외에는 공유되지 않습니다.
        </p>
        <p style={{ fontSize: 14, color: lbl2, marginTop: 12 }}>약 3분 소요</p>
      </div>
      <div style={{ padding: '16px 28px 36px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <button style={{ ...primaryBtn(), borderRadius: 980, width: '100%' }} onClick={() => setStep('consent')}>시작하기</button>
      </div>
    </div>
  );

  // ── CONSENT ───────────────────────────────────────────────────
  if (step === 'consent') {
    const allRequired = consents.privacy && consents.video;
    const allChecked = consents.privacy && consents.video && consents.marketing;
    const toggleAll = () => { const n = !allChecked; setConsents({ privacy: n, video: n, marketing: n }); };

    const items = [
      {
        key: 'privacy' as const, required: true, title: '개인정보 수집·이용 동의',
        rows: [
          ['수집 항목', '환우 이름, 보호자 이름·연락처, 거주 지역, 소통 방법, 메모'],
          ['수집 목적', '모스픽 앱 적합성 평가 및 결과 안내'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 파기'],
          ['제3자 제공', '없음'],
        ],
        fullText: `모스픽(이하 "회사")은 눈 깜빡임 테스트 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.\n\n수집하는 개인정보 항목은 환우 이름, 보호자 이름, 보호자 연락처, 거주 지역, 현재 소통 방법, 메모이며, 이는 모스픽 앱 적합성 평가 및 결과 안내 연락 목적으로만 활용됩니다.\n\n수집된 개인정보는 평가 완료 후 1년간 보관되며, 보유 기간 만료 시 즉시 파기됩니다. 제3자 제공 및 처리 위탁은 없습니다.\n\n귀하는 개인정보 수집·이용에 동의하지 않으실 권리가 있으나, 동의하지 않으실 경우 테스트 참여가 어렵습니다. 수집된 개인정보에 대한 열람, 정정, 삭제, 처리 정지 요청은 hello@morspeak.com으로 연락해주세요.`,
      },
      {
        key: 'video' as const, required: true, title: '영상 수집·이용 동의',
        rows: [
          ['수집 항목', '얼굴이 포함된 눈 깜빡임 영상 (약 30초)'],
          ['수집 목적', '모스픽 팀의 앱 사용 가능 여부 평가'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 삭제'],
          ['제3자 제공', '없음'],
        ],
        fullText: `본 테스트 과정에서 환우의 얼굴이 포함된 눈 깜빡임 영상(약 30초)이 녹화됩니다. 녹화된 영상은 모스픽 앱 사용 가능 여부를 판단하기 위한 목적으로만 활용되며, 모스픽 내부 담당자 외에는 접근이 불가합니다.\n\n영상은 암호화된 클라우드 스토리지에 안전하게 저장되며, 평가 완료 후 1년이 경과하면 즉시 삭제됩니다. 제3자 제공은 없습니다.\n\n화면에는 흐린 처리된 영상만 표시되며, 실제 녹화 파일은 서버에 안전하게 저장됩니다. 영상 삭제를 원하시는 경우 hello@morspeak.com으로 연락해주시면 즉시 처리해드립니다.`,
      },
      {
        key: 'marketing' as const, required: false, title: '서비스 연락 동의 (선택)',
        rows: [
          ['내용', '모스픽 신규 기능, 업데이트 안내'],
          ['수단', '문자(SMS), 전화'],
        ],
        fullText: `모스픽은 보호자 연락처로 신규 기능 출시, 앱 업데이트, 서비스 관련 안내를 문자 또는 전화로 전달할 수 있습니다.\n\n본 항목은 선택 사항으로, 동의하지 않으셔도 테스트 참여에는 제한이 없습니다. 수신을 원하지 않으실 경우 언제든지 hello@morspeak.com으로 수신 거부를 요청하실 수 있습니다.`,
      },
    ];

    return (
      <Layout
        onBack={goBack}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('intro')} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button style={{ ...primaryBtn(!allRequired), flex: 1 }} disabled={!allRequired} onClick={() => setStep('form')}>동의하고 계속하기</button>
          </div>
        }
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>동의 및 개인정보</h1>
        <p style={{ fontSize: 15, color: lbl2, marginBottom: 24 }}>테스트 진행을 위해 아래 항목을 확인해주세요.</p>

        {/* 전체 동의 */}
        <button onClick={toggleAll} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, padding: '15px 16px', cursor: 'pointer', marginBottom: 12, fontFamily: font }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: lbl }}>전체 동의</span>
          <Check checked={allChecked} />
        </button>

        <div style={{ height: 1, background: sep, marginBottom: 12 }} />

        {items.map(item => (
          <div key={item.key} style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            {/* 타이틀 + 체크 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setConsents(c => ({ ...c, [item.key]: !c[item.key] }))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: lbl }}>{item.title}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: item.required ? red : lbl2, background: item.required ? 'rgba(255,59,48,0.1)' : 'rgba(60,60,67,0.08)', padding: '2px 7px', borderRadius: 20 }}>
                  {item.required ? '필수' : '선택'}
                </span>
                <button onClick={e => { e.stopPropagation(); setExpanded(ex => ({ ...ex, [item.key]: !ex[item.key] })); }}
                  style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.45)', background: 'rgba(60,60,67,0.07)', padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: font }}>
                  {expanded[item.key] ? '접기' : '전체 보기'}
                </button>
              </div>
              <Check checked={consents[item.key]} />
            </div>

            {/* 표 — 항상 표시 */}
            <div style={{ borderTop: `1px solid ${sep}` }}>
              {item.rows.map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderTop: i > 0 ? `1px solid ${sep}` : 'none', background: 'rgba(60,60,67,0.02)' }}>
                  <span style={{ fontSize: 13, color: lbl2, minWidth: 64, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, color: lbl, lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>



            {/* 전체 안내 텍스트 — 펼쳤을 때만 표시 */}
            {expanded[item.key] && (
              <div style={{ borderTop: `1px solid ${sep}`, padding: '14px 16px', background: 'rgba(60,60,67,0.02)' }}>
                <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' as const }}>
                  {item.fullText}
                </p>
              </div>
            )}
          </div>
        ))}

        <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.6, marginTop: 12, marginBottom: 8 }}>
          필수 항목에 동의하지 않으시면 테스트에 참여하실 수 없습니다. 동의는 언제든지 철회 가능하며, 문의는 hello@morspeak.com으로 연락해주세요.
        </p>
      </Layout>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────
  if (step === 'form') return (
    <Layout
      onBack={goBack}
      footer={
        <>
          {error && <p style={{ color: red, fontSize: 14, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('consent')} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button style={{ ...primaryBtn(!isFormValid), flex: 1 }} disabled={!isFormValid} onClick={startCamera}>다음</button>
          </div>
        </>
      }
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>정보 입력</h1>
      <p style={{ fontSize: 15, color: lbl2, marginBottom: 28 }}>보호자가 입력해주세요.</p>

      {[
        { label: '환우 이름', key: 'patientName', placeholder: '홍길동', type: 'text' },
        { label: '보호자 이름', key: 'caregiverName', placeholder: '홍보호', type: 'text' },
        { label: '보호자 연락처', key: 'caregiverContact', placeholder: '010-0000-0000', type: 'tel' },
      ].map(({ label: l, key, placeholder, type }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: lbl2, marginBottom: 6 }}>{l}</label>
          <input type={type} placeholder={placeholder} value={(form as any)[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
        </div>
      ))}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: lbl2, marginBottom: 6 }}>거주 지역</label>
        <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
          style={{ ...inputStyle, color: form.region ? lbl : lbl2, appearance: 'none' as const }}>
          <option value="">선택해주세요</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: lbl2, marginBottom: 6 }}>현재 소통 방법 (선택)</label>
        <select value={form.communicationMethod} onChange={e => setForm(f => ({ ...f, communicationMethod: e.target.value }))}
          style={{ ...inputStyle, color: form.communicationMethod ? lbl : lbl2, appearance: 'none' as const }}>
          <option value="">선택해주세요</option>
          {COMM_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: lbl2, marginBottom: 6 }}>메모 (선택)</label>
        <textarea placeholder="특이사항이 있으면 적어주세요" value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          style={{ ...inputStyle, minHeight: 80, resize: 'none' as const }} />
      </div>
    </Layout>
  );

  // ── CAMERA ────────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ minHeight: '100svh', background: '#000', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(22px)', transform: 'scaleX(-1) scale(1.12)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 32px' }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 8 }}>카메라를 설정해주세요</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.6 }}>환우의 얼굴이 카메라 정면을 향하도록 기기를 놓아주세요.</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>화면은 흐리게 표시되지만 녹화는 선명하게 저장됩니다</p>
          {error && <p style={{ color: '#FF6B6B', fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button onClick={startRecording} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#fff', color: '#000', fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>테스트 시작</button>
        </div>
      </div>
    </div>
  );

  // ── RECORDING ─────────────────────────────────────────────────
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

  // ── REVIEW ────────────────────────────────────────────────────
  if (step === 'review') return (
    <Layout
      onBack={() => { chunksRef.current = []; goBack(); }}
      footer={
        <>
          {error && <p style={{ color: red, fontSize: 14, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { chunksRef.current = []; setStep('camera'); }} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button style={{ ...primaryBtn(isUploading), flex: 1 }} disabled={isUploading} onClick={submitResult}>
              {isUploading ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </>
      }
    >
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <svg width="22" height="17" viewBox="0 0 22 17" fill="none"><path d="M1.5 8.5l6 6L20.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>녹화 완료</h1>
      <p style={{ fontSize: 15, color: lbl2, marginBottom: 24 }}>아래 정보를 확인하고 제출해주세요.</p>

      <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
        {[['환우', form.patientName], ['보호자', form.caregiverName], ['연락처', form.caregiverContact], ['지역', form.region]].map(([l, v], i, arr) => (
          <div key={l}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
              <span style={{ fontSize: 16, color: lbl2 }}>{l}</span>
              <span style={{ fontSize: 16, color: lbl, fontWeight: 500 }}>{v}</span>
            </div>
            {i < arr.length - 1 && <div style={{ height: 1, background: sep, margin: '0 16px' }} />}
          </div>
        ))}
      </div>
    </Layout>
  );

  // ── COMPLETE ──────────────────────────────────────────────────
  if (step === 'complete') return (
    <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="32" height="25" viewBox="0 0 32 25" fill="none"><path d="M2 12.5l10 10L30 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 12 }}>제출 완료</h1>
        <p style={{ fontSize: 17, color: lbl2, lineHeight: 1.7 }}>
          테스트에 참여해 주셔서 감사합니다.<br />
          모스픽 팀이 검토 후 <strong style={{ color: lbl }}>{form.caregiverContact}</strong>으로 연락드리겠습니다.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.35)', marginTop: 20 }}>창을 닫으셔도 됩니다.</p>
      </div>
    </div>
  );

  return null;
}
