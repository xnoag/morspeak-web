'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { upload } from '@vercel/blob/client';

type Step = 'intro' | 'form' | 'camera' | 'recording' | 'review' | 'complete';

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
  { text: '지금부터 눈 깜빡임 테스트를 시작합니다. 카메라를 바라보며 편안하게 계세요.', duration: 5000 },
  { text: '삐 소리가 나면 눈을 천천히 감아주시고, 다시 안내가 나오면 눈을 떠주세요.', duration: 5000 },
  { text: '그럼 시작하겠습니다. 눈을 뜨고 정면을 바라봐 주세요.', duration: 4000 },
  { text: '1번입니다.', duration: 1500 },
  { text: '눈을 감아주세요.', duration: 3000, beep: true },
  { text: '눈을 떠주세요.', duration: 2500 },
  { text: '잘 하셨습니다. 2번입니다.', duration: 2500 },
  { text: '눈을 감아주세요.', duration: 3000, beep: true },
  { text: '눈을 떠주세요.', duration: 2500 },
  { text: '거의 다 왔어요. 마지막 3번입니다.', duration: 3000 },
  { text: '눈을 감아주세요.', duration: 3000, beep: true },
  { text: '눈을 떠주세요.', duration: 2500 },
  { text: '테스트가 모두 완료되었습니다. 수고하셨습니다.', duration: 3000 },
];
const TOTAL_DURATION = SEQUENCE.reduce((s, x) => s + x.duration, 0);

