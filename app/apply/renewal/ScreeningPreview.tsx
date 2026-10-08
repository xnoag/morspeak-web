'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './screening.module.css';
import { movements, phases, regions, relationships, communicationMethods, referralSources, guidanceDates, recordingMime, type MovementId } from './protocol';

type Info = { patientName: string; diagnosis: string; referralSource: string; referralDetail: string; commMethod: string; preferredDate: string; applicantName: string; relationship: string; region: string; phone: string; note: string };
const emptyInfo: Info = { patientName: '', diagnosis: '', referralSource: '', referralDetail: '', commMethod: '', preferredDate: '', applicantName: '', relationship: '', region: '', phone: '', note: '' };
type Capture = { movement: MovementId; phase: number; kind: 'video' | 'audio' | 'press'; blob?: Blob; url?: string; durations?: number[]; elapsedSeconds?: number; skipped?: string; interrupted?: boolean };
type Screen = 'intro' | 'info' | 'movement' | 'test' | 'done';

function Select({ label, value, options, onChange, optional = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; optional?: boolean }) {
  return <label className={styles.field}><span>{label}{optional && <small>선택</small>}</span><select value={value} onChange={e => onChange(e.target.value)} required={!optional}><option value="">선택해주세요</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select></label>;
}

export default function ScreeningPreview() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [info, setInfo] = useState<Info>(emptyInfo);
  const [dates, setDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<MovementId[]>([]);
  const [noMovement, setNoMovement] = useState(false);
  const [consented, setConsented] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [overlay, setOverlay] = useState(25);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [presses, setPresses] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const demoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pressStart = useRef<number | null>(null);
  const blobs = useRef(new Map<string, string>());
  const mounted = useRef(true);
  const requestId = useRef(0);
  const beginAt = useRef(0);
  const interrupted = useRef(false);
  const locked = useRef(false);
  const movement = movements.find(x => x.id === selected[index]);
  const current = captures.find(x => x.movement === movement?.id && x.phase === phase);
  const stages = ['정보 입력', '움직임 선택', '검사', '완료'];
  const stage = screen === 'intro' ? -1 : screen === 'info' ? 0 : screen === 'movement' ? 1 : screen === 'test' ? 2 : 3;

  const update = (key: keyof Info, value: string) => setInfo(old => ({ ...old, [key]: value }));
  function stopTracks() {
    requestId.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
  }
  function save(capture: Capture) {
    const key = `${capture.movement}-${capture.phase}`;
    const oldUrl = blobs.current.get(key);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    if (capture.url) blobs.current.set(key, capture.url);
    else blobs.current.delete(key);
    setCaptures(old => [...old.filter(x => `${x.movement}-${x.phase}` !== key), capture]);
  }
  function retake() {
    if (!movement || recording) return;
    const key = `${movement.id}-${phase}`;
    const url = blobs.current.get(key);
    if (url) URL.revokeObjectURL(url);
    blobs.current.delete(key);
    setCaptures(old => old.filter(x => `${x.movement}-${x.phase}` !== key));
    setPresses([]);
    setError('');
    setNotice('');
  }

  useEffect(() => {
    const cancellation = requestId;
    const urls = blobs.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancellation.current++;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
      streamRef.current?.getTracks().forEach(track => track.stop());
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  useEffect(() => {
    const camera = videoRef.current;
    if (camera) { camera.srcObject = stream; if (stream) camera.play().catch(() => setError('카메라 미리보기를 시작하지 못했습니다. 다시 연결해주세요.')); }
  }, [stream, screen, movement?.id]);
  useEffect(() => {
    if (demoRef.current) {
      demoRef.current.playbackRate = phase === 1 ? 0.5 : 1;
      demoRef.current.pause();
    }
  }, [movement?.id, phase]);
  useEffect(() => {
    if (!recording) return;
    const tick = setInterval(() => {
      const seconds = Math.floor((performance.now() - beginAt.current) / 1000);
      setElapsed(seconds);
      if (seconds >= 60 && recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
        setNotice('60초가 되어 촬영을 마쳤습니다. 미리보기로 확인해주세요.');
      }
    }, 250);
    const hidden = () => {
      if (document.hidden && recorderRef.current?.state === 'recording') {
        interrupted.current = true;
        recorderRef.current.stop();
      }
    };
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('beforeunload', unload);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('beforeunload', unload); };
  }, [recording]);

  async function prepare() {
    if (!movement || movement.kind === 'press' || preparing) return;
    setError(''); setNotice(''); setPreparing(true);
    const ticket = ++requestId.current;
    let media: MediaStream | undefined;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      media = await navigator.mediaDevices.getUserMedia(movement.kind === 'audio'
        ? { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }
        : { video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 }, frameRate: { ideal: 30 } }, audio: false });
      if (!mounted.current || ticket !== requestId.current) { media.getTracks().forEach(t => t.stop()); return; }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = media;
      setStream(media);
      media.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (recorderRef.current?.state === 'recording') { interrupted.current = true; recorderRef.current.stop(); }
        if (mounted.current && ticket === requestId.current) { setStream(null); setError('카메라 또는 마이크 연결이 끊겼습니다. 다시 연결하거나 이번 검사를 건너뛰어주세요.'); }
      }));
    } catch (e) {
      media?.getTracks().forEach(t => t.stop());
      if (!mounted.current || ticket !== requestId.current) return;
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError'
        ? '접근이 허용되지 않았습니다. Safari의 웹사이트 설정에서 카메라·마이크를 허용한 뒤 다시 연결해주세요.'
        : name === 'NotFoundError' ? '사용할 카메라 또는 마이크가 없습니다. 다른 기기에서 열거나 이 검사를 건너뛰어주세요.'
        : '연결하지 못했습니다. iPhone Safari에서 열고 다른 앱의 카메라·마이크 사용을 종료한 뒤 다시 시도해주세요.');
    } finally { if (mounted.current && ticket === requestId.current) setPreparing(false); }
  }

  async function startRecording() {
    if (!movement || movement.kind === 'press' || !streamRef.current || locked.current) return;
    if (!streamRef.current.getTracks().some(t => t.readyState === 'live')) { setError('카메라·마이크를 다시 연결해주세요.'); return; }
    locked.current = true;
    setError(''); setNotice(''); setElapsed(0);
    const chunks: Blob[] = [];
    const snapshot = { id: movement.id, kind: movement.kind, phase };
    try {
      const mime = recordingMime(snapshot.kind, type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      interrupted.current = false;
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => { interrupted.current = true; setError('기록 중 문제가 발생했습니다. 자료를 확인하고 다시 시도해주세요.'); };
      recorder.onstop = () => {
        locked.current = false;
        if (!mounted.current) return;
        setRecording(false);
        demoRef.current?.pause(); setDemoPlaying(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || mime || (snapshot.kind === 'audio' ? 'audio/mp4' : 'video/mp4') });
        if (!blob.size) { setError('저장된 기록이 없습니다. 다시 검사해주세요.'); return; }
        save({ movement: snapshot.id, phase: snapshot.phase, kind: snapshot.kind, blob, url: URL.createObjectURL(blob), elapsedSeconds: (performance.now() - beginAt.current) / 1000, interrupted: interrupted.current });
        if (interrupted.current) setNotice('화면 전환이나 연결 끊김으로 기록이 중단됐습니다. 자료를 확인한 뒤 다시 검사하는 것을 권합니다.');
      };
      beginAt.current = performance.now();
      recorder.start(1000);
      setRecording(true);
      if (snapshot.kind === 'video' && demoRef.current) {
        demoRef.current.currentTime = 0;
        demoRef.current.play().then(() => setDemoPlaying(true)).catch(() => setNotice('데모 영상 재생 버튼을 눌러주세요. 검사 촬영은 진행 중입니다.'));
      }
    } catch { locked.current = false; setError('이 브라우저에서 기록을 시작하지 못했습니다. iPhone Safari에서 다시 시도해주세요.'); }
  }

  function startPress() { if (pressStart.current !== null || current) return; pressStart.current = performance.now(); setPressing(true); }
  function endPress(cancel = false) {
    const start = pressStart.current;
    pressStart.current = null; setPressing(false);
    if (start !== null && !cancel) setPresses(old => [...old, (performance.now() - start) / 1000]);
  }
  function next() {
    if (!movement || recording || preparing) return;
    if (movement.kind === 'press' && !current) save({ movement: movement.id, phase, kind: 'press', durations: presses });
    setPresses([]); setDemoPlaying(false); setError(''); setNotice('');
    if (phase < 2) setPhase(phase + 1);
    else {
      stopTracks(); setPhase(0);
      if (index + 1 < selected.length) setIndex(index + 1);
      else setScreen('done');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function skip() {
    if (!movement || recording || preparing) return;
    stopTracks();
    for (let p = phase; p < 3; p++) save({ movement: movement.id, phase: p, kind: movement.kind, skipped: '본인·보호자가 검사 건너뛰기를 선택' });
    setPresses([]); setDemoPlaying(false); setPhase(0); setError(''); setNotice('');
    if (index + 1 < selected.length) setIndex(index + 1);
    else setScreen('done');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function go(to: Screen) { if (to === 'info' && !dates.length) setDates(guidanceDates()); setDemoPlaying(false); setScreen(to); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function filename(capture: Capture) {
    const ext = capture.blob?.type.includes('mp4') ? (capture.kind === 'audio' ? 'm4a' : 'mp4') : 'webm';
    return `${capture.movement}-${capture.phase + 1}.${ext}`;
  }
  async function exportBundle() {
    setExporting(true); setError('');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const manifest = { version: 1, mode: 'local-preview', createdAt: new Date().toISOString(), info, selected, noMovement, analysisStatus: 'not-connected', rawCameraOnly: true,
        captures: captures.map(({ blob, url, ...entry }) => ({ ...entry, file: blob ? filename({ ...entry, blob, url }) : null, mimeType: blob?.type, bytes: blob?.size, targets: phases[entry.phase].targets, analysis: 'not-performed' })) };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('README.txt', '모스픽 움직임 검사 미리보기 자료\n서버 접수·Apple 앱 검증은 수행되지 않았습니다.\n얼굴 영상은 카메라 원본입니다. 화면의 반투명 데모는 포함되지 않습니다.\n손가락 값은 눌렀다가 뗄 때까지의 초 단위 시간입니다.\n촬영·녹음 파일과 개인정보가 포함될 수 있으니 보관 위치에 유의해주세요.\n');
      for (const c of captures) if (c.blob) zip.file(filename(c), await c.blob.arrayBuffer());
      const output = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(output);
      const a = document.createElement('a'); a.href = url; a.download = 'morspeak-test.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setError('파일을 만들지 못했습니다. 자료는 현재 화면에 남아 있습니다. 다시 시도해주세요.'); }
    finally { setExporting(false); }
  }

  return <div className={styles.page}>
    <header className={styles.nav}>
      <a href="/home/renewal" aria-label="모스픽 홈페이지"><Image src="/renewal-reference/4ba84cee3d3722.svg" alt="Morspeak" width={129} height={30} priority /></a>
      <span>움직임 검사</span>
      <a href="/home/renewal">홈으로 <span aria-hidden="true">↗</span></a>
    </header>
    <main className={styles.main}>
      <div className={styles.previewNote}>미리보기 · 자료는 이 브라우저에서만 처리됩니다.</div>
      {stage >= 0 && <ol className={styles.progress} aria-label="검사 진행 단계">{stages.map((_, i) => <li key={i} aria-current={stage === i ? 'step' : undefined} className={stage === i ? styles.active : ''}><span>{i + 1}</span>{['정보 입력', '움직임 선택', '검사', '완료'][i]}</li>)}</ol>}

      {screen === 'intro' && <section className={styles.intro}>
        <p className={styles.eyebrow}>작은 움직임에서 시작합니다.</p>
        <h1>우리 가족도<br />모스픽을 사용할 수 있을까요?</h1>
        <p className={styles.lead}>남아 있는 움직임을 함께 살펴보세요.<br />보호자와 함께, 편안한 속도로 진행해주세요.</p>
        <div className={styles.introGrid}>
          <div className={styles.introCopy}><ol><li><b>먼저, 알려주세요.</b><span>환우 정보와 현재 소통 방법을 입력합니다.</span></li><li><b>가능한 움직임을 골라주세요.</b><span>눈·입·눈썹·손가락·바람 중 선택합니다.</span></li><li><b>짧게, 길게 따라 해보세요.</b><span>데모를 보며 촬영·녹음하거나 버튼을 누릅니다.</span></li></ol>
            <p className={styles.helper}>이번 링크는 체험용입니다. 자료가 서버에 접수되거나 자동으로 판정되지 않습니다. 가상 정보로 시험해 주세요.</p>
            <button className={styles.primary} onClick={() => go('info')}>시작하기 <span aria-hidden="true">→</span></button>
          </div>
          <div className={styles.introVisual}><video src="/screening-renewal/blink.mp4" controls muted playsInline loop preload="metadata" aria-label="눈 깜빡임 데모" /><span>작은 움직임, 새로운 가능성.</span></div>
        </div>
      </section>}

      {screen === 'info' && <section>
        <div className={styles.heading}><p className={styles.eyebrow}>먼저, 알려주세요.</p><h1>환우와 보호자 정보</h1><p>기존 이용 신청 항목을 입력합니다. 선택 항목은 비워두셔도 됩니다.</p></div>
        <button className={styles.textButton} onClick={() => setInfo({ patientName: '테스트 환우', diagnosis: '', referralSource: '인터넷 검색', referralDetail: '', commMethod: '글자판', preferredDate: dates[0] || '', applicantName: '테스트 보호자', relationship: '배우자', region: '서울', phone: '010-0000-0000', note: '웹 검사 동작 확인용 가상 정보' })}>테스트 정보로 채우기</button>
        <form onSubmit={e => { e.preventDefault(); go('movement'); }}>
          <fieldset className={styles.section}><legend>환우 정보</legend><div className={styles.fields}>
            <label className={styles.field}><span>환우 성함</span><input autoComplete="off" value={info.patientName} onChange={e => update('patientName', e.target.value)} required maxLength={80} /></label>
            <label className={styles.field}><span>진단명 / 질환 <small>선택</small></span><input value={info.diagnosis} onChange={e => update('diagnosis', e.target.value)} placeholder="예: 루게릭병(ALS)" maxLength={120} /></label>
            <Select label="모스픽을 알게 된 경로" value={info.referralSource} options={referralSources} onChange={value => update('referralSource', value)} optional />
            {info.referralSource === '기타' && <label className={styles.field}><span>알게 된 경로 상세 <small>선택</small></span><input value={info.referralDetail} onChange={e => update('referralDetail', e.target.value)} maxLength={200} /></label>}
            <Select label="현재 소통 방법" value={info.commMethod} options={communicationMethods} onChange={value => update('commMethod', value)} />
          </div></fieldset>
          <fieldset className={styles.section}><legend>신청인 정보</legend><div className={styles.fields}>
            <label className={styles.field}><span>신청인·보호자 성함</span><input autoComplete="off" value={info.applicantName} onChange={e => update('applicantName', e.target.value)} required maxLength={80} /></label>
            <Select label="환우와의 관계" value={info.relationship} options={relationships} onChange={value => update('relationship', value)} />
            <Select label="거주 지역" value={info.region} options={regions} onChange={value => update('region', value)} />
            <label className={styles.field}><span>연락처</span><input type="tel" inputMode="tel" value={info.phone} onChange={e => update('phone', e.target.value)} placeholder="010-0000-0000" required pattern="[0-9+() -]{9,20}" /></label>
          </div></fieldset>
          <fieldset className={styles.section}><legend>안내 희망일과 문의</legend><div className={styles.fields}>
            <label className={styles.field}><span>안내받고 싶은 날짜</span><select value={info.preferredDate} onChange={e => update('preferredDate', e.target.value)} required><option value="">선택해주세요</option>{dates.map(date => <option key={date} value={date}>{date.replaceAll('-', '.')} (월)</option>)}</select><small>날짜 선택 화면의 미리보기이며, 실제 일정은 예약되지 않습니다.</small></label>
            <label className={`${styles.field} ${styles.wide}`}><span>문의 내용 <small>선택</small></span><textarea value={info.note} onChange={e => update('note', e.target.value)} placeholder="현재 상태나 궁금한 점을 남겨주세요." maxLength={2000} rows={3} /></label>
          </div></fieldset>
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => go('intro')}>이전</button><button className={styles.primary}>움직임 선택하기 →</button></div>
        </form>
      </section>}

      {screen === 'movement' && <section>
        <div className={styles.heading}><p className={styles.eyebrow}>움직임은 사람마다 다릅니다.</p><h1>어떤 움직임이 가능한가요?</h1><p>조금이라도 가능한 항목을 모두 골라주세요.<br />힘들면 검사 중 언제든 쉬거나 건너뛸 수 있습니다.</p></div>
        <div className={styles.movementGrid}>{movements.map((m, i) => <label key={m.id} className={`${styles.movementCard} ${selected.includes(m.id) ? styles.selected : ''}`}>
          <input type="checkbox" checked={selected.includes(m.id)} onChange={() => { setNoMovement(false); setSelected(old => old.includes(m.id) ? old.filter(x => x !== m.id) : movements.filter(x => old.includes(x.id) || x.id === m.id).map(x => x.id)); }} />
          <span className={styles.number}>0{i + 1}</span><h2>{m.name}</h2><p>{m.detail}</p><video src={`/screening-renewal/${m.id}.mp4`} muted playsInline preload="metadata" aria-hidden="true" /><span className={styles.choose}>{selected.includes(m.id) ? '선택됨 ✓' : '선택하기 +'}</span>
        </label>)}</div>
        <label className={styles.check}><input type="checkbox" checked={noMovement} onChange={e => { setNoMovement(e.target.checked); if (e.target.checked) setSelected([]); }} /><span>가능한 움직임을 잘 모르겠거나, 지금 검사가 어렵습니다.</span></label>
        <label className={styles.check}><input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} /><span>촬영·녹음 자료는 서버로 전송되지 않고, 이 화면을 닫거나 새로고침하면 사라지는 것을 확인했습니다. 필요한 자료는 마지막에 다운로드합니다.</span></label>
        <div className={styles.actions}><button className={styles.secondary} onClick={() => go('info')}>이전</button><button className={styles.primary} disabled={(!selected.length && !noMovement) || !consented} onClick={() => { setIndex(0); setPhase(0); go(noMovement ? 'done' : 'test'); }}>{noMovement ? '체험 마치기' : `${selected.length}개 움직임 검사하기`} →</button></div>
      </section>}

      {screen === 'test' && movement && <section>
        <div className={styles.heading}><p className={styles.eyebrow}>{index + 1} / {selected.length}번째 움직임</p><h1>{movement.name}</h1><p>{movement.kind === 'press' ? '큰 버튼을 누르는 시간을 기록합니다. 외장 키보드는 필요하지 않습니다.' : movement.kind === 'audio' ? '휴대폰 마이크 쪽으로 편안하게 불어주세요. 별도 마이크는 필요하지 않습니다.' : '화면 속 얼굴에 위치를 맞추고, 데모를 따라 동작해주세요.'}</p></div>
        <ol className={styles.phases}>{phases.map((p, i) => <li key={p.name} aria-current={phase === i ? 'step' : undefined} className={phase === i ? styles.phaseActive : ''}>{i + 1}. {p.name}</li>)}</ol>
        <div className={styles.testGrid}>
          <div>
            {movement.kind === 'video' && <>
              <div className={styles.camera}>
                <video ref={videoRef} className={styles.cameraVideo} autoPlay muted playsInline aria-label="환우 카메라 미리보기" />
                {!stream && <div className={styles.cameraPlaceholder}><span>카메라를 연결하면<br />본인의 얼굴이 여기에 보입니다.</span></div>}
                <video key={movement.id} ref={demoRef} className={styles.overlay} style={{ opacity: overlay / 100 }} src={`/screening-renewal/${movement.id}.mp4`} muted playsInline loop preload="metadata" aria-label={`${movement.name} 반투명 데모`} />
                <span className={styles.cameraCaption}>데모는 화면에만 겹칩니다.<br />촬영 파일에는 본인의 얼굴만 저장됩니다.</span>
                {recording && <span className={styles.recordBadge}>● 촬영 중 {elapsed}초</span>}
              </div>
              <div className={styles.demoControls}><label>데모 진하기 <input type="range" min="10" max="60" value={overlay} onChange={e => setOverlay(Number(e.target.value))} /></label><button className={styles.textButton} onClick={() => { if (!demoRef.current) return; if (demoPlaying) { demoRef.current.pause(); setDemoPlaying(false); } else demoRef.current.play().then(() => setDemoPlaying(true)).catch(() => setError('데모를 재생하지 못했습니다. 페이지를 다시 열어주세요.')); }}>{demoPlaying ? '데모 멈추기' : '데모 재생'}</button></div>
            </>}
            {movement.kind === 'audio' && <div className={styles.audioPanel}><video src="/screening-renewal/blow.mp4" controls muted playsInline loop preload="metadata" aria-label="바람 불기 데모" /><h2>{recording ? `녹음 중 · ${elapsed}초` : '휴대폰 마이크로 녹음합니다.'}</h2><p>입 가까이에서 가볍게 불어주세요.<br />편안한 자세를 유지하고, 힘들면 바로 쉬어주세요.</p></div>}
            {movement.kind === 'press' && <div className={styles.pressPanel}><button className={`${styles.pressPad} ${pressing ? styles.pressed : ''}`} disabled={Boolean(current)}
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startPress(); }} onPointerUp={() => endPress()} onPointerCancel={() => endPress(true)} onLostPointerCapture={() => { if (pressStart.current !== null) endPress(true); }}
              onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startPress(); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endPress(); } }} onBlur={() => endPress(true)}>
              <span aria-hidden="true">{pressing ? '●' : '○'}</span><b>{pressing ? '누르고 있습니다' : '여기를 눌러주세요'}</b><small>눌렀다가 떼면 시간이 기록됩니다.</small></button>
              <p aria-live="polite">{presses.length} / 5회 기록</p>{presses.length > 0 && <div className={styles.pressResults}>{presses.map((seconds, i) => <span key={i}>{i + 1}회 · {seconds.toFixed(2)}초</span>)}</div>}
            </div>}
          </div>
          <div className={styles.testInstructions}>
            <h2>{phase === 2 ? '순서대로 따라 해주세요.' : `${phases[phase].name} 다섯 번 해주세요.`}</h2>
            <div className={styles.targets}>{phases[phase].targets.map((target, i) => <span key={i} className={movement.kind === 'press' && presses.length === i ? styles.targetCurrent : ''}><small>{i + 1}</small>{target}</span>)}</div>
            <p>{movement.verb}.<br />한 번 마친 뒤 잠시 쉬고, 다음 동작을 해주세요.</p>
            <p className={styles.helper}>짧게는 잠깐, 길게는 편안한 범위에서 조금 더 유지해주세요. 횟수 안내는 시험용이며, 여기서 성공·실패를 판정하지 않습니다.</p>
            {notice && <p className={styles.message} role="status">{notice}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {movement.kind !== 'press' && !current && <div className={styles.testButtons}>
              {!stream && <button className={styles.primary} disabled={preparing} onClick={prepare}>{preparing ? '연결 중…' : `${movement.kind === 'audio' ? '마이크' : '카메라'} 연결하기`}</button>}
              {stream && !recording && <button className={styles.primary} onClick={startRecording}>{movement.kind === 'audio' ? '녹음' : '촬영'} 시작하기</button>}
              {recording && <button className={styles.primary} onClick={() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }}>기록 마치기</button>}
            </div>}
            {current?.url && <div className={styles.review}><h3>기록 확인</h3>{current.kind === 'audio' ? <audio src={current.url} controls /> : <video src={current.url} controls playsInline preload="metadata" />}<p>{current.elapsedSeconds?.toFixed(1)}초 기록 · 아직 분석하지 않았습니다.</p><a href={current.url} download={filename(current)}>이 기록 다운로드 ↓</a></div>}
            {(current || presses.length > 0) && !recording && <button className={styles.textButton} onClick={retake}>{movement.kind === 'press' ? '누른 기록 지우고 다시 하기' : '다시 기록하기'}</button>}
            <div className={styles.testButtons}>
              <button className={styles.primary} disabled={recording || preparing || (movement.kind === 'press' ? presses.length < 5 && !current : !current)} onClick={next}>{phase < 2 ? '다음 동작으로' : index + 1 < selected.length ? '다음 움직임으로' : '체험 마치기'} →</button>
              <button className={styles.textButton} disabled={recording || preparing} onClick={skip}>이 움직임은 건너뛰기</button>
            </div>
          </div>
        </div>
      </section>}

      {screen === 'done' && <section className={styles.done}>
        <p className={styles.eyebrow}>함께 살펴봤습니다.</p><h1>체험을 마쳤습니다.</h1><p className={styles.lead}>자료를 확인하고 다운로드할 수 있습니다.</p>
        <div className={styles.summary}>{selected.length ? selected.map(id => {
          const m = movements.find(x => x.id === id)!;
          const rows = captures.filter(x => x.movement === id);
          const recorded = rows.filter(x => !x.skipped).length;
          return <div key={id}><b>{m.name}</b><span>{recorded ? `${recorded}개 동작 기록` : '검사 건너뜀'}</span></div>;
        }) : <p>가능한 움직임 확인은 담당자와 상담이 필요합니다.</p>}</div>
        <p className={styles.helper}>체험 자료는 현재 브라우저에만 있습니다. 서버 접수, 담당자 연락, Apple 앱 검증은 아직 연결되지 않았습니다. 새로고침하거나 화면을 닫기 전에 필요한 자료를 저장해주세요.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}><button className={styles.primary} disabled={exporting} onClick={exportBundle}>{exporting ? '파일 만드는 중…' : '전체 자료 다운로드 ↓'}</button><a className={styles.secondary} href="/home/renewal">홈페이지로</a></div>
      </section>}
    </main>
    <footer className={styles.footer}><span>Morspeak</span><p>작은 움직임에서, 새로운 가능성으로.</p><span>움직임 검사 미리보기</span></footer>
  </div>;
}
