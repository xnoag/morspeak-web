'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// Blend shape 기반 감지 (iOS ARKit의 eyeBlinkLeft/Right와 동일한 방식)
const BLINK_CLOSE = 0.4;  // 이 값 이상이면 눈 감김
const BLINK_OPEN  = 0.2;  // 이 값 이하면 눈 뜸

const MIXED_PATTERN = ['1', '2', '1', '1', '2'] as const;
const MIN_BLINK = 0.10;
const MAX_BLINK = 2.5;

const font = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif';

type SubStep = 'loading' | 'short' | 'long' | 'mixed' | 'done';

export interface BlinkProfile {
  boundary: number;
  shortDurations: number[];
  longDurations: number[];
}

interface Props {
  onComplete: (result: BlinkProfile) => void;
  onBack: () => void;
}

function getBlinkScore(blendshapes: { categoryName: string; score: number }[]): number {
  const l = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score ?? 0;
  const r = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score ?? 0;
  return Math.max(l, r); // ALS 환자는 한쪽 눈이 약할 수 있으므로 max 사용
}

export default function BlinkDetect({ onComplete, onBack }: Props) {
  const [subStep, setSubStep]       = useState<SubStep>('loading');
  const [blinkCount, setBlinkCount] = useState(0);
  const [mixedIndex, setMixedIndex] = useState(0);
  const [feedback, setFeedback]     = useState('');
  const [noFace, setNoFace]         = useState(false);
  const [loadError, setLoadError]   = useState('');

  const videoRef  = useRef<HTMLVideoElement>(null);
  const exRef     = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs for rAF callback (state is stale in closures)
  const subRef    = useRef<SubStep>('loading');
  const cntRef    = useRef(0);
  const midxRef   = useRef(0);
  const closedRef = useRef(false);
  const closeTRef = useRef(0);
  const shortDurs = useRef<number[]>([]);
  const longDurs  = useRef<number[]>([]);
  const boundaryR = useRef(0.6);
  const doneRef   = useRef(false);
  const noFaceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fbRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFb = useCallback((msg: string) => {
    setFeedback(msg);
    if (fbRef.current) clearTimeout(fbRef.current);
    fbRef.current = setTimeout(() => setFeedback(''), 900);
  }, []);

  const advance = useCallback((next: SubStep) => {
    subRef.current  = next;
    cntRef.current  = 0;
    midxRef.current = 0;
    closedRef.current = false;
    setSubStep(next);
    setBlinkCount(0);
    setMixedIndex(0);
    setFeedback('');
  }, []);

  const onBlink = useCallback((code: string, dur: number) => {
    const s = subRef.current;
    if (s === 'short') {
      if (code === '1') {
        shortDurs.current.push(dur);
        cntRef.current += 1;
        setBlinkCount(cntRef.current);
        showFb('잘했어요!');
        if (cntRef.current >= 5) setTimeout(() => advance('long'), 1200);
      } else {
        showFb('더 짧게!');
      }
    } else if (s === 'long') {
      if (code === '2') {
        longDurs.current.push(dur);
        cntRef.current += 1;
        setBlinkCount(cntRef.current);
        showFb('잘했어요!');
        if (cntRef.current >= 5) {
          const ms = shortDurs.current.reduce((a, b) => a + b, 0) / shortDurs.current.length;
          const ml = longDurs.current.reduce((a, b) => a + b, 0) / longDurs.current.length;
          boundaryR.current = Math.min(0.90, Math.max(0.35, (ms + ml) / 2));
          setTimeout(() => advance('mixed'), 1200);
        }
      } else {
        showFb('더 길게!');
      }
    } else if (s === 'mixed') {
      const i = midxRef.current;
      if (i >= MIXED_PATTERN.length) return;
      const exp = MIXED_PATTERN[i];
      if (code === exp) {
        midxRef.current += 1;
        setMixedIndex(midxRef.current);
        showFb('잘했어요!');
        if (midxRef.current >= MIXED_PATTERN.length && !doneRef.current) {
          doneRef.current = true;
          subRef.current = 'done';
          setTimeout(() => {
            setSubStep('done');
            onComplete({
              boundary: boundaryR.current,
              shortDurations: shortDurs.current,
              longDurations: longDurs.current,
            });
          }, 800);
        }
      } else {
        showFb(exp === '1' ? '더 짧게!' : '더 길게!');
      }
    }
  }, [showFb, advance, onComplete]);

  useEffect(() => {
    let cancelled = false;
    let fl: any = null;
    let af = 0;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks('/mediapipe');
        if (cancelled) return;

        fl = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
        });
        if (cancelled) { fl.close(); return; }

        subRef.current = 'short';
        setSubStep('short');

        const loop = () => {
          if (cancelled) return;
          af = requestAnimationFrame(loop);
          const v = videoRef.current;
          if (!v || v.readyState < 2 || subRef.current === 'done') return;
          const ts = performance.now();
          try {
            const res = fl.detectForVideo(v, ts);
            if (res.faceLandmarks?.length > 0) {
              if (noFaceRef.current) { clearTimeout(noFaceRef.current); noFaceRef.current = null; }
              setNoFace(false);

              const score = getBlinkScore(res.faceBlendshapes?.[0]?.categories ?? []);

              if (!closedRef.current && score > BLINK_CLOSE) {
                closedRef.current = true;
                closeTRef.current = ts / 1000;
              } else if (closedRef.current && score < BLINK_OPEN) {
                const dur = ts / 1000 - closeTRef.current;
                closedRef.current = false;
                if (dur >= MIN_BLINK && dur <= MAX_BLINK) {
                  onBlink(dur >= boundaryR.current ? '2' : '1', dur);
                }
              }
            } else {
              if (!noFaceRef.current) {
                noFaceRef.current = setTimeout(() => setNoFace(true), 1200);
              }
            }
          } catch {}
        };
        loop();
      } catch (e) {
        console.error('[BlinkDetect] init error:', e);
        if (!cancelled) setLoadError(`초기화 실패: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(af);
      fl?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (noFaceRef.current) clearTimeout(noFaceRef.current);
      if (fbRef.current) clearTimeout(fbRef.current);
    };
  }, [onBlink]);

  // Reload example video when substep changes
  useEffect(() => {
    const v = exRef.current;
    if (!v || !['short', 'long'].includes(subStep)) return;
    v.load();
    v.play().catch(() => {});
  }, [subStep]);

  const stepNum  = { loading: 0, short: 1, long: 2, mixed: 3, done: 4 }[subStep];
  const stepInfo: Record<SubStep, { title: string; sub: string }> = {
    loading: { title: '준비 중',       sub: '얼굴 감지를 초기화하는 중이에요' },
    short:   { title: '짧게 깜빡이기', sub: '짧게 감았다가 바로 떠주세요  ×5' },
    long:    { title: '길게 깜빡이기', sub: '길게 감은 뒤 천천히 떠주세요  ×5' },
    mixed:   { title: '섞어서 해보기', sub: '순서에 맞게 깜빡여주세요' },
    done:    { title: '완료!',         sub: '결과를 저장하는 중이에요' },
  };
  const { title, sub } = stepInfo[subStep];

  if (loadError) return (
    <div style={{ minHeight: '100svh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: font, gap: 20 }}>
      <p style={{ color: '#fff', fontSize: 17, textAlign: 'center', lineHeight: 1.6 }}>{loadError}</p>
      <button onClick={onBack} style={{ padding: '14px 28px', borderRadius: 980, background: '#fff', color: '#000', fontSize: 17, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: font }}>
        돌아가기
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#000', fontFamily: font, position: 'relative', overflow: 'hidden' }}>
      {/* Camera background (blurred) */}
      <video ref={videoRef} playsInline muted style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', display: 'block',
        filter: 'blur(20px)', transform: 'scaleX(-1) scale(1.12)',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)', zIndex: 10 }}>
        <div style={{ height: '100%', background: '#fff', width: `${(stepNum / 3) * 100}%`, transition: 'width 0.6s ease' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', padding: '56px 28px 44px' }}>

        {/* Step label */}
        <div style={{ marginBottom: 'auto' }}>
          {stepNum > 0 && stepNum < 4 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{stepNum} / 3</p>
          )}
          <p style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 6 }}>{title}</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{sub}</p>
        </div>

        {/* Blink count (short / long) */}
        {(subStep === 'short' || subStep === 'long') && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 36 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < blinkCount ? '#fff' : 'rgba(255,255,255,0.22)',
                transition: 'background 0.15s',
              }} />
            ))}
          </div>
        )}

        {/* Mixed pattern */}
        {subStep === 'mixed' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 36 }}>
            {MIXED_PATTERN.map((code, i) => (
              <div key={i} style={{
                width: code === '1' ? 14 : 36,
                height: 14,
                borderRadius: 7,
                background: i < mixedIndex ? '#fff' : 'rgba(255,255,255,0.22)',
                outline: i === mixedIndex ? '2.5px solid rgba(255,255,255,0.9)' : 'none',
                outlineOffset: 3,
                transition: 'background 0.15s',
              }} />
            ))}
          </div>
        )}

        {/* Feedback */}
        <div style={{ textAlign: 'center', minHeight: 40, marginBottom: 12 }}>
          {feedback && (
            <p style={{ fontSize: 22, fontWeight: 700, color: feedback === '잘했어요!' ? '#34C759' : '#FF9500' }}>
              {feedback}
            </p>
          )}
        </div>

        {/* No-face warning */}
        {noFace && subStep !== 'loading' && subStep !== 'done' && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: '#FFD60A', background: 'rgba(255,214,10,0.12)', padding: '7px 16px', borderRadius: 20 }}>
              얼굴을 화면 가운데에 맞춰주세요
            </span>
          </div>
        )}

        {/* Back (loading state only) */}
        {subStep === 'loading' && (
          <button onClick={onBack} style={{
            alignSelf: 'center',
            padding: '13px 28px', borderRadius: 980,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)',
            fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: font,
          }}>
            이전으로
          </button>
        )}
      </div>

      {/* Example video (short / long step) */}
      {(subStep === 'short' || subStep === 'long') && (
        <div style={{
          position: 'absolute', bottom: 96, right: 20, zIndex: 10,
          width: 80, borderRadius: 14, overflow: 'hidden',
          background: '#000', border: '1.5px solid rgba(255,255,255,0.28)',
        }}>
          <video ref={exRef} src={`/screening/${subStep}.mp4`} loop muted playsInline
            style={{ width: '100%', display: 'block' }} />
          <div style={{ padding: '3px 0', textAlign: 'center', background: 'rgba(0,0,0,0.55)' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: font }}>예시</span>
          </div>
        </div>
      )}

      {/* Loading spinner dots */}
      {subStep === 'loading' && (
        <div style={{ position: 'absolute', bottom: 160, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(255,255,255,0.4)',
              animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