export default function ScreeningPage() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<FormData>({
    patientName: '', caregiverName: '', caregiverContact: '',
    region: '', communicationMethod: '', note: '', consent: false,
  });
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
      if (!window.speechSynthesis) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = 0.88;
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
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  // 카메라 시작
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
      setError('카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
    }
  }, []);

  // 스텝 전환 시 video에 stream 재연결
  useEffect(() => {
    if ((step === 'camera' || step === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  // 카메라 정리
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // 녹화 + 안내 시퀀스
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

    // 시퀀스 실행
    const startTime = Date.now();
    for (const item of SEQUENCE) {
      setInstruction(item.text);
      if (item.beep) playBeep();
      await speak(item.text);

      // 남은 대기 시간
      const elapsed = Date.now() - startTime;
      const expectedElapsed = SEQUENCE.slice(0, SEQUENCE.indexOf(item) + 1).reduce((s, x) => s + x.duration, 0);
      const remaining = expectedElapsed - elapsed;
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));

      setProgress(Math.min(100, Math.round((Date.now() - startTime) / TOTAL_DURATION * 100)));
    }

    recorder.stop();
    setIsRecording(false);
    setProgress(100);

    // 녹화 완료 후 review 단계로
    await new Promise<void>(resolve => { recorder.onstop = () => resolve(); setTimeout(resolve, 1000); });
    setStep('review');
  }, [speak, playBeep]);

  const submitResult = useCallback(async (mimeType: string) => {
    setIsUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `screening/${Date.now()}_${form.patientName.replace(/\s/g, '_')}.${ext}`;

      let videoUrl: string | null = null;
      try {
        const result = await upload(filename, blob, {
          access: 'public',
          handleUploadUrl: '/api/screening/upload',
        });
        videoUrl = result.url;
      } catch (e) {
        console.warn('영상 업로드 실패 (BLOB_READ_WRITE_TOKEN 확인 필요):', e);
      }

      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
        : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

      await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          videoUrl,
          blinkDetected: null,
          deviceType,
          userAgent: navigator.userAgent,
        }),
      });

      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('complete');
    } catch (e) {
      console.error('제출 오류:', e);
      setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  }, [form]);

  const isFormValid = form.patientName && form.caregiverName &&
    form.caregiverContact && form.region && form.consent;

  const css = {
    page: { minHeight: '100svh', background: '#fafafa', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'PretendardVariable', -apple-system, sans-serif" },
    card: { width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px', padding: '36px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d1d1f', marginBottom: '6px' } as React.CSSProperties,
    input: { width: '100%', padding: '12px 14px', border: '1.5px solid #e5e5e5', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '16px', color: '#1d1d1f' },
    btn: { width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#1d1d1f', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
    btnGray: { background: '#e5e5e5', color: '#888', cursor: 'not-allowed' },
    tag: { fontSize: '12px', color: '#aaa', marginBottom: '18px', letterSpacing: '0.04em' },
  };

  /* ── INTRO ─────────────────────────────────────── */
  if (step === 'intro') return (
    <div style={css.page}>
      <div style={css.card}>
        <p style={css.tag}>모스픽 원격 테스트</p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f', marginBottom: '12px', letterSpacing: '-0.02em' }}>눈 깜빡임 테스트</h1>
        <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.75, marginBottom: '28px' }}>
          안녕하세요. 이 테스트는 모스픽 앱 사용 가능 여부를 원격으로 확인하기 위한 것입니다.<br /><br />
          소요 시간은 약 <strong>3~5분</strong>이며, 짧은 영상이 녹화됩니다. <strong>영상에는 얼굴이 포함될 수 있으며, 모스픽 팀 외 공유되지 않습니다.</strong><br /><br />
          보호자분께서 기기를 설치해주시고, 안내에 따라 진행해주세요.
        </p>
        <button style={css.btn} onClick={() => setStep('form')}>시작하기</button>
      </div>
    </div>
  );

  /* ── FORM ──────────────────────────────────────── */
  if (step === 'form') return (
    <div style={css.page}>
      <div style={{ ...css.card, maxWidth: '520px' }}>
        <p style={css.tag}>1 / 3 — 정보 입력</p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', marginBottom: '24px', letterSpacing: '-0.02em' }}>기본 정보를 입력해주세요</h1>

        {[
          { label: '환자 이름 *', key: 'patientName', placeholder: '홍길동' },
          { label: '보호자 이름 *', key: 'caregiverName', placeholder: '홍보호' },
          { label: '보호자 연락처 *', key: 'caregiverContact', placeholder: '010-0000-0000' },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label style={css.label}>{label}</label>
            <input style={css.input} placeholder={placeholder}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}

        <label style={css.label}>거주 지역 *</label>
        <select style={{ ...css.input, background: '#fff' }} value={form.region}
          onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
          <option value="">선택해주세요</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={css.label}>현재 소통 방법 (선택)</label>
        <select style={{ ...css.input, background: '#fff' }} value={form.communicationMethod}
          onChange={e => setForm(f => ({ ...f, communicationMethod: e.target.value }))}>
          <option value="">선택해주세요</option>
          {COMM_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <label style={css.label}>메모 (선택)</label>
        <textarea style={{ ...css.input, height: '72px', resize: 'none' as const }}
          placeholder="특이사항이 있으면 적어주세요"
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />

        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '24px', cursor: 'pointer', fontSize: '13px', color: '#555', lineHeight: 1.6 }}>
          <input type="checkbox" checked={form.consent}
            onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
            style={{ marginTop: '2px', flexShrink: 0 }} />
          개인정보 수집·이용에 동의합니다. 수집된 정보는 모스픽 서비스 적합성 확인 목적으로만 사용됩니다.
        </label>

        {error && <p style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button style={{ ...css.btn, ...(isFormValid ? {} : css.btnGray) }}
          disabled={!isFormValid} onClick={startCamera}>
          다음 — 카메라 설정
        </button>
      </div>
    </div>
  );

  /* ── CAMERA ────────────────────────────────────── */
  if (step === 'camera') return (
    <div style={css.page}>
      <div style={{ ...css.card, maxWidth: '560px' }}>
        <p style={css.tag}>2 / 3 — 카메라 확인</p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-0.02em' }}>카메라 위치를 확인해주세요</h1>
        <p style={{ fontSize: '14px', color: '#6e6e73', marginBottom: '16px', lineHeight: 1.6 }}>
          환자의 얼굴이 화면 중앙에 오도록 기기를 조정해주세요.
        </p>

        {/* 카메라 프리뷰 */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#111', marginBottom: '8px', aspectRatio: '4/3', position: 'relative' }}>
          <video ref={videoRef} playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(18px)', transform: 'scaleX(-1) scale(1.1)' }} />
        </div>
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px', textAlign: 'center' }}>
          화면은 흐리게 표시되지만 녹화는 선명하게 저장됩니다
        </p>

        {error && <p style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button style={css.btn} onClick={startRecording}>테스트 녹화 시작</button>
        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '12px' }}>
          버튼을 누르면 약 20초간 자동 녹화됩니다
        </p>
      </div>
    </div>
  );

  /* ── RECORDING ─────────────────────────────────── */
  if (step === 'recording') return (
    <div style={css.page}>
      <div style={{ ...css.card, maxWidth: '560px' }}>
        <p style={css.tag}>3 / 3 — 녹화 중</p>

        {/* 진행 바 */}
        <div style={{ height: '4px', background: '#e5e5e5', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1d1d1f', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>

        {/* 카메라 화면 */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#111', marginBottom: '20px', aspectRatio: '4/3', position: 'relative' }}>
          <video ref={videoRef} playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(18px)', transform: 'scaleX(-1) scale(1.1)' }} />
          {/* 녹화 표시 */}
          {isRecording && (
            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '20px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF3B30', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>REC</span>
            </div>
          )}
        </div>

        {/* 안내 텍스트 */}
        <p style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', textAlign: 'center', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {isUploading ? '영상을 저장하는 중...' : instruction}
        </p>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    </div>
  );

  /* ── REVIEW ────────────────────────────────────── */
  if (step === 'review') return (
    <div style={css.page}>
      <div style={css.card}>
        <p style={css.tag}>녹화 완료</p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', marginBottom: '12px', letterSpacing: '-0.02em' }}>녹화가 완료되었습니다</h1>
        <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.75, marginBottom: '28px' }}>
          아래 정보를 확인하고 제출해주세요.<br />
          제출하면 모스픽 팀이 영상을 검토 후 연락드립니다.
        </p>

        <div style={{ background: '#f5f5f7', borderRadius: '12px', padding: '16px 18px', fontSize: '14px', color: '#444', marginBottom: '28px', lineHeight: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>환자</span><span style={{ fontWeight: 600 }}>{form.patientName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>보호자</span><span>{form.caregiverName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>연락처</span><span>{form.caregiverContact}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>지역</span><span>{form.region}</span>
          </div>
        </div>

        {error && <p style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        <button style={{ ...css.btn, ...(isUploading ? css.btnGray : {}) }}
          disabled={isUploading}
          onClick={() => submitResult(recordedMimeType)}>
          {isUploading ? '제출 중...' : '제출하기'}
        </button>
        <button style={{ width: '100%', padding: '14px', marginTop: '10px', borderRadius: '12px', border: '1.5px solid #e5e5e5', background: '#fff', color: '#888', fontSize: '15px', cursor: 'pointer' }}
          onClick={() => { chunksRef.current = []; setStep('camera'); }}>
          다시 녹화하기
        </button>
      </div>
    </div>
  );

  /* ── COMPLETE ───────────────────────────────────── */
  if (step === 'complete') return (
    <div style={css.page}>
      <div style={{ ...css.card, textAlign: 'center' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', marginBottom: '12px', letterSpacing: '-0.02em' }}>제출 완료</h1>
        <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.75, marginBottom: '24px' }}>
          테스트에 참여해 주셔서 감사합니다.<br />
          모스픽 팀이 결과를 검토한 후<br />
          <strong>{form.caregiverContact}</strong>으로 연락드리겠습니다.
        </p>
        <p style={{ fontSize: '12px', color: '#aaa' }}>창을 닫으셔도 됩니다.</p>
      </div>
    </div>
  );

  return null;
}
