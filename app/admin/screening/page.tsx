'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, orderBy, query, updateDoc, deleteDoc, doc, setDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

type Status = '미검토' | '적합' | '실기기검증적합' | '적합예상' | '애매함' | '보류' | '부적합' | '재요청';

interface BlinkAttempt {
  step: 'short' | 'long' | 'mixed';
  attempt: number;
  duration: number;
  success: boolean;
  patternIndex?: number;
  expected?: 'short' | 'long';
}

interface Result {
  id: string;
  patientName: string;
  caregiverName: string;
  caregiverContact: string;
  region: string;
  subRegion: string;
  communicationMethod: string;
  videoUrl: string | null;
  videoUrls?: { short?: string; long?: string; mixed?: string } | null;
  consentPrivacy?: boolean;
  consentCamera?: boolean;
  consentContact?: boolean;
  deviceType: string | null;
  status?: Status;
  createdAt: { seconds: number } | null;
  blinkLog?: BlinkAttempt[] | null;
  skippedSteps?: string[] | null;
  dotDashBoundary?: number;
}

interface Application {
  id: string;
  submittedAt: string;
  responseId: string;
  customerKey: string;
  patientName: string;
  patientBirthdate: string;
  patientGender: string;
  contactPhone: string;
  address: string;
  diagnosisCode: string;
  onsetDate: string;
  hospital: string;
  disabilityRegistered: string;
  disabilityType: string;
  disabilityLevel: string;
  careLocation: string;
  careLocationMedical: string;
  careLocationWelfare: string;
  careLocationHome: string;
  caregiverCooperation: string;
  utilizationPlan: string;
  improvementConditions: string;
  needReason: string;
  documentUpload: string;
  residenceDoc: string;
  familyCertDoc: string;
  incomeDoc: string;
  tracheotomy: string;
  bulbarPalsyProgress: string;
  eyeMouseExperience: string;
  electronicDeviceExperience: string;
  previousDiagnosisSubmission: string;
  privacyConsent: string;
  syncedAt?: string;
}

interface EvalEntry { name: string; phone: string; c1: number; c2: number; c3: number; comment?: string; submittedAt: string; }
function computeEvalAvg(evals: Record<string, EvalEntry>) {
  const entries = Object.values(evals);
  if (!entries.length) return null;
  const avg = (vals: number[]) => vals.reduce((s,n)=>s+n,0)/vals.length;
  const c1=avg(entries.map(e=>e.c1)), c2=avg(entries.map(e=>e.c2)), c3=avg(entries.map(e=>e.c3));
  return {c1,c2,c3,total:c1+c2+c3,count:entries.length,entries};
}

type CallNote = {
  completed?: boolean; completedAt?: string;
  // 환자 사용 의사 (핵심)
  patientWants?: string;  // '원함 (짧게 1번)' | '원하지 않음 (여러번)' | '환자 확인 불가' | '보호자 대신 확인'
  patientWantsNote?: string;
  // 눈 깜빡임 관찰
  blink?: string; blinkNote?: string;
  // 보호자 의사
  consent?: string;
  // 환경
  location?: string; posture?: string;
  wifi?: string; tech?: string; deviceNote?: string;
  // 니즈
  goal?: string; goalNote?: string;
  // 설치
  installPerson?: string; installNote?: string;
  // 온보딩 일정
  scheduleTime?: string; scheduleNote?: string;
  contactNote?: string; specialNote?: string;
  overallResult?: string; // '적합' | '일단보류' | '부적합'
};

// ── 장비 대여 관리대장 ────────────────────────────────────────
type LoanUnit = { serial?: string; sent?: boolean; sentDate?: string };
type EquipmentLoan = {
  managementNumber?: string;
  address?: string;
  memo?: string;
  units?: Record<string, LoanUnit>;
  updatedAt?: string;
};
const PACKAGE_ITEMS: { id: string; label: string; qty: number }[] = [
  { id: 'ipad', label: '아이패드', qty: 1 },
  { id: 'bedMount', label: '침대용 거치대', qty: 1 },
  { id: 'chairMount', label: '의자용 거치대', qty: 1 },
  { id: 'iotPlug', label: 'IoT 플러그', qty: 3 },
  { id: 'chargerHead', label: '충전기 헤드', qty: 1 },
  { id: 'chargerCable', label: '충전기 선', qty: 1 },
  { id: 'light', label: '조명', qty: 2 },
];
const TOTAL_UNITS = PACKAGE_ITEMS.reduce((s, it) => s + it.qty, 0);

const ADMIN_PW = '0621';
const QUAL_VIEW_PW = '1004';
const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const STATUS: Record<Status, { bg: string; color: string }> = {
  '미검토':       { bg: '#F2F2F7', color: '#8E8E93' },
  '적합':         { bg: '#D4F5DF', color: '#1A8C3A' },
  '실기기검증적합': { bg: '#D4F5DF', color: '#1A8C3A' },
  '적합예상':     { bg: '#E3F2FF', color: '#0071E3' },
  '애매함':       { bg: '#FFF9D4', color: '#B07800' },
  '보류':       { bg: '#FFE0DE', color: '#CC2200' },
  '부적합':     { bg: '#FFE0DE', color: '#CC2200' }, // 레거시 호환
  '재요청':       { bg: '#FFE4F0', color: '#CC0066' },
};
const STEP: Record<string, string> = { short: '짧게', long: '길게', mixed: '혼합' };
const normalizePhone = (p: string) => { const d = p.replace(/\D/g,''); return d.startsWith('82')&&d.length>=11?'0'+d.slice(2):d; };
const normalizeStr = (s: string) => (s??'').trim().replace(/\s+/g,'');
const normBirth = (raw: string) => { const d=(raw??'').replace(/\D/g,''); if(d.length>=8) return d.slice(0,8); if(d.length===6){const yy=parseInt(d.slice(0,2));return(yy>=26?'19':'20')+d;} return d; };
const fmtBirth = (raw: string) => { const d=normBirth(raw); if(d.length>=8) return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`; if(d.length>=6) return `${d.slice(0,4)}.${d.slice(4,6)}`; return d||'-'; };
// 광역시도 축약어 → 정식명 매핑
const REGION_EXPAND: Record<string,string[]> = {
  '경북':['경상북도'],'경남':['경상남도'],
  '전북':['전라북도','전북특별자치도'],'전남':['전라남도'],
  '충북':['충청북도'],'충남':['충청남도'],
  '강원':['강원도','강원특별자치도'],
  '제주':['제주도','제주특별자치도'],
  '경기':['경기도'],'서울':['서울특별시'],'부산':['부산광역시'],
  '대구':['대구광역시'],'인천':['인천광역시'],'광주':['광주광역시'],
  '대전':['대전광역시'],'울산':['울산광역시'],
};
const regionInAddr = (addr: string, r: string) => {
  if (!r) return false;
  if (addr.includes(r)) return true;
  return (REGION_EXPAND[r]??[]).some(full => addr.includes(full.replace(/\s/g,'')));
};

function avg(blinks: BlinkAttempt[], step: string) {
  const ok = blinks.filter(a => a.step === step && a.success);
  if (!ok.length) return null;
  return (ok.reduce((s, a) => s + a.duration, 0) / ok.length).toFixed(2);
}

// ── 도입 적합도 분석 ─────────────────────────────────────────
interface Suitability {
  score: number;       // 0–100
  label: string;
  color: string;
  bg: string;
  reason: string;      // 한 줄 근거
}

function calcSuitability(r: Result): Suitability | null {
  const log = r.blinkLog ?? [];
  if (log.length === 0) return null;

  const sLog = log.filter(a => a.step === 'short');
  const lLog = log.filter(a => a.step === 'long');
  const mLog = log.filter(a => a.step === 'mixed');
  const skipped = r.skippedSteps ?? [];

  const sRate = sLog.length > 0 ? sLog.filter(a => a.success).length / sLog.length : 0;
  const lRate = lLog.length > 0 ? lLog.filter(a => a.success).length / lLog.length : 0;
  const mRate = mLog.length > 0 ? mLog.filter(a => a.success).length / mLog.length : 0;

  const sAvg = sLog.filter(a => a.success).reduce((s,a)=>s+a.duration,0) / (sLog.filter(a=>a.success).length||1);
  const lAvg = lLog.filter(a => a.success).reduce((s,a)=>s+a.duration,0) / (lLog.filter(a=>a.success).length||1);
  const gap  = lLog.filter(a=>a.success).length > 0 && sLog.filter(a=>a.success).length > 0 ? lAvg - sAvg : 0;

  let score = 0;

  // 짧게 성공률 (0–25)
  score += sRate * 25;
  // 길게 성공률 (0–25)
  score += lRate * 25;
  // 혼합 성공률 (0–20)
  score += mRate * 20;
  // 짧게·길게 간격 명확성 (0–20): 간격이 클수록 좋음
  if (gap > 0.45) score += 20;
  else if (gap > 0.30) score += 15;
  else if (gap > 0.15) score += 8;
  else score += 2;
  // 경계값 합리성 (0–10): 0.2s~1.0s 범위
  const b = r.dotDashBoundary ?? 0;
  if (b > 0.2 && b < 1.0) score += 10;
  else if (b > 0) score += 4;

  // 패널티: 단계 건너뜀 (-8/개)
  score -= skipped.length * 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // 주요 근거 한 줄
  const reasons: string[] = [];
  if (sRate >= 0.8) reasons.push(`짧게 ${Math.round(sRate*100)}%`);
  else reasons.push(`짧게 ${Math.round(sRate*100)}% (낮음)`);
  if (gap > 0.2) reasons.push(`간격 ${gap.toFixed(2)}s`);
  else reasons.push('간격 좁음');
  if (skipped.length) reasons.push(`${skipped.map(s=>STEP[s]??s).join('·')} 건너뜀`);

  let label: string, color: string, bg: string;
  if      (score >= 80) { label='도입 추천';    color='#1A8C3A'; bg='#D4F5DF'; }
  else if (score >= 60) { label='가능성 있음';  color='#0071E3'; bg='#E3F2FF'; }
  else if (score >= 40) { label='훈련 필요';    color='#CC7000'; bg='#FFF0D4'; }
  else                  { label='어려울 수 있음'; color='#CC2200'; bg='#FFE0DE'; }

  return { score, label, color, bg, reason: reasons.join(' · ') };
}

export default function AdminScreeningPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Status | '전체' | '중복' | '신청서 미작성'>('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'date' | 'score'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeView, setActiveView] = useState<'screening' | 'applications' | 'ranking' | 'final' | 'loan' | 'schedule'>('screening');
  const [scheduleBookings, setScheduleBookings] = useState<Record<string, {patientName:string;caregiverName?:string;contactPhone:string;meetingType?:string;bookedAt:string}>>({});
  const [callNotes, setCallNotes] = useState<Record<string, CallNote>>({});
  const [callScriptSlot, setCallScriptSlot] = useState<string | null>(null);
  const [callDraft, setCallDraft] = useState<CallNote>({});
  const [callStep, setCallStep] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [callTimer, setCallTimer] = useState(900);
  const [callTimerRunning, setCallTimerRunning] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string|null>(null);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [finalUnlocked, setFinalUnlocked] = useState(false);
  const [finalPw, setFinalPw] = useState('');
  const [equipmentLoans, setEquipmentLoans] = useState<Record<string, EquipmentLoan>>({});
  const [expandedLoanKey, setExpandedLoanKey] = useState<string | null>(null);
  const [expandedRankKey, setExpandedRankKey] = useState<string | null>(null);
  const [selectedRankKeys, setSelectedRankKeys] = useState<Set<string>>(new Set());
  const [rankFilter, setRankFilter] = useState<'all'|'complete'|'no_screening'|'no_app'>('all');
  const [rankSortField, setRankSortField] = useState<'score'|'birth'>('score');
  const [rankSortDir, setRankSortDir] = useState<'asc'|'desc'>('asc');
  const [appFilter, setAppFilter] = useState<'all'|'no_screening'>('all');
  const [appSortDir, setAppSortDir] = useState<'asc'|'desc'>('asc');
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [qualEvals, setQualEvals] = useState<Map<string, Record<string, EvalEntry>>>(new Map());
  const [qualLoading, setQualLoading] = useState(false);
  const [evalInput, setEvalInput] = useState({name:'', phone:'', c1:'', c2:'', c3:'', comment:''});
  const [evalJustSaved, setEvalJustSaved] = useState(false);
  const [qualViewPw, setQualViewPw] = useState('');
  const [qualViewUnlocked, setQualViewUnlocked] = useState(false);
  const screeningUnsubRef = useRef<(() => void) | null>(null);
  const qualUnsubRef = useRef<(() => void) | null>(null);
  const appsUnsubRef = useRef<(() => void) | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');

  useEffect(() => {
    setEvalInput({name:'', phone:'', c1:'', c2:'', c3:'', comment:''});
    setEvalJustSaved(false);
    setQualViewUnlocked(false);
    setQualViewPw('');
  }, [expandedRankKey]);

  useEffect(() => {
    if (localStorage.getItem('morspeak_admin_authed') === '1') {
      Promise.all([load(), loadApplications(), loadQualScores()])
        .then(() => setAuthed(true))
        .catch(() => localStorage.removeItem('morspeak_admin_authed'))
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  const toggleSort = (field: 'date' | 'score') => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const ensureAuth = async () => {
    const auth = getAuth();
    if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
  };

  const load = async () => {
    setLoading(true);
    await ensureAuth();
    screeningUnsubRef.current?.();
    screeningUnsubRef.current = onSnapshot(
      query(collection(db, 'screening_results'), orderBy('createdAt', 'desc')),
      snap => {
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  useEffect(() => {
    if (!authed) return;
    const unsub1 = onSnapshot(collection(db, 'schedule_slots'), snap => {
      const map: Record<string, {patientName:string;caregiverName?:string;contactPhone:string;meetingType?:string;bookedAt:string}> = {};
      snap.docs.forEach(d => { const data = d.data(); if (data.patientName) map[d.id] = data as {patientName:string;caregiverName?:string;contactPhone:string;meetingType?:string;bookedAt:string}; });
      setScheduleBookings(map);
    });
    const unsub2 = onSnapshot(collection(db, 'call_notes'), snap => {
      const m: Record<string, CallNote> = {};
      snap.docs.forEach(d => { m[d.id] = d.data() as CallNote; });
      setCallNotes(m);
    });
    const unsub3 = onSnapshot(doc(db, 'final_config', 'overrides'), snap => {
      const data = snap.data();
      setExcludedKeys(new Set((data?.excluded ?? []) as string[]));
    });
    const unsub4 = onSnapshot(collection(db, 'equipment_loans'), snap => {
      const m: Record<string, EquipmentLoan> = {};
      snap.docs.forEach(d => { m[d.id] = d.data() as EquipmentLoan; });
      setEquipmentLoans(m);
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [authed]);

  const loadQualScores = async () => {
    setQualLoading(true);
    await ensureAuth();
    try {
      qualUnsubRef.current?.();
      qualUnsubRef.current = onSnapshot(collection(db, 'qualitative_scores'), snap => {
        const map = new Map<string, Record<string, EvalEntry>>();
        snap.docs.forEach(d => map.set(d.id, (d.data().evals ?? {}) as Record<string, EvalEntry>));
        setQualEvals(map);
        setQualLoading(false);
      }, () => setQualLoading(false));
    } catch { setQualLoading(false); }
  };

  const saveEvalEntry = async (personKey: string, entry: Omit<EvalEntry, 'submittedAt'>) => {
    await ensureAuth();
    const evalKey = `${normalizeStr(entry.name)}_${entry.phone}`;
    // undefined 값이 Firestore에 전달되지 않도록 명시적으로 구성
    const data: Record<string, unknown> = {
      name: entry.name, phone: entry.phone,
      c1: entry.c1, c2: entry.c2, c3: entry.c3,
      submittedAt: new Date().toISOString(),
    };
    if (entry.comment) data.comment = entry.comment;
    await setDoc(doc(db, 'qualitative_scores', personKey.replace(/\//g,'_')), {
      evals: { [evalKey]: data }
    }, {merge: true});
  };

  const saveLoanField = async (docId: string, patch: Partial<EquipmentLoan>) => {
    await ensureAuth();
    await setDoc(doc(db, 'equipment_loans', docId), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  };
  const saveLoanUnit = async (docId: string, unitKey: string, patch: Partial<LoanUnit>) => {
    await ensureAuth();
    await setDoc(doc(db, 'equipment_loans', docId), { units: { [unitKey]: patch }, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const loadApplications = async () => {
    setAppLoading(true);
    await ensureAuth();
    try {
      appsUnsubRef.current?.();
      appsUnsubRef.current = onSnapshot(
        query(collection(db, 'applications'), orderBy('syncedAt', 'desc')),
        snap => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
          const seen = new Set<string>();
          setApplications(all.filter(a => {
            const key = a.responseId || a.syncedAt || a.id;
            if (seen.has(key)) return false;
            seen.add(key); return true;
          }));
          setAppLoading(false);
        },
        () => setAppLoading(false)
      );
    } catch { setAppLoading(false); }
  };

  const login = async () => {
    if (pw !== ADMIN_PW) { setError('비밀번호가 틀렸습니다.'); return; }
    setLoading(true); setError('');
    try { await Promise.all([load(), loadApplications(), loadQualScores()]); setAuthed(true); localStorage.setItem('morspeak_admin_authed', '1'); }
    catch { setError('Firestore 연결 오류.'); }
    finally { setLoading(false); }
  };

  // Download URL → Storage 경로 추출 (gs:// 또는 https://firebasestorage... 모두 처리)
  const urlToStoragePath = (url: string): string | null => {
    try {
      if (url.startsWith('gs://')) {
        return url.replace(/^gs:\/\/[^/]+\//, '');
      }
      // https://firebasestorage.googleapis.com/v0/b/xxx/o/path%2Ffile.mp4?alt=media&token=...
      const u = new URL(url);
      const match = u.pathname.match(/\/o\/(.+)/);
      if (!match) return null;
      return decodeURIComponent(match[1]);
    } catch { return null; }
  };

  // Storage 영상 파일 삭제 — 경로 직접 추출 후 deleteObject
  const deleteStorageFiles = async (r: Result) => {
    await ensureAuth();  // Storage 삭제에도 인증 필요
    const storage = getStorage();
    const urls = [
      r.videoUrl,
      ...(r.videoUrls ? Object.values(r.videoUrls) : []),
    ].filter(Boolean) as string[];

    const results = await Promise.allSettled(
      urls.map(async url => {
        const path = urlToStoragePath(url);
        if (!path) { console.warn('경로 추출 실패:', url); return; }
        try {
          await deleteObject(ref(storage, path));
          console.log('✅ Storage 삭제:', path);
        } catch (e: unknown) {
          // 이미 삭제됐거나 없는 파일은 무시
          const code = (e as { code?: string })?.code;
          if (code !== 'storage/object-not-found') {
            console.warn('⚠️ Storage 삭제 실패:', path, e);
          }
        }
      })
    );
    console.log(`Storage 삭제 완료: ${results.filter(r => r.status === 'fulfilled').length}/${results.length}`);
  };

  const updateStatus = async (id: string, status: Status) => {
    await updateDoc(doc(db, 'screening_results', id), { status });
    setResults(r => r.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteOne = async (id: string) => {
    try {
      // 1. Firestore 먼저 삭제 (핵심)
      await deleteDoc(doc(db, 'screening_results', id));
      // 2. UI 즉시 업데이트
      setResults(prev => prev.filter(x => x.id !== id));
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      if (expandedId === id) setExpandedId(null);
      // 3. Storage 파일 삭제 (await으로 완료 확인)
      const r = results.find(x => x.id === id);
      if (r) await deleteStorageFiles(r);
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`선택한 ${selected.size}건을 삭제하시겠습니까?\n영상 파일도 함께 삭제됩니다.`)) return;
    const toDelete = results.filter(x => selected.has(x.id));
    try {
      // 1. Firestore 먼저 일괄 삭제
      await Promise.all([...selected].map(id => deleteDoc(doc(db, 'screening_results', id))));
      // 2. UI 즉시 업데이트
      const deletedIds = new Set(selected);
      setResults(prev => prev.filter(x => !deletedIds.has(x.id)));
      setSelected(new Set());
      if (deletedIds.has(expandedId ?? '')) setExpandedId(null);
      // 3. Storage 파일 삭제 (완료 확인)
      await Promise.all(toDelete.map(r => deleteStorageFiles(r)));
    } catch (e) {
      alert('일부 삭제 실패: ' + (e as Error).message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = (ids: string[]) => {
    const allIn = ids.every(id => selected.has(id));
    setSelected(s => { const n = new Set(s); allIn ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; });
  };

  const exportCSV = () => {
    const h = ['날짜','상태','환우명','보호자','연락처','지역','소통방법','기기','짧게avg','길게avg','로그수','영상','경계값'];
    const rows = results.map(r => {
      const log = r.blinkLog ?? [];
      return [
        r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleString('ko-KR') : '-',
        r.status ?? '미검토', r.patientName, r.caregiverName, r.caregiverContact,
        r.subRegion ? `${r.region} ${r.subRegion}` : r.region,
        r.communicationMethod ?? '', r.deviceType ?? '',
        avg(log,'short') ?? '-', avg(log,'long') ?? '-',
        log.length, r.videoUrl ? '있음' : '없음',
        r.dotDashBoundary?.toFixed(3) ?? '-',
      ];
    });
    const csv = [h, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'morspeak_screening.csv'; a.click();
  };

  const fmt = (r: Result) => {
    if (!r.createdAt) return '-';
    const d = new Date(r.createdAt.seconds * 1000);
    const date = d.toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit' });
    const time = d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12: false });
    return `${date} ${time}`;
  };

  const phoneCount = results.reduce<Record<string, number>>((acc, r) => {
    const p = normalizePhone(r.caregiverContact ?? '');
    if (p) acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const duplicatePhones = new Set(Object.entries(phoneCount).filter(([,c])=>c>1).map(([p])=>p));
  const appPhoneNorms = new Set(applications.map(a=>normalizePhone(a.contactPhone??'')).filter(Boolean));

  // 전화번호/이름 → 생년월일 빠른 조회
  const appBirthMap = new Map<string, string>();
  applications.forEach(a => {
    if (!a.patientBirthdate) return;
    const p = normalizePhone(a.contactPhone??'');
    if (p) appBirthMap.set(p, a.patientBirthdate);
    const name = normalizeStr(a.patientName??'');
    if (name) appBirthMap.set('n:'+name, a.patientBirthdate);
  });

  // 이름+지역 매칭용 맵 (주소 정규화, subRegion 포함)
  const appNameRegionMap = new Map<string, string[]>();
  applications.forEach(a => {
    const name = normalizeStr(a.patientName??'');
    if (name) { if (!appNameRegionMap.has(name)) appNameRegionMap.set(name,[]); appNameRegionMap.get(name)!.push(normalizeStr(a.address??'')); }
  });
  const screeningNameRegionMap = new Map<string, string[]>();
  results.forEach(r => {
    const name = normalizeStr(r.patientName??'');
    if (!name) return;
    if (!screeningNameRegionMap.has(name)) screeningNameRegionMap.set(name,[]);
    const region = normalizeStr(r.region??''); const sub = normalizeStr(r.subRegion??'');
    if (region) screeningNameRegionMap.get(name)!.push(region);
    if (sub) screeningNameRegionMap.get(name)!.push(sub);
  });
  const matchesApp = (r: Result) => {
    if (appPhoneNorms.has(normalizePhone(r.caregiverContact??''))) return true;
    const name = normalizeStr(r.patientName??'');
    const region = normalizeStr(r.region??''); const sub = normalizeStr(r.subRegion??'');
    return !!(name && (appNameRegionMap.get(name)??[]).some(addr =>
      (region && regionInAddr(addr, region)) || (sub && addr.includes(sub))
    ));
  };
  const screeningPhoneNormsGlobal = new Set(results.map(r=>normalizePhone(r.caregiverContact??'')).filter(Boolean));
  const matchesScreening = (a: Application) => {
    if (a.contactPhone && screeningPhoneNormsGlobal.has(normalizePhone(a.contactPhone))) return true;
    const name = normalizeStr(a.patientName??''); const normAddr = normalizeStr(a.address??'');
    return !!(name && (screeningNameRegionMap.get(name)??[]).some(r => r && regionInAddr(normAddr, r)));
  };

  // 전화번호 그룹 대표값: 그룹 간 정렬 기준 (같은 번호끼리 항상 인접)
  const phoneGroupBest = results.reduce<Record<string, number>>((acc, r) => {
    const p = normalizePhone(r.caregiverContact ?? '');
    if (!p) return acc;
    const val = sortField === 'date'
      ? (r.createdAt?.seconds ?? 0)
      : (calcSuitability(r)?.score ?? -1);
    if (acc[p] === undefined) acc[p] = val;
    else acc[p] = sortDir === 'desc' ? Math.max(acc[p], val) : Math.min(acc[p], val);
    return acc;
  }, {});

  const filtered = results
    .filter(r => {
      const s = r.status ?? '미검토';
      const normP = normalizePhone(r.caregiverContact ?? '');
      if (categoryFilter === '중복') {
        if (!duplicatePhones.has(normP)) return false;
      } else if (categoryFilter === '신청서 미작성') {
        if (matchesApp(r)) return false;
      } else if (categoryFilter !== '전체' && s !== categoryFilter) return false;
      if (search && !r.patientName?.includes(search) && !r.caregiverName?.includes(search) && !r.caregiverContact?.includes(search)) return false;
      return true;
    })
    .sort((a, b) => {
      const pa = normalizePhone(a.caregiverContact ?? '');
      const pb = normalizePhone(b.caregiverContact ?? '');
      if (pa !== pb) {
        // 그룹 간: 그룹 대표값으로 정렬
        const diff = (phoneGroupBest[pa] ?? 0) - (phoneGroupBest[pb] ?? 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      // 같은 번호: 날짜 내림차순으로 위아래 인접
      return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
    });

  // 전화번호 기준 그룹핑 (뒤 4자리+이름 교차 매칭 포함)
  const groupedFiltered = (() => {
    const groupMap = new Map<string, Result[]>();
    const phoneToKey = new Map<string, string>();
    const nameToKey  = new Map<string, string>();
    const l4nToKey   = new Map<string, string>(); // "last4|name" → key

    filtered.forEach(r => {
      const p  = normalizePhone(r.caregiverContact??'');
      const n  = normalizeStr(r.patientName??'');
      const l4 = p.slice(-4);
      const l4n = l4.length===4 && n ? `${l4}|${n}` : '';

      let key =
        (p && phoneToKey.get(p)) ||
        (n && nameToKey.get(n))  ||
        (l4n && l4nToKey.get(l4n)) || undefined;

      if (!key) {
        key = p || n || r.id;
        groupMap.set(key, []);
      }

      groupMap.get(key)!.push(r);
      if (p  && !phoneToKey.has(p))  phoneToKey.set(p, key);
      if (n  && !nameToKey.has(n))   nameToKey.set(n, key);
      if (l4n && !l4nToKey.has(l4n)) l4nToKey.set(l4n, key);
    });

    const groups: {key: string; entries: Result[]}[] = [];
    const seen = new Set<string>();
    filtered.forEach(r => {
      const p  = normalizePhone(r.caregiverContact??'');
      const n  = normalizeStr(r.patientName??'');
      const l4 = p.slice(-4);
      const l4n = l4.length===4 && n ? `${l4}|${n}` : '';
      const key = (p && phoneToKey.get(p)) || (n && nameToKey.get(n)) || (l4n && l4nToKey.get(l4n)) || p || n || r.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        groups.push({key, entries: (groupMap.get(key)??[r]).sort((a,b)=>(b.createdAt?.seconds??0)-(a.createdAt?.seconds??0))});
      }
    });
    return groups;
  })();

  const filteredIds = groupedFiltered.flatMap(g => g.entries.map(e => e.id));
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));

  const counts: Record<string, number> = {
    '전체': results.length,
    '미검토': results.filter(r => (r.status ?? '미검토') === '미검토').length,
    '실기기검증적합': results.filter(r => r.status === '실기기검증적합').length,
    '적합예상': results.filter(r => r.status === '적합예상').length,
    '애매함': results.filter(r => r.status === '애매함').length,
    '보류': results.filter(r => r.status === '보류').length,
    '재요청': results.filter(r => r.status === '재요청').length,
    '중복': [...new Set(results.filter(r=>duplicatePhones.has(normalizePhone(r.caregiverContact??''))).map(r=>normalizePhone(r.caregiverContact??'')))].length,
    '신청서 미작성': results.filter(r => !matchesApp(r)).length,
  };

  // ── 최종 탭과 동일한 finalRanked (엑셀 export·대여관리 공용) ──
  const _finalRanked = (() => {
    if (!results.length && !applications.length) return [];
    const hasExp2 = (s?: string) => { const v=(s??'').trim(); return v.length>0&&!/^(없음?|없습니다?|없다|없어요|아니[요오]?|아닙니다|해당\s*없음|X|x|-)$/i.test(v); };
    const appScoreF2 = (a: Application) => {
      const bs: Record<string,number> = {};
      const trach=a.tracheotomy??''; bs.tracheotomy=trach?(/시행/.test(trach)&&!/안|않|미시행|하지/.test(trach)?10:8):0;
      const bulbar=a.bulbarPalsyProgress??''; bs.bulbar=!bulbar?0:(/마비|진행/.test(bulbar)&&!/아님|아니|없음|않|미/.test(bulbar)?10:8);
      const cg=a.caregiverCooperation??''; bs.caregiver=/가능|협조/.test(cg)?10:/불가|어렵|못/.test(cg)?5:0;
      bs.device=hasExp2(a.electronicDeviceExperience)?10:0; bs.eyeMouse=hasExp2(a.eyeMouseExperience)?5:0; bs.duration=0;
      if(a.onsetDate){const d=a.onsetDate.replace(/\D/g,'');if(d.length>=4){const yr=parseInt(d.slice(0,4)),mo=parseInt(d.slice(4,6)||'1')||1;if((Date.now()-new Date(yr,mo-1,1).getTime())/(1000*60*60*24*365.25)>=3)bs.duration=5;}}
      return {bs, total:Object.values(bs).reduce((s,v)=>s+v,0)};
    };
    const findAppF2 = (r: Result) => {
      const p=normalizePhone(r.caregiverContact??'');
      if(p){const a=applications.find(a=>normalizePhone(a.contactPhone??'')===p);if(a)return a;}
      const name=normalizeStr(r.patientName??''),region=normalizeStr(r.region??''),sub=normalizeStr(r.subRegion??'');
      return applications.find(a=>{if(normalizeStr(a.patientName??'')!==name)return false;const addr=normalizeStr(a.address??'');return (region&&regionInAddr(addr,region))||(sub&&addr.includes(sub));});
    };
    const catOF = (e:{screening?:Result}) => (e.screening?.status==='실기기검증적합'||e.screening?.status==='적합예상')?1:e.screening?0:-1;
    const seen=new Set<string>();
    const ranked:{key:string;name:string;caregiver:string;phone:string;region:string;screening?:Result;hasApp:boolean;bs?:Record<string,number>;appTotal:number;qualTotal:number;finalTotal:number}[]=[];
    const best=new Map<string,Result>();
    results.forEach(r=>{const key=normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'');if(!key)return;const prev=best.get(key);const cv=(s?:Status)=>s==='실기기검증적합'?2:s==='적합예상'?1:0;if(!prev||cv(r.status)>cv(prev.status))best.set(key,r);});
    best.forEach((r,key)=>{
      seen.add(key); const app=findAppF2(r);
      if(app){const ak=normalizePhone(app.contactPhone??'')||normalizeStr(app.patientName??'');if(ak)seen.add(ak);}
      const aScore=app?appScoreF2(app):null;
      const qk=key.replace(/\//g,'_'); const qa=computeEvalAvg(qualEvals.get(qk)??{}); const qualTotal=qa?Math.round(qa.total*10)/10:0;
      ranked.push({key,name:r.patientName,caregiver:r.caregiverName??'',phone:r.caregiverContact??'',region:(r.region?r.region+' ':'')+r.subRegion,screening:r,hasApp:!!app,bs:aScore?.bs,appTotal:aScore?.total??0,qualTotal,finalTotal:(aScore?.total??0)+qualTotal});
    });
    applications.forEach(a=>{
      const key=normalizePhone(a.contactPhone??'')||normalizeStr(a.patientName??'');
      if(!key||seen.has(key))return; seen.add(key);
      const aScore=appScoreF2(a); const qk=key.replace(/\//g,'_'); const qa=computeEvalAvg(qualEvals.get(qk)??{}); const qualTotal=qa?Math.round(qa.total*10)/10:0;
      ranked.push({key,name:a.patientName,caregiver:'',phone:a.contactPhone??'',region:a.address?.slice(0,8)??'',screening:undefined,hasApp:true,bs:aScore.bs,appTotal:aScore.total,qualTotal,finalTotal:aScore.total+qualTotal});
    });
    ranked.sort((a,b)=>{const cd=catOF(b)-catOF(a);return cd!==0?cd:b.appTotal-a.appTotal;});
    const top40=[...ranked.slice(0,40)].sort((a,b)=>{const cd=catOF(b)-catOF(a);return cd!==0?cd:b.finalTotal-a.finalTotal;});
    return [...top40,...ranked.slice(40)];
  })();

  // ── 최종 인터뷰 '적합' 판정자 (대여 관리대장 대상) ───────────
  const _getCallNoteByNamePhone = (name: string, phone: string) => {
    const np = normalizePhone(phone); const nn = normalizeStr(name);
    for (const [sid, bk] of Object.entries(scheduleBookings)) {
      const bkPhone = normalizePhone(bk.contactPhone ?? ''); const bkName = normalizeStr(bk.patientName ?? '');
      if ((np && bkPhone && bkPhone === np) || bkName === nn) return callNotes[sid] ?? null;
    }
    return null;
  };
  const _finalSelected = _finalRanked.filter(e => {
    if (excludedKeys.has(e.key)) return false;
    const note = _getCallNoteByNamePhone(e.name, e.phone);
    const raw = note?.overallResult;
    const result = raw === '애매함' ? '일단보류' : raw;
    return result === '적합';
  });

  // 관리번호 자동 배정: 최종 순위(_finalSelected 순서) 그대로 001부터 순번 부여.
  // 데이터가 비동기로 순차 로딩되며 순위가 바뀔 수 있으므로, 저장된 값이 현재 순위와
  // 다르면 다시 맞춰써서 항상 순서대로 유지한다(로딩이 끝나면 안정적으로 고정됨).
  useEffect(() => {
    _finalSelected.forEach((e, i) => {
      const docId = e.key.replace(/\//g, '_');
      const managementNumber = `MS2026-${String(i + 1).padStart(3, '0')}`;
      if (equipmentLoans[docId]?.managementNumber === managementNumber) return;
      setDoc(doc(db, 'equipment_loans', docId), { managementNumber, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_finalSelected.map(e => e.key).join('|'), equipmentLoans]);

  // ── 초기화 중 ─────────────────────────────────────────────────
  if (initializing) return <div style={{ minHeight:'100vh', background:'#fff' }} />;

  // ── 로그인 ────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', fontFamily:F }}>
      {/* 왼쪽 이미지 패널 */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <img src="/admin-login-bg.png" alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }} />
      </div>

      {/* 오른쪽 로그인 패널 */}
      <div style={{ width:440, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px', boxSizing:'border-box' }}>
        <div style={{ width:'100%' }}>
          <p style={{ fontSize:16, fontWeight:700, color:'#1C1C1E', letterSpacing:'-0.2px', marginBottom:20 }}>사용 적합성 테스트 어드민</p>
          <h2 style={{ fontSize:22, fontWeight:600, color:'#000', marginBottom:6 }}>로그인</h2>
          <p style={{ fontSize:14, color:'#8E8E93', marginBottom:36 }}>접근 권한이 있는 팀원만 사용할 수 있습니다.</p>

          <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>비밀번호</label>
          <input type="password" placeholder="" value={pw}
            onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
            style={{ width:'100%', padding:'14px 16px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:16, outline:'none', boxSizing:'border-box', fontFamily:F, marginBottom:12, background:'#fff', color:'#000' }} />

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'rgba(255,59,48,0.06)', border:'1px solid rgba(255,59,48,0.2)', marginBottom:12 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#FF3B30" strokeWidth="1.4"/><path d="M7 4v3M7 9.5v.5" stroke="#FF3B30" strokeWidth="1.4" strokeLinecap="round"/></svg>
              <p style={{ fontSize:13, color:'#FF3B30', margin:0 }}>{error}</p>
            </div>
          )}

          <button onClick={login} disabled={loading}
            style={{ width:'100%', padding:'15px', borderRadius:10, border:'none', background:'#1C1C1E', color:'#fff', fontSize:15, fontWeight:600, cursor:loading?'not-allowed':'pointer', fontFamily:F, opacity:loading?0.6:1, transition:'opacity 0.15s' }}>
            {loading ? '확인 중…' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── 최종 20위 키 (전체 탭 공용) ──────────────────────────────
  const _globalFinal20Keys = (() => {
    if (!results.length && !applications.length) return new Set<string>();
    const hasExp = (s?: string) => { const v=(s??'').trim(); return v.length>0&&!/^(없음?|없습니다?|없다|없어요|아니[요오]?|아닙니다|해당\s*없음|X|x|-)$/i.test(v); };
    const _appScore = (a: Application) => {
      const trach=a.tracheotomy??''; const t=trach?(/시행/.test(trach)&&!/안|않|미시행|하지/.test(trach)?10:8):0;
      const bulbar=a.bulbarPalsyProgress??''; const b=!bulbar?0:(/마비|진행/.test(bulbar)&&!/아님|아니|없음|않|미/.test(bulbar)?10:8);
      const cg=a.caregiverCooperation??''; const c=/가능|협조/.test(cg)?10:/불가|어렵|못/.test(cg)?5:0;
      const d=hasExp(a.electronicDeviceExperience)?10:0, e=hasExp(a.eyeMouseExperience)?5:0;
      let dur=0; if(a.onsetDate){const od=a.onsetDate.replace(/\D/g,'');if(od.length>=4){const yr=parseInt(od.slice(0,4)),mo=parseInt(od.slice(4,6)||'1')||1;if((Date.now()-new Date(yr,mo-1,1).getTime())/(1000*60*60*24*365.25)>=3)dur=5;}}
      return t+b+c+d+e+dur;
    };
    const _findApp = (r: Result) => {
      const p=normalizePhone(r.caregiverContact??'');
      if(p){const a=applications.find(a=>normalizePhone(a.contactPhone??'')===p);if(a)return a;}
      const name=normalizeStr(r.patientName??''),region=normalizeStr(r.region??''),sub=normalizeStr(r.subRegion??'');
      return applications.find(a=>{if(normalizeStr(a.patientName??'')!==name)return false;const addr=normalizeStr(a.address??'');return (region&&regionInAddr(addr,region))||(sub&&addr.includes(sub));});
    };
    const _catOrder = (s?: Status) => (s==='실기기검증적합'||s==='적합예상')?1:s?0:-1;
    const seen=new Set<string>(); const rows:{ key:string; cat:number; appTotal:number; finalTotal:number }[]=[];
    const best=new Map<string,Result>();
    results.forEach(r=>{const key=normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'');if(!key)return;const prev=best.get(key);const cv=(s?:Status)=>s==='실기기검증적합'?2:s==='적합예상'?1:0;if(!prev||cv(r.status)>cv(prev.status))best.set(key,r);});
    best.forEach((r,key)=>{
      seen.add(key); const app=_findApp(r);
      if(app){const ak=normalizePhone(app.contactPhone??'')||normalizeStr(app.patientName??'');if(ak)seen.add(ak);}
      const appTotal=app?_appScore(app):0;
      const qk=key.replace(/\//g,'_'); const qa=computeEvalAvg(qualEvals.get(qk)??{});
      const qualTotal=qa?Math.round(qa.total*10)/10:0;
      rows.push({key,cat:_catOrder(r.status),appTotal,finalTotal:appTotal+qualTotal});
    });
    applications.forEach(a=>{
      const key=normalizePhone(a.contactPhone??'')||normalizeStr(a.patientName??'');
      if(!key||seen.has(key))return; seen.add(key);
      const appTotal=_appScore(a); if(!appTotal) return;
      const qk=key.replace(/\//g,'_'); const qa=computeEvalAvg(qualEvals.get(qk)??{});
      const qualTotal=qa?Math.round(qa.total*10)/10:0;
      rows.push({key,cat:0,appTotal,finalTotal:appTotal+qualTotal});
    });
    rows.sort((a,b)=>{const cd=b.cat-a.cat;return cd!==0?cd:b.appTotal-a.appTotal;});
    const pool=[...rows.slice(0,40)].sort((a,b)=>{const cd=b.cat-a.cat;return cd!==0?cd:b.finalTotal-a.finalTotal;});
    return new Set(pool.filter(e=>!excludedKeys.has(e.key)).slice(0,20).map(e=>e.key));
  })();

  // ── 전체 엑셀 추출 (단일 시트) ───────────────────────────────
  const exportFullExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const today = new Date();
    const dStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const ws = wb.addWorksheet('선정 보고서');

    const hasExp = (s?:string)=>{const v=(s??'').trim();return v.length>0&&!/^(없음?|없습니다?|없다|없어요|아니[요오]?|아닙니다|해당\s*없음|X|x|-)$/i.test(v);};
    const _appScore = (a:Application)=>{
      const trach=a.tracheotomy??''; const t=trach?(/시행/.test(trach)&&!/안|않|미시행|하지/.test(trach)?10:8):0;
      const bulbar=a.bulbarPalsyProgress??''; const b=!bulbar?0:(/마비|진행/.test(bulbar)&&!/아님|아니|없음|않|미/.test(bulbar)?10:8);
      const cg=a.caregiverCooperation??''; const c=/가능|협조/.test(cg)?10:/불가|어렵|못/.test(cg)?5:0;
      const d=hasExp(a.electronicDeviceExperience)?10:0, e=hasExp(a.eyeMouseExperience)?5:0;
      let dur=0; if(a.onsetDate){const od=a.onsetDate.replace(/\D/g,'');if(od.length>=4){const yr=parseInt(od.slice(0,4)),mo=parseInt(od.slice(4,6)||'1')||1;if((Date.now()-new Date(yr,mo-1,1).getTime())/(1000*60*60*24*365.25)>=3)dur=5;}}
      return t+b+c+d+e+dur;
    };
    const _findApp=(r:Result)=>{
      const p=normalizePhone(r.caregiverContact??'');
      if(p){const a=applications.find(a=>normalizePhone(a.contactPhone??'')===p);if(a)return a;}
      const name=normalizeStr(r.patientName??''),region=normalizeStr(r.region??''),sub=normalizeStr(r.subRegion??'');
      return applications.find(a=>{if(normalizeStr(a.patientName??'')!==name)return false;const addr=normalizeStr(a.address??'');return (region&&regionInAddr(addr,region))||(sub&&addr.includes(sub));});
    };
    const _catOrder=(s?:Status)=>(s==='실기기검증적합'||s==='적합예상')?1:s?0:-1;
    const _getCallNote=(name:string,phone:string)=>{
      const np=normalizePhone(phone);
      const nn=normalizeStr(name);
      for(const [sid,bk] of Object.entries(scheduleBookings)){
        const bkPhone=normalizePhone(bk.contactPhone??'');
        const bkName=normalizeStr(bk.patientName??'');
        if((np&&bkPhone&&bkPhone===np)||bkName===nn) return callNotes[sid]??null;
      }
      return null;
    };

    // 심사위원 코드 (qualEvals 전체에서 수집)
    const EV_NAME_FIX2: Record<string,string> = {'빅성자':'박성자'};
    const fixEv=(n:string)=>EV_NAME_FIX2[n]||n;
    const allEvNamesSet=new Set<string>();
    qualEvals.forEach(ev=>Object.values(ev).forEach((e:EvalEntry)=>{if(e.name)allEvNamesSet.add(fixEv(e.name));}));
    const evSortedEx=[...allEvNamesSet].sort();
    const evCodeEx:Record<string,string>={};
    evSortedEx.forEach((n,i)=>{evCodeEx[n]=String.fromCharCode(65+i);});

    // _finalRanked: 컴포넌트 레벨에서 최종 탭과 동일 로직으로 이미 계산됨 → 직접 사용
    const sortedRows=_finalRanked.map(e=>{
      const evMap=qualEvals.get(e.key.replace(/\//g,'_'))??{};
      const evScores:Record<string,number>={};
      Object.values(evMap).forEach((ev:EvalEntry)=>{if(ev.name)evScores[fixEv(ev.name)]=Math.round((ev.c1+ev.c2+ev.c3)*10)/10;});
      return {...e, evScores};
    });

    // 헤더 구성 (심사위원 개별 컬럼 포함)
    const evHeaders=evSortedEx.map(n=>evCodeEx[n]);
    const headers=['순위','환우명','보호자명','연락처','지역','스크리닝','신청서(/50)',...evHeaders,'최종합계(/110)','인터뷰 결과','사용 의사','최종선정','비고','제외'];
    ws.columns=[{width:6},{width:12},{width:10},{width:14},{width:12},{width:10},{width:10},...evSortedEx.map(()=>({width:9})),{width:12},{width:12},{width:16},{width:8},{width:12},{width:6}];
    ws.views=[{state:'frozen',ySplit:1,activeCell:'A2'}];
    const hRow=ws.addRow(headers);
    hRow.height=22;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hRow.eachCell({includeEmpty:true},(cell:any,ci:number)=>{
      cell.font={bold:true,color:{argb:'FFFFFFFF'},size:10};
      const isEv=ci>=8&&ci<8+evSortedEx.length;
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:isEv?'FF5B21B6':'FF1C1C1E'}};
      cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    });

    // 데이터 행
    sortedRows.forEach((e,i)=>{
      const sl=e.screening?.status==='실기기검증적합'?'PP':e.screening?.status==='적합예상'?'P':e.screening?.status??'-';
      const note=_getCallNote(e.name,e.phone);
      const rawResult=note?.overallResult;
      const interviewResult=rawResult==='애매함'?'일단보류':rawResult||(note?'완료(미선택)':'');
      const isSelected=interviewResult==='적합';
      const isExcluded=excludedKeys.has(e.key);
      const note2=(!e.hasApp?'신청서 없음':'')+(!e.screening?' 스크리닝 없음':'');
      const evVals=evSortedEx.map(n=>e.evScores[n]??'');

      let bgArgb:string|undefined;
      if(isSelected) bgArgb='FFD1FAE5';
      else if(interviewResult==='일단보류') bgArgb='FFFFF9C3';
      else if(interviewResult==='부적합') bgArgb='FFFFE0DE';

      const rank=i<40?String(i+1):'-';
      const rowData=[rank,e.name,e.caregiver,e.phone,e.region,sl,e.appTotal||'',...evVals,e.finalTotal||'',interviewResult,note?.patientWants??'',isSelected?'✅':'',note2.trim(),isExcluded?'제외':''];
      const row=ws.addRow(rowData);
      row.height=19;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.eachCell({includeEmpty:true},(cell:any,ci:number)=>{
        cell.font={size:10};
        cell.alignment={horizontal:'center',vertical:'middle'};
        if(bgArgb) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:bgArgb}};
        else if(i%2===1) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF9FAFB'}};
      });
      row.getCell(2).alignment={horizontal:'left',vertical:'middle'};
      row.getCell(3).alignment={horizontal:'left',vertical:'middle'};
      if(isSelected) (row.getCell(headers.indexOf('최종선정')+1) as any).font={bold:true,color:{argb:'FF1A8C3A'},size:11};
      if(note2.trim()) (row.getCell(headers.indexOf('비고')+1) as any).font={bold:true,color:{argb:'FFCC7000'},size:10};
      // top40 구분선
      if(i===39) row.border={bottom:{style:'medium',color:{argb:'FF1C1C1E'}}};
    });

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`모스픽_선정보고서_${dStr}.xlsx`;a.click();
    URL.revokeObjectURL(url);
  };

  // ── 메인 ────────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', background:'#F7F7F9', fontFamily:F, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* 헤더 */}
      <div style={{ background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'14px 24px',position:'sticky',top:0,zIndex:50 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
            <img src="/morspeak-logo-icon.png" alt="Morspeak" style={{ height:36, width:'auto', display:'block' }} />
            {/* 뷰 전환 */}
            <div style={{ display:'flex',gap:2,background:'#1C1C1E',borderRadius:10,padding:3 }}>
              {(['screening','applications','ranking','final','loan','schedule'] as const).map(v => (
                <button key={v}
                  onClick={() => { setActiveView(v); if ((v==='applications'||v==='ranking'||v==='final'||v==='loan') && applications.length===0) loadApplications(); }}
                  style={{ padding:'5px 14px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:F,
                    fontSize:12,fontWeight:activeView===v?600:400,
                    background:activeView===v?'#fff':'transparent',
                    color:activeView===v?'#000':'rgba(255,255,255,0.5)',
                    boxShadow:activeView===v?'0 1px 4px rgba(0,0,0,0.15)':'none',
                    transition:'all 0.15s' }}>
                  {v==='screening'
                    ? <>스크리닝 결과 <span style={{ opacity:0.5, fontWeight:400 }}>{new Set(results.map(r=>normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??''))).size}</span></>
                    : v==='applications'
                    ? <>서비스 신청서 <span style={{ opacity:0.5, fontWeight:400 }}>{applications.length||''}</span></>
                    : v==='ranking' ? <>종합</>
                    : v==='final' ? <>🔒 최종</>
                    : v==='loan' ? <>📦 대여관리</>
                    : <>📅 일정</>}
                </button>
              ))}
            </div>
            {/* 스크리닝 상태 필터 탭 */}
            {activeView === 'screening' && (
              <div style={{ display:'flex',gap:4,background:'#F2F2F7',borderRadius:10,padding:3 }}>
                {(['전체','미검토','실기기검증적합','적합예상','애매함','보류','재요청','중복','신청서 미작성'] as const).map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:F,
                      fontSize:12,fontWeight:categoryFilter===cat?600:400,
                      background:categoryFilter===cat?'#fff':'transparent',
                      color:categoryFilter===cat?(cat==='중복'?'#CC2200':'#000'):'#8E8E93',
                      boxShadow:categoryFilter===cat?'0 1px 4px rgba(0,0,0,0.1)':'none',
                      transition:'all 0.15s',
                    }}>
                    {cat} <span style={{ color:categoryFilter===cat?'#8E8E93':'#C7C7CC',fontWeight:400 }}>{counts[cat]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {activeView === 'screening' && selected.size > 0 && (
              <>
                <button onClick={deleteSelected}
                  style={{ padding:'7px 14px',borderRadius:10,border:'none',background:'#FF3B30',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  선택 삭제 ({selected.size})
                </button>
                <button onClick={()=>{
                  const phones = results.filter(r=>selected.has(r.id)&&r.caregiverContact).map(r=>r.caregiverContact!);
                  navigator.clipboard.writeText([...new Set(phones)].join('\n'));
                }}
                  style={{ padding:'7px 12px',borderRadius:10,border:'none',background:'#1C1C1E',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  전화번호 복사
                </button>
              </>
            )}
            {activeView === 'applications' && selectedAppIds.size > 0 && (
              <>
                <button onClick={()=>setSelectedAppIds(new Set())}
                  style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
                  선택 해제 ({selectedAppIds.size})
                </button>
                <button onClick={()=>{
                  const phones = applications.filter(a=>selectedAppIds.has(a.id)&&a.contactPhone).map(a=>a.contactPhone!);
                  navigator.clipboard.writeText([...new Set(phones)].join('\n'));
                }}
                  style={{ padding:'7px 12px',borderRadius:10,border:'none',background:'#1C1C1E',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  전화번호 복사
                </button>
              </>
            )}
            <button onClick={exportFullExcel}
              style={{ padding:'7px 14px',borderRadius:10,border:'none',background:'#1A8C3A',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F,flexShrink:0 }}>
              📊 전체 엑셀
            </button>
            {activeView === 'screening' && (
              <>
                <input placeholder="이름·연락처 검색" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ padding:'7px 12px',border:'1.5px solid #E5E5EA',borderRadius:10,fontSize:13,outline:'none',fontFamily:F,width:150 }} />
                <button onClick={load} disabled={loading}
                  style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
                  {loading?'…':'↻'}
                </button>
                <button onClick={exportCSV}
                  style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
                  CSV
                </button>
              </>
            )}
            {activeView === 'ranking' && selectedRankKeys.size > 0 && (
              <>
                <button onClick={()=>setSelectedRankKeys(new Set())}
                  style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
                  선택 해제 ({selectedRankKeys.size})
                </button>
                <button onClick={()=>{
                  // ranked는 ranking IIFE 안에 있어서 선택된 키 기준으로 phone 추출
                  const phones: string[] = [];
                  results.forEach(r => {
                    const key = normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'');
                    if (selectedRankKeys.has(key) && r.caregiverContact) phones.push(r.caregiverContact);
                  });
                  applications.forEach(a => {
                    const key = normalizePhone(a.contactPhone??'')||normalizeStr(a.patientName??'');
                    if (selectedRankKeys.has(key) && a.contactPhone && !phones.some(p=>normalizePhone(p)===normalizePhone(a.contactPhone??''))) phones.push(a.contactPhone);
                  });
                  const unique = [...new Set(phones.map(p=>p.trim()).filter(Boolean))];
                  navigator.clipboard.writeText(unique.join('\n'));
                }}
                  style={{ padding:'7px 12px',borderRadius:10,border:'none',background:'#1C1C1E',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  전화번호 복사
                </button>
              </>
            )}
            {activeView === 'applications' && (
              <>
                <input placeholder="이름·연락처 검색" value={appSearch} onChange={e=>setAppSearch(e.target.value)}
                  style={{ padding:'7px 12px',border:'1.5px solid #E5E5EA',borderRadius:10,fontSize:13,outline:'none',fontFamily:F,width:150 }} />
                <button onClick={loadApplications} disabled={appLoading}
                  style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
                  {appLoading?'…':'↻'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 스크리닝 결과 */}
      {activeView === 'screening' && (
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
        <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
        <div>
          <table style={{ width:'100%',minWidth:'max-content',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                {/* 전체선택 체크박스 */}
                <th style={{ width:40,padding:'10px 12px',textAlign:'center' }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={() => toggleAll(filteredIds)}
                    style={{ cursor:'pointer',width:14,height:14 }} />
                </th>
                {[
                  {h:'날짜·시간', tip:'', sort:'date' as const},
                  {h:'환우명',tip:''},{h:'생년월일',tip:''},{h:'보호자',tip:''},{h:'연락처',tip:''},
                  {h:'지역',tip:''},{h:'소통방법',tip:''},{h:'상태',tip:''},
                  {h:'적합도 ⓘ', tip:'깜빡임 성공률·간격·혼합 패턴 종합 도입 가능성 점수 (0~100)', sort:'score' as const},
                  {h:'영상',tip:''},{h:'기기',tip:''},{h:'연락동의',tip:'서비스 연락 수신 선택 동의 여부'},{h:'',tip:''},
                ].map(({h, tip, sort}: {h:string; tip:string; sort?:'date'|'score'}) => {
                  const isActive = sort && sortField === sort;
                  return (
                    <th key={h} title={tip||undefined}
                      onClick={sort ? () => toggleSort(sort) : undefined}
                      style={{ padding:'10px 12px', textAlign:'left', color: isActive ? '#000' : '#8E8E93', fontWeight: isActive ? 600 : 500, whiteSpace:'nowrap', fontSize:11, letterSpacing:'0.03em', cursor: sort ? 'pointer' : tip ? 'help' : 'default', userSelect:'none', transition:'color 0.15s' }}>
                      {h}{sort ? <span style={{ marginLeft:3, fontSize:10, opacity: isActive ? 1 : 0.35 }}>{isActive ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={15} style={{ padding:'60px',textAlign:'center',color:'#C7C7CC' }}>결과가 없습니다</td></tr>
              )}
              {groupedFiltered.map(({key, entries}, i) => {
                const r = entries[0]; // 가장 최근 결과를 대표로
                const testCount = entries.length;
                const groupIds = entries.map(e => e.id);
                const isOpen = groupIds.includes(expandedId ?? '');
                const isChecked = groupIds.every(id => selected.has(id));
                const s = r.status ?? '미검토';
                const log = r.blinkLog ?? [];
                const hasVideo = !!(r.videoUrl || r.videoUrls);
                const suit = calcSuitability(r);
                const videoEntries: [string,string][] = r.videoUrls
                  ? (['short','long','mixed'] as const).filter(k=>r.videoUrls?.[k]).map(k=>[k,r.videoUrls![k]!])
                  : r.videoUrl ? [['recording',r.videoUrl]] : [];
                const normP = normalizePhone(r.caregiverContact ?? '');
                const handleClick = () => setExpandedId(isOpen ? null : r.id);

                return (
                  <tr key={key}
                    style={{ borderTop:i>0?'1px solid #F7F7F9':'none',
                      background:isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent',
                      cursor:'pointer' }}
                    onMouseEnter={e => { if(!isOpen&&!isChecked) e.currentTarget.style.background='#FAFAFA'; }}
                    onMouseLeave={e => { e.currentTarget.style.background=isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent'; }}
                  >
                    <td style={{ padding:'12px',textAlign:'center' }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked}
                        onChange={() => setSelected(prev => { const n=new Set(prev); isChecked?groupIds.forEach(id=>n.delete(id)):groupIds.forEach(id=>n.add(id)); return n; })}
                        style={{ cursor:'pointer',width:14,height:14 }} />
                    </td>
                    <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap' }} onClick={handleClick}>
                      {fmt(r)}
                      {testCount > 1 && <span style={{ marginLeft:5,fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#F2F2F7',color:'#8E8E93' }}>{testCount}회</span>}
                    </td>
                    <td style={{ padding:'12px',fontWeight:600,color:'#000',whiteSpace:'nowrap' }} onClick={handleClick}>
                      {_globalFinal20Keys.has(normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'')) && (
                        <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#FFD700',color:'#7A5800',fontWeight:700,verticalAlign:'middle' }}>★ 최종</span>
                      )}
                      {r.patientName}
                    </td>
                    <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap',fontSize:12 }} onClick={handleClick}>{
                      fmtBirth(appBirthMap.get(normalizePhone(r.caregiverContact??'')) || appBirthMap.get('n:'+normalizeStr(r.patientName??'')) || '')
                    }</td>
                    <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }} onClick={handleClick}>{r.caregiverName}</td>
                    <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }} onClick={handleClick}>
                      {r.caregiverContact}
                      {applications.length > 0 && (
                        matchesApp(r)
                          ? <span style={{ marginLeft:5,fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A' }}>신청서 있음</span>
                          : <span style={{ marginLeft:5,fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#F2F2F7',color:'#8E8E93' }}>미작성</span>
                      )}
                    </td>
                    <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }} onClick={handleClick}>{r.subRegion?`${r.region} ${r.subRegion}`:r.region}</td>
                    <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }} onClick={handleClick}>{r.communicationMethod||'-'}</td>
                    <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                      <select value={s} onChange={e=>updateStatus(r.id,e.target.value as Status)}
                        style={{ border:'none',outline:'none',borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',background:STATUS[s].bg,color:STATUS[s].color,fontFamily:F,appearance:'none' as const }}>
                        {(['미검토','실기기검증적합','적합예상','애매함','보류','재요청'] as Status[]).map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px 12px' }} onClick={handleClick}>
                      {suit ? (
                        <div>
                          <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:2 }}>
                            <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:suit.bg,color:suit.color,whiteSpace:'nowrap' as const }}>{suit.label}</span>
                            <span style={{ fontSize:11,fontWeight:600,color:suit.color }}>{suit.score}</span>
                          </div>
                          <p style={{ fontSize:10,color:'#8E8E93',margin:0,whiteSpace:'nowrap' }}>{suit.reason}</p>
                        </div>
                      ) : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px' }} onClick={handleClick}>
                      {hasVideo?<span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#E3F2FF',color:'#0071E3' }}>{videoEntries.length>1?`${videoEntries.length}개`:'있음'}</span>:<span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px',color:'#C7C7CC',fontSize:11,whiteSpace:'nowrap' }} onClick={handleClick}>{r.deviceType??'-'}</td>
                    <td style={{ padding:'8px 12px' }} onClick={handleClick}>
                      {r.consentContact===undefined?<span style={{ fontSize:11,color:'#C7C7CC' }}>-</span>:r.consentContact?<span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A' }}>동의</span>:<span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#F2F2F7',color:'#8E8E93' }}>미동의</span>}
                    </td>
                    <td style={{ padding:'12px',textAlign:'center' }} onClick={handleClick}>
                      <span style={{ color:'#C7C7CC',fontSize:16,display:'inline-block',transform:isOpen?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s' }}>›</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* 사이드 패널 */}
        {(() => {
          const sel = results.find(x => x.id === expandedId);
          if (!sel) return null;
          // 같은 사람의 모든 테스트 회차 찾기 (ID로 직접 매칭)
          const personGroup = groupedFiltered.find(g => g.entries.some(e => e.id === sel.id));
          const allTests = personGroup?.entries ?? [sel];
          const totalTests = allTests.length;
          const s = sel.status ?? '미검토';
          const log = sel.blinkLog ?? [];
          const skipped = sel.skippedSteps ?? [];
          const shortAvg = avg(log,'short');
          const longAvg  = avg(log,'long');
          const videoEntries: [string,string][] = sel.videoUrls
            ? (['short','long','mixed'] as const).filter(k=>sel.videoUrls?.[k]).map(k=>[k,sel.videoUrls![k]!])
            : sel.videoUrl ? [['recording',sel.videoUrl]] : [];
          return (
            <div style={{ width:480,borderLeft:'1px solid rgba(0,0,0,0.08)',background:'#fff',overflowY:'auto',flexShrink:0,display:'flex',flexDirection:'column' }}>
              {/* 패널 헤더 */}
              <div style={{ position:'sticky',top:0,zIndex:10,background:'#fff',borderBottom:'1px solid #F2F2F7',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontSize:15,fontWeight:700,color:'#000' }}>{sel.patientName}</span>
                  <span style={{ fontSize:12,color:'#8E8E93',marginLeft:8 }}>{fmt(sel)}</span>
                </div>
                <button onClick={()=>setExpandedId(null)}
                  style={{ width:28,height:28,borderRadius:'50%',border:'none',background:'#F2F2F7',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#8E8E93',fontFamily:F,flexShrink:0 }}>✕</button>
              </div>

              {/* 회차 탭 (여러 번 테스트한 경우) */}
              {totalTests > 1 && (
                <div style={{ display:'flex',gap:4,padding:'10px 16px',borderBottom:'1px solid #F2F2F7',overflowX:'auto',background:'#FAFAFA',flexShrink:0 }}>
                  {allTests.map((test, idx) => {
                    const isActive = test.id === expandedId;
                    const label = `${totalTests - idx}회차`;
                    const d = test.createdAt ? new Date(test.createdAt.seconds*1000).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'}) : '';
                    const phone = test.caregiverContact ?? '';
                    return (
                      <button key={test.id} onClick={() => setExpandedId(test.id)}
                        style={{ padding:'4px 12px',borderRadius:20,border:'none',cursor:'pointer',fontFamily:F,
                          background:isActive?'#1C1C1E':'#F2F2F7',
                          color:isActive?'#fff':'#8E8E93',
                          fontSize:12,fontWeight:isActive?600:400,whiteSpace:'nowrap' as const,flexShrink:0 }}>
                        {idx===0?`${label} · 최신`:label}
                        <span style={{ marginLeft:4,fontSize:10,opacity:0.6 }}>{d}{phone?' · '+phone:''}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 패널 내용 */}
              <div style={{ padding:'20px' }}>
                {/* 정보 + 상태 */}
                <div style={{ marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F2F2F7' }}>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'12px 20px',marginBottom:16 }}>
                    {[['환우명',sel.patientName],['보호자',sel.caregiverName],['연락처',sel.caregiverContact],
                      ['지역',(sel.subRegion?`${sel.region} ${sel.subRegion}`:sel.region)],
                      ['소통방법',sel.communicationMethod||'-'],['기기',sel.deviceType??'-'],
                      ['연락동의', sel.consentContact === undefined ? '-' : sel.consentContact ? '동의' : '미동의'],
                      ...(sel.dotDashBoundary!=null?[['경계값',`${sel.dotDashBoundary.toFixed(3)}s`]]:[]),
                    ].map(([l,v])=>(
                      <div key={l}>
                        <p style={{ fontSize:10,color:'#8E8E93',marginBottom:2,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>{l}</p>
                        <p style={{ fontSize:13,color:'#000',fontWeight:500 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:10,color:'#8E8E93',marginBottom:8,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>상태</p>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {(['실기기검증적합','적합예상','애매함','보류','재요청','미검토'] as Status[]).map(v=>(
                      <button key={v} onClick={()=>updateStatus(sel.id,v)}
                        style={{ padding:'6px 14px',borderRadius:20,border:`1.5px solid ${s===v?STATUS[v].color:'#E5E5EA'}`,
                                 background:s===v?STATUS[v].bg:'#fff',color:s===v?STATUS[v].color:'#8E8E93',
                                 fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 깜빡임 로그 */}
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>깜빡임 로그</p>
                  {log.length===0 ? (
                    <p style={{ fontSize:13,color:'#C7C7CC' }}>로그 없음 — 최신 앱 빌드로 재검사 필요</p>
                  ) : (
                    <>
                      <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:10 }}>
                        {shortAvg && <div style={{ padding:'5px 10px',borderRadius:8,background:'#F2F2F7',fontSize:12 }}><span style={{ color:'#8E8E93' }}>짧게 </span><strong>{shortAvg}s</strong><span style={{ color:'#C7C7CC',fontSize:10 }}> ({log.filter(a=>a.step==='short'&&a.success).length}/{log.filter(a=>a.step==='short').length})</span></div>}
                        {longAvg  && <div style={{ padding:'5px 10px',borderRadius:8,background:'#F2F2F7',fontSize:12 }}><span style={{ color:'#8E8E93' }}>길게 </span><strong>{longAvg}s</strong><span style={{ color:'#C7C7CC',fontSize:10 }}> ({log.filter(a=>a.step==='long'&&a.success).length}/{log.filter(a=>a.step==='long').length})</span></div>}
                        {skipped.length>0 && <div style={{ padding:'5px 10px',borderRadius:8,background:'#FFF0D4',fontSize:12,color:'#CC7000' }}>건너뜀: {skipped.map(s=>STEP[s]??s).join(', ')}</div>}
                      </div>
                      <div style={{ overflowX:'auto',borderRadius:10,border:'1px solid #F2F2F7' }}>
                        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                          <thead><tr style={{ background:'#FAFAFA',borderBottom:'1px solid #F2F2F7' }}>
                            {['#','단계','시도','지속시간','패턴','기대','결과'].map(h=>(
                              <th key={h} style={{ padding:'7px 10px',textAlign:'left',color:'#8E8E93',fontWeight:500 }}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {log.map((a,idx)=>(
                              <tr key={idx} style={{ borderBottom:idx<log.length-1?'1px solid #F7F7F9':'none',
                                                     background:a.success?'rgba(52,199,89,0.03)':'rgba(255,59,48,0.03)' }}>
                                <td style={{ padding:'6px 10px',color:'#C7C7CC' }}>{idx+1}</td>
                                <td style={{ padding:'6px 10px',fontWeight:500 }}>{STEP[a.step]??a.step}</td>
                                <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.attempt}</td>
                                <td style={{ padding:'6px 10px',fontVariantNumeric:'tabular-nums' as const }}>{typeof a.duration==='number'?a.duration.toFixed(3):'-'}s</td>
                                <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.patternIndex!=null?a.patternIndex+1:'-'}</td>
                                <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.expected?(STEP[a.expected]??a.expected):'-'}</td>
                                <td style={{ padding:'6px 10px' }}>
                                  <span style={{ fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:20,
                                                 background:a.success?'#D4F5DF':'#FFE0DE',color:a.success?'#1A8C3A':'#CC2200' }}>
                                    {a.success?'성공':'실패'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* 영상 */}
                {videoEntries.length>0 && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>녹화 영상</p>
                    <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
                      {videoEntries.map(([seg,url])=>(
                        <div key={seg}>
                          <p style={{ fontSize:11,fontWeight:600,color:'#8E8E93',marginBottom:5 }}>{STEP[seg]??seg}</p>
                          <video src={url} controls style={{ width:'100%',maxWidth:200,borderRadius:10,display:'block',background:'#000' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 원본 + 삭제 */}
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <details style={{ flex:1 }}>
                    <summary style={{ fontSize:11,color:'#C7C7CC',cursor:'pointer',userSelect:'none' as const }}>원본 데이터 보기</summary>
                    <pre style={{ marginTop:8,padding:10,background:'#FAFAFA',borderRadius:8,fontSize:10,overflow:'auto',color:'#555',maxHeight:200,lineHeight:1.5 }}>{JSON.stringify(sel,null,2)}</pre>
                  </details>
                  <button onClick={() => { deleteOne(sel.id); setExpandedId(null); }}
                    style={{ flexShrink:0,padding:'7px 16px',borderRadius:10,border:'1.5px solid rgba(255,59,48,0.25)',background:'transparent',color:'#FF3B30',fontSize:12,cursor:'pointer',fontFamily:F }}>
                    이 기록 삭제
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* 서비스 신청서 */}
      {activeView === 'applications' && (() => {
        const screeningPhoneNorms = new Set(results.map(r => normalizePhone(r.caregiverContact??'')).filter(Boolean));
        // matchesScreening은 상위 스코프에서 이미 정의됨
        const filteredApps = applications.filter(a => {
          if (appFilter === 'no_screening' && matchesScreening(a)) return false;
          if (!appSearch) return true;
          return a.patientName?.includes(appSearch) || a.contactPhone?.includes(appSearch);
        }).sort((a, b) => {
          const diff = normBirth(a.patientBirthdate??'').localeCompare(normBirth(b.patientBirthdate??''));
          return appSortDir === 'asc' ? diff : -diff;
        });
        const noScreeningCount = applications.filter(a => !matchesScreening(a)).length;
        const selApp = applications.find(x => x.id === expandedAppId);
        const fmtDate = (s: string) => {
          if (!s) return '-';
          const d = new Date(s);
          if (isNaN(d.getTime())) return s.slice(0, 16);
          return d.toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit' }) + ' ' +
                 d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false });
        };
        return (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            {/* 필터 바 */}
            <div style={{ padding:'10px 20px',borderBottom:'1px solid #F2F2F7',background:'#fff',display:'flex',gap:6 }}>
              {([['all','전체',applications.length],['no_screening','테스트 미시행',noScreeningCount]] as ['all'|'no_screening',string,number][]).map(([v,label,count])=>(
                <button key={v} onClick={()=>setAppFilter(v)}
                  style={{ padding:'4px 12px',borderRadius:20,border:'none',cursor:'pointer',fontFamily:F,fontSize:12,
                    fontWeight:appFilter===v?600:400,
                    background:appFilter===v?'#1C1C1E':'#F2F2F7',
                    color:appFilter===v?'#fff':'#8E8E93',
                    transition:'all 0.15s' }}>
                  {label} <span style={{ opacity:0.6,fontWeight:400 }}>{count}</span>
                </button>
              ))}
            </div>
            <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
            <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
              {appLoading ? (
                <div style={{ padding:60,textAlign:'center',color:'#C7C7CC' }}>불러오는 중…</div>
              ) : filteredApps.length === 0 ? (
                <div style={{ padding:60,textAlign:'center',color:'#C7C7CC' }}>신청서가 없습니다. Apps Script 연동 후 데이터가 쌓입니다.</div>
              ) : (
                <table style={{ width:'100%',minWidth:'max-content',borderCollapse:'collapse',fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                      <th style={{ width:36,padding:'10px 12px',textAlign:'center' }}>
                        <input type="checkbox"
                          checked={filteredApps.length>0&&filteredApps.every(a=>selectedAppIds.has(a.id))}
                          onChange={()=>{
                            const allSel=filteredApps.every(a=>selectedAppIds.has(a.id));
                            setSelectedAppIds(prev=>{const n=new Set(prev);allSel?filteredApps.forEach(a=>n.delete(a.id)):filteredApps.forEach(a=>n.add(a.id));return n;});
                          }}
                          style={{ cursor:'pointer',width:14,height:14 }} />
                      </th>
                      {['응답 시간','환우 성명'].map(h=>(
                        <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                      ))}
                      <th onClick={()=>setAppSortDir(d=>d==='asc'?'desc':'asc')}
                        style={{ padding:'10px 12px',textAlign:'left',color:'#3C3C43',fontWeight:600,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em',cursor:'pointer',userSelect:'none' as const }}>
                        생년월일 <span style={{ fontSize:10 }}>{appSortDir==='asc'?'↑':'↓'}</span>
                      </th>
                      {['연락처','주소','질병 코드','기관절개술','장애 등록','개인정보 동의',''].map(h=>(
                        <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((a, i) => {
                      const isOpen = expandedAppId === a.id;
                      const isChecked = selectedAppIds.has(a.id);
                      const hasScreening = matchesScreening(a);
                      return (
                        <tr key={a.id}
                          style={{ borderTop:i>0?'1px solid #F7F7F9':'none',background:isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent',cursor:'pointer' }}
                          onMouseEnter={e => { if (!isOpen&&!isChecked) e.currentTarget.style.background='#FAFAFA'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent'; }}
                          onClick={() => setExpandedAppId(isOpen ? null : a.id)}>
                          <td style={{ padding:'12px',textAlign:'center' }} onClick={e=>e.stopPropagation()}>
                            <input type="checkbox" checked={isChecked}
                              onChange={()=>setSelectedAppIds(prev=>{const n=new Set(prev);n.has(a.id)?n.delete(a.id):n.add(a.id);return n;})}
                              style={{ cursor:'pointer',width:14,height:14 }} />
                          </td>
                          <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap' }}>{fmtDate(a.syncedAt ?? a.submittedAt)}</td>
                          <td style={{ padding:'12px',fontWeight:600,color:'#000',whiteSpace:'nowrap' }}>{a.patientName||'-'}</td>
                          <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap',fontSize:12 }}>{fmtBirth(a.patientBirthdate??'')}</td>
                          <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }}>
                            {a.contactPhone}
                            {hasScreening && <span style={{ marginLeft:5,fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A' }}>스크리닝 있음</span>}
                          </td>
                          <td style={{ padding:'12px',color:'#3C3C43',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.address||'-'}</td>
                          <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }}>{a.diagnosisCode||'-'}</td>
                          <td style={{ padding:'8px 12px' }}>
                            {a.tracheotomy
                              ? <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,
                                  background:a.tracheotomy.includes('있')?'#FFE0DE':'#F2F2F7',
                                  color:a.tracheotomy.includes('있')?'#CC2200':'#8E8E93' }}>{a.tracheotomy}</span>
                              : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                          </td>
                          <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }}>{a.disabilityRegistered||'-'}</td>
                          <td style={{ padding:'8px 12px' }}>
                            {a.privacyConsent
                              ? <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A' }}>동의</span>
                              : <span style={{ fontSize:11,color:'#C7C7CC' }}>-</span>}
                          </td>
                          <td style={{ padding:'12px',textAlign:'center' }}>
                            <span style={{ color:'#C7C7CC',fontSize:16,display:'inline-block',transform:isOpen?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s' }}>›</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {selApp && (
              <div style={{ width:520,borderLeft:'1px solid rgba(0,0,0,0.08)',background:'#fff',overflowY:'auto',flexShrink:0,display:'flex',flexDirection:'column' }}>
                <div style={{ position:'sticky',top:0,zIndex:10,background:'#fff',borderBottom:'1px solid #F2F2F7',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div>
                    <span style={{ fontSize:15,fontWeight:700,color:'#000' }}>{selApp.patientName}</span>
                    <span style={{ fontSize:12,color:'#8E8E93',marginLeft:8 }}>{fmtDate(selApp.syncedAt ?? selApp.submittedAt)}</span>
                  </div>
                  <button onClick={() => setExpandedAppId(null)}
                    style={{ width:28,height:28,borderRadius:'50%',border:'none',background:'#F2F2F7',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#8E8E93',fontFamily:F,flexShrink:0 }}>✕</button>
                </div>
                <div style={{ padding:'20px' }}>
                  {([
                    { title:'기본 정보', rows:[['환우 성명',selApp.patientName],['생년월일',selApp.patientBirthdate],['성별',selApp.patientGender],['연락처',selApp.contactPhone],['주소',selApp.address]] },
                    { title:'의료 정보', rows:[['질병 코드',selApp.diagnosisCode],['발병 시기',selApp.onsetDate],['병원',selApp.hospital],['장애 등록',selApp.disabilityRegistered],['장애 유형',selApp.disabilityType],['장애 정도',selApp.disabilityLevel]] },
                    { title:'투병 환경', rows:[['투병 장소',selApp.careLocation],['의료기관',selApp.careLocationMedical],['요양기관',selApp.careLocationWelfare],['집',selApp.careLocationHome],['보호자 협조',selApp.caregiverCooperation]] },
                    { title:'지원 신청 사유', rows:[['활용 계획',selApp.utilizationPlan],['개선 조건·환경',selApp.improvementConditions],['지원 필요 이유',selApp.needReason]] },
                    { title:'서류', rows:[['서류 업로드',selApp.documentUpload],['주민등록등본',selApp.residenceDoc],['가족관계 증명서',selApp.familyCertDoc],['소득증빙서류',selApp.incomeDoc]] },
                    { title:'기술적 배경', rows:[['기관절개술',selApp.tracheotomy],['연수마비 진행',selApp.bulbarPalsyProgress],['안구마우스 경험',selApp.eyeMouseExperience],['전자기기 경험',selApp.electronicDeviceExperience],['과거 진단서 제출',selApp.previousDiagnosisSubmission]] },
                  ] as {title:string; rows:[string,string][]}[]).map(sec => (
                    <div key={sec.title} style={{ marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F2F2F7' }}>
                      <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>{sec.title}</p>
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px 20px' }}>
                        {sec.rows.filter(([,v]) => v).map(([l,v]) => (
                          <div key={l}>
                            <p style={{ fontSize:10,color:'#8E8E93',marginBottom:2,fontWeight:500 }}>{l}</p>
                            <p style={{ fontSize:12,color:'#000',fontWeight:500,wordBreak:'break-word' as const }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:8 }}>
                    <p style={{ fontSize:10,color:'#8E8E93',marginBottom:4,fontWeight:500 }}>개인정보 동의</p>
                    <p style={{ fontSize:12,color:'#000' }}>{selApp.privacyConsent||'-'}</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {/* 종합 순위 */}
      {activeView === 'ranking' && (() => {
        const statusCat = (s?: Status) =>
          s==='실기기검증적합'?'PP':s==='적합예상'?'P':'N';
        const catOrder = (e: {screening?: Result}) =>
          (e.screening?.status==='실기기검증적합'||e.screening?.status==='적합예상')?1:e.screening?0:-1;

        const appScore = (a: Application) => {
          const bs: Record<string,number> = {};
          const hasExp = (s?: string) => { const v=(s??'').trim(); return v.length>0&&!/^(없음?|없습니다?|없다|없어요|아니[요오]?|아닙니다|해당\s*없음|X|x|-)$/i.test(v); };
          const trach = a.tracheotomy??'';
          bs.tracheotomy = trach ? (/시행/.test(trach)&&!/안|않|미시행|하지/.test(trach)?10:8) : 0;
          const bulbar = a.bulbarPalsyProgress??'';
          bs.bulbar = !bulbar ? 0 : (/마비|진행/.test(bulbar)&&!/아님|아니|없음|않|미/.test(bulbar) ? 10 : 8);
          const cg = a.caregiverCooperation??'';
          bs.caregiver = /가능|협조/.test(cg)?10:/불가|어렵|못/.test(cg)?5:0;
          bs.device = hasExp(a.electronicDeviceExperience)?10:0;
          bs.eyeMouse = hasExp(a.eyeMouseExperience)?5:0;
          bs.duration = 0;
          if (a.onsetDate) {
            const d = a.onsetDate.replace(/\D/g,'');
            if (d.length>=4) {
              const yr=parseInt(d.slice(0,4)), mo=parseInt(d.slice(4,6)||'1')||1;
              if ((Date.now()-new Date(yr,mo-1,1).getTime())/(1000*60*60*24*365.25)>=3) bs.duration=5;
            }
          }
          return { total: Object.values(bs).reduce((s,v)=>s+v,0), bs };
        };

        const findApp = (r: Result) => {
          const p = normalizePhone(r.caregiverContact??'');
          if (p) { const a=applications.find(a=>normalizePhone(a.contactPhone??'')===p); if(a) return a; }
          const name=normalizeStr(r.patientName??''), region=normalizeStr(r.region??''), sub=normalizeStr(r.subRegion??'');
          return applications.find(a=>{
            if(normalizeStr(a.patientName??'')!==name) return false;
            const addr=normalizeStr(a.address??'');
            return (region&&regionInAddr(addr,region))||(sub&&addr.includes(sub));
          });
        };

        const seen = new Set<string>();
        const ranked: {key:string;name:string;phone:string;screening?:Result;application?:Application;sScore:number;aScore:ReturnType<typeof appScore>|undefined;total:number}[] = [];

        // 스크리닝 결과 기준 (같은 사람 중 최고 점수)
        const bestScreening = new Map<string,Result>();
        results.forEach(r=>{
          const key=normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'');
          if(!key) return;
          const prev=bestScreening.get(key);
          const catVal=(s?:Status)=>s==='실기기검증적합'?2:s==='적합예상'?1:0;
          if(!prev||catVal(r.status)>catVal(prev.status)) bestScreening.set(key,r);
        });

        bestScreening.forEach((r,key)=>{
          seen.add(key);
          const app=findApp(r);
          // 매칭된 신청서의 키도 seen에 등록 → 중복 방지
          if (app) {
            const appKey = normalizePhone(app.contactPhone??'')||normalizeStr(app.patientName??'');
            if (appKey) seen.add(appKey);
          }
          const aScoreRes=app?appScore(app):undefined;
          const total=aScoreRes?.total??0;
          // 스크리닝 결과가 있으면 항상 포함 (신청서 미작성 포함)
          ranked.push({key,name:r.patientName,phone:r.caregiverContact??'',screening:r,application:app,sScore:0,aScore:aScoreRes,total});
        });

        // 신청서만 있는 경우
        applications.forEach(a=>{
          const key=normalizePhone(a.contactPhone??'')||normalizeStr(a.patientName??'');
          if(!key||seen.has(key)) return;
          seen.add(key);
          const aScoreRes=appScore(a);
          if(aScoreRes.total>0) ranked.push({key,name:a.patientName,phone:a.contactPhone??'',application:a,sScore:0,aScore:aScoreRes,total:aScoreRes.total});
        });

        // PP → P → N → 없음 순, 같은 카테고리 내 총점 정렬
        ranked.sort((a,b)=>{
          const cd=catOrder(b)-catOrder(a);
          if(cd!==0) return cd;
          return b.total-a.total;
        });

        // 컴포넌트 레벨 _globalFinal20Keys 재사용
        const final20Keys = _globalFinal20Keys;
        // scoredPool: 종합 top40 → 정성평가 합산 재정렬 (제외 표시용)
        const scoredPool = [...ranked.slice(0,40)]
          .map(e => {
            const qk = e.key.replace(/\//g,'_');
            const qa = computeEvalAvg(qualEvals.get(qk)??{});
            const qualTotal = qa ? Math.round(qa.total*10)/10 : 0;
            return { key: e.key, cat: catOrder(e), finalTotal: (e.aScore?.total??0)+qualTotal };
          })
          .sort((a,b) => { const cd=b.cat-a.cat; return cd!==0?cd:b.finalTotal-a.finalTotal; });
        // 제외된 사람 중 top40 안에 있던 사람
        const excludedInPool = new Set(scoredPool.filter(e=>excludedKeys.has(e.key)).map(e=>e.key));

        const toggleExclude = async (key: string) => {
          const next = new Set(excludedKeys);
          next.has(key) ? next.delete(key) : next.add(key);
          await setDoc(doc(db,'final_config','overrides'),{excluded:[...next]},{merge:true});
        };

        const COLS = ['기관절개술','연수마비','보호자협조','전자기기','안구마우스','투병3년+'];
        const BS_KEYS = ['tracheotomy','bulbar','caregiver','device','eyeMouse','duration'] as const;

        const visibleRanked = (
          rankFilter==='complete'     ? ranked.filter(e=>e.screening&&e.application) :
          rankFilter==='no_screening' ? ranked.filter(e=>!e.screening) :
          rankFilter==='no_app'       ? ranked.filter(e=>!e.application) : ranked
        ).slice().sort((a, b) => {
          if (rankSortField === 'birth') {
            const ba = normBirth(a.application?.patientBirthdate??'');
            const bb = normBirth(b.application?.patientBirthdate??'');
            const diff = ba.localeCompare(bb);
            return rankSortDir === 'asc' ? diff : -diff;
          }
          // PP → P → N → 없음 순, 같은 그룹 내에서 총점 순
          const cd = catOrder(b) - catOrder(a);
          if (cd !== 0) return cd;
          return b.total - a.total;
        });

        const selRank = ranked.find(e => e.key === expandedRankKey);

        return (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            {/* 필터 바 */}
            <div style={{ padding:'10px 20px',borderBottom:'1px solid #F2F2F7',background:'#fff',display:'flex',gap:6 }}>
              {([
                ['all','전체',ranked.length],
                ['complete','완료',ranked.filter(e=>e.screening&&e.application).length],
                ['no_screening','테스트 미시행',ranked.filter(e=>!e.screening).length],
                ['no_app','신청서 미작성',ranked.filter(e=>!e.application).length],
              ] as ['all'|'complete'|'no_screening'|'no_app',string,number][]).map(([v,label,count])=>(
                <button key={v} onClick={()=>setRankFilter(v)}
                  style={{ padding:'4px 12px',borderRadius:20,border:'none',cursor:'pointer',fontFamily:F,fontSize:12,
                    fontWeight:rankFilter===v?600:400,
                    background:rankFilter===v?'#1C1C1E':'#F2F2F7',
                    color:rankFilter===v?'#fff':'#8E8E93',
                    transition:'all 0.15s' }}>
                  {label} <span style={{ opacity:0.6,fontWeight:400 }}>{count}</span>
                </button>
              ))}
            </div>
            <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
            <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
              <table style={{ width:'100%',minWidth:'max-content',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                    <th style={{ width:36,padding:'10px 12px',textAlign:'center' }}>
                      <input type="checkbox"
                        checked={visibleRanked.length>0&&visibleRanked.every(e=>selectedRankKeys.has(e.key))}
                        onChange={()=>{
                          const allSelected=visibleRanked.every(e=>selectedRankKeys.has(e.key));
                          setSelectedRankKeys(prev=>{const n=new Set(prev);allSelected?visibleRanked.forEach(e=>n.delete(e.key)):visibleRanked.forEach(e=>n.add(e.key));return n;});
                        }}
                        style={{ cursor:'pointer',width:14,height:14 }} />
                    </th>
                    {['순위','환우명'].map(h=>(
                      <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                    ))}
                    <th onClick={()=>{ if(rankSortField==='birth') setRankSortDir(d=>d==='asc'?'desc':'asc'); else {setRankSortField('birth');setRankSortDir('asc');} }}
                      style={{ padding:'10px 12px',textAlign:'left',whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em',cursor:'pointer',userSelect:'none' as const,
                        color:rankSortField==='birth'?'#1C1C1E':'#8E8E93',fontWeight:rankSortField==='birth'?600:500 }}>
                      생년월일{rankSortField==='birth'?<span style={{ marginLeft:3,fontSize:10 }}>{rankSortDir==='asc'?'↑':'↓'}</span>:null}
                    </th>
                    {['연락처','총점','스크리닝', ...COLS, ''].map(h=>(
                      <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRanked.length===0&&<tr><td colSpan={13} style={{ padding:60,textAlign:'center',color:'#C7C7CC' }}>{ranked.length===0?'데이터를 불러오면 순위가 표시됩니다':'해당 항목이 없습니다'}</td></tr>}
                  {visibleRanked.map((e,i)=>{
                    const isOpen = expandedRankKey === e.key;
                    const isTop20 = i < 20;
                    const isFinal20 = final20Keys.has(e.key);
                    const isExcluded = excludedKeys.has(e.key);
                    const isExcludedInPool = excludedInPool.has(e.key);
                    const s = e.screening?.status??'미검토';
                    return (
                      <tr key={e.key}
                        style={{ borderTop:i>0?'1px solid #F7F7F9':'none', background:isOpen?'#F7F7F9':'transparent', cursor:'pointer' }}
                        onMouseEnter={ev=>{if(!isOpen)ev.currentTarget.style.background='#FAFAFA';}}
                        onMouseLeave={ev=>{ev.currentTarget.style.background=isOpen?'#F7F7F9':'transparent';}}
                        onClick={()=>setExpandedRankKey(isOpen?null:e.key)}>
                        <td style={{ padding:'12px',textAlign:'center' }} onClick={ev=>ev.stopPropagation()}>
                          <input type="checkbox" checked={selectedRankKeys.has(e.key)}
                            onChange={()=>setSelectedRankKeys(prev=>{const n=new Set(prev);n.has(e.key)?n.delete(e.key):n.add(e.key);return n;})}
                            style={{ cursor:'pointer',width:14,height:14 }} />
                        </td>
                        <td style={{ padding:'12px',textAlign:'center' }}>
                          <span style={{ fontSize:13,fontWeight:isTop20?600:400,color:isTop20?'#1C1C1E':'#8E8E93' }}>{i+1}</span>
                        </td>
                        <td style={{ padding:'12px',fontWeight:600,color: isExcluded?'#C7C7CC':'#000',whiteSpace:'nowrap',textDecoration:isExcluded?'line-through':'none' }}>
                          {isFinal20 && <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#FFD700',color:'#7A5800',fontWeight:700,verticalAlign:'middle' }}>★ 최종</span>}
                          {isExcludedInPool && <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#FFE0DE',color:'#CC2200',fontWeight:700,verticalAlign:'middle' }}>✕ 제외</span>}
                          {!isExcluded && !isFinal20 && final20Keys.size>0 && scoredPool.findIndex(x=>x.key===e.key)===19+[...excludedInPool].length && (
                            <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#EAF5F0',color:'#2E7D5E',fontWeight:700,verticalAlign:'middle' }}>↑ 대체</span>
                          )}
                          {e.name}
                          {e.screening&&<span style={{ marginLeft:5,fontSize:10,padding:'1px 5px',borderRadius:20,background:'#E3F2FF',color:'#0071E3',fontWeight:600 }}>테스트</span>}
                          {e.application&&<span style={{ marginLeft:4,fontSize:10,padding:'1px 5px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A',fontWeight:600 }}>신청서</span>}
                          {(isFinal20||isExcludedInPool) && (
                            <button onClick={ev=>{ev.stopPropagation();toggleExclude(e.key);}}
                              style={{ marginLeft:8,fontSize:10,fontWeight:600,padding:'1px 7px',borderRadius:10,border:'1px solid',cursor:'pointer',fontFamily:F,verticalAlign:'middle',
                                background:isExcluded?'#D4F5DF':isExcludedInPool?'#D4F5DF':'#FFF0F0',
                                color:isExcluded?'#1A8C3A':isExcludedInPool?'#1A8C3A':'#CC2200',
                                borderColor:isExcluded?'#1A8C3A':isExcludedInPool?'#1A8C3A':'#FFBFBA' }}>
                              {isExcluded ? '↩ 복원' : '✕ 제외'}
                            </button>
                          )}
                        </td>
                        <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap',fontSize:12 }}>{fmtBirth(e.application?.patientBirthdate??'')}</td>
                        <td style={{ padding:'12px',color:'#8E8E93',fontSize:12,whiteSpace:'nowrap' }}>{e.phone}</td>
                        <td style={{ padding:'8px 12px' }}>
                          <span style={{ fontSize:16,fontWeight:700,color:'#1C1C1E' }}>{e.total}</span>
                          <span style={{ fontSize:10,color:'#8E8E93',marginLeft:2 }}>점</span>
                        </td>
                        <td style={{ padding:'8px 12px' }}>
                          {e.screening ? (() => {
                            const cat=statusCat(e.screening.status);
                            const c=cat==='PP'?{bg:'#D4F5DF',color:'#1A8C3A'}:cat==='P'?{bg:'#E3F2FF',color:'#0071E3'}:{bg:'#F2F2F7',color:'#8E8E93'};
                            return <span style={{ fontSize:12,fontWeight:700,padding:'2px 10px',borderRadius:20,background:c.bg,color:c.color }}>{cat}</span>;
                          })() : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                        </td>
                        {BS_KEYS.map(k=>(
                          <td key={k} style={{ padding:'8px 12px',textAlign:'center' }}>
                            {e.aScore
                              ? <span style={{ fontSize:11,fontWeight:600,color:e.aScore.bs[k]>0?'#1A8C3A':'#C7C7CC' }}>
                                  {e.aScore.bs[k]>0?`+${e.aScore.bs[k]}`:'0'}
                                </span>
                              : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                          </td>
                        ))}
                        <td style={{ padding:'8px 12px',textAlign:'right',whiteSpace:'nowrap' }}>
                          {i < 40 && (e.screening?.status==='실기기검증적합'||e.screening?.status==='적합예상') && (
                            <span style={{ marginRight:8,fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20,background:'#F3E8FF',color:'#7C3AED',display:'inline-block' }}>정성평가</span>
                          )}
                          <span style={{ color:'#C7C7CC',fontSize:16,display:'inline-block',transform:isOpen?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s' }}>›</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 순위 사이드 패널 */}
            {selRank && (() => {
              const app = selRank.application;
              const scr = selRank.screening;
              // 나이 계산
              const calcAge = (bd: string) => {
                const d = bd.replace(/\D/g,'');
                if (d.length < 4) return null;
                const yr=parseInt(d.slice(0,4)), mo=parseInt(d.slice(4,6)||'1'), dy=parseInt(d.slice(6,8)||'1');
                const now = new Date(); let age = now.getFullYear()-yr;
                if (now.getMonth()+1<mo||(now.getMonth()+1===mo&&now.getDate()<dy)) age--;
                return age > 0 ? age : null;
              };
              const age = app?.patientBirthdate ? calcAge(app.patientBirthdate) : null;
              const suit = scr ? calcSuitability(scr) : null;

              const Section = ({title, children}: {title:string; children:React.ReactNode}) => (
                <div style={{ marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F2F2F7' }}>
                  <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:12,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>{title}</p>
                  {children}
                </div>
              );
              const Grid = ({rows}: {rows:[string,string|null|undefined][]}) => (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px 20px' }}>
                  {rows.filter(([,v])=>v).map(([l,v])=>(
                    <div key={l}>
                      <p style={{ fontSize:10,color:'#8E8E93',marginBottom:2,fontWeight:500 }}>{l}</p>
                      <p style={{ fontSize:12,color:'#000',fontWeight:500,wordBreak:'break-word' as const }}>{v}</p>
                    </div>
                  ))}
                </div>
              );
              const LongText = ({label, value}: {label:string; value?: string}) => value ? (
                <div style={{ marginTop:12 }}>
                  <p style={{ fontSize:10,color:'#8E8E93',marginBottom:4,fontWeight:500 }}>{label}</p>
                  <p style={{ fontSize:12,color:'#3C3C43',lineHeight:1.6 }}>{value}</p>
                </div>
              ) : null;

              return (
                <div style={{ width:520,borderLeft:'1px solid rgba(0,0,0,0.08)',background:'#fff',overflowY:'auto',flexShrink:0,display:'flex',flexDirection:'column' }}>
                  {/* 헤더 */}
                  <div style={{ position:'sticky',top:0,zIndex:10,background:'#fff',borderBottom:'1px solid #F2F2F7',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <div>
                      <span style={{ fontSize:15,fontWeight:700,color:'#000' }}>{selRank.name}</span>
                      {age && <span style={{ fontSize:13,color:'#3C3C43',marginLeft:8 }}>만 {age}세</span>}
                      {app?.patientGender && <span style={{ fontSize:12,color:'#8E8E93',marginLeft:6 }}>{app.patientGender}</span>}
                    </div>
                    <button onClick={()=>setExpandedRankKey(null)}
                      style={{ width:28,height:28,borderRadius:'50%',border:'none',background:'#F2F2F7',cursor:'pointer',fontSize:14,color:'#8E8E93',fontFamily:F }}>✕</button>
                  </div>

                  <div style={{ padding:'20px' }}>
                    {/* 총점 */}
                    <div style={{ marginBottom:20,padding:16,borderRadius:12,background:'#F7F7F9',display:'flex',alignItems:'center',gap:16 }}>
                      <div>
                        <p style={{ fontSize:10,color:'#8E8E93',fontWeight:500,marginBottom:4 }}>종합 점수</p>
                        <span style={{ fontSize:32,fontWeight:700,color:'#1C1C1E' }}>{selRank.total}</span>
                        <span style={{ fontSize:14,color:'#8E8E93',marginLeft:4 }}>점</span>
                      </div>
                      <div style={{ flex:1,display:'flex',flexWrap:'wrap',gap:6 }}>
                        {selRank.screening && (() => {
                          const cat=statusCat(selRank.screening.status);
                          const c=cat==='PP'?{bg:'#D4F5DF',color:'#1A8C3A'}:cat==='P'?{bg:'#E3F2FF',color:'#0071E3'}:{bg:'#F2F2F7',color:'#8E8E93'};
                          return <div style={{ textAlign:'center',padding:'6px 10px',borderRadius:8,background:c.bg,minWidth:52 }}>
                            <p style={{ fontSize:9,color:'#8E8E93',marginBottom:2 }}>스크리닝</p>
                            <p style={{ fontSize:13,fontWeight:700,color:c.color }}>{cat}</p>
                          </div>;
                        })()}
                        {COLS.map((label,i)=>{
                          const val=selRank.aScore?.bs[BS_KEYS[i]]??0;
                          const max=[10,10,10,10,5,5][i];
                          return <div key={label} style={{ textAlign:'center',padding:'6px 10px',borderRadius:8,background:val>0?'#D4F5DF':'#F2F2F7',minWidth:52 }}>
                            <p style={{ fontSize:9,color:'#8E8E93',marginBottom:2 }}>{label}</p>
                            <p style={{ fontSize:13,fontWeight:700,color:val>0?'#1A8C3A':'#C7C7CC' }}>{val}<span style={{ fontSize:9,color:'#C7C7CC' }}>/{max}</span></p>
                          </div>;
                        })}
                      </div>
                    </div>

                    {/* 기본 정보 */}
                    <Section title="기본 정보">
                      <Grid rows={[
                        ['환우 성명', selRank.name],
                        ['생년월일', app?.patientBirthdate || '-'],
                        ['나이', age ? `만 ${age}세` : null],
                        ['성별', app?.patientGender],
                        ['연락처', selRank.phone || app?.contactPhone],
                        ['주소', app?.address || (scr ? (scr.subRegion?`${scr.region} ${scr.subRegion}`:scr.region) : null)],
                        ['보호자', scr?.caregiverName],
                        ['보호자 협조', app?.caregiverCooperation],
                        ['소통방법', scr?.communicationMethod],
                        ['기기', scr?.deviceType],
                      ]} />
                    </Section>

                    {/* 의료 정보 */}
                    <Section title="의료 정보">
                      <Grid rows={[
                        ['질병 코드', app?.diagnosisCode],
                        ['발병 시기', app?.onsetDate],
                        ['병원', app?.hospital],
                        ['장애 등록', app?.disabilityRegistered],
                        ['장애 유형', app?.disabilityType],
                        ['장애 정도', app?.disabilityLevel],
                        ['기관절개술', app?.tracheotomy],
                        ['연수마비', app?.bulbarPalsyProgress],
                      ]} />
                    </Section>

                    {/* 투병 환경 */}
                    <Section title="투병 환경">
                      <Grid rows={[
                        ['투병 장소', app?.careLocation],
                        ['의료기관', app?.careLocationMedical],
                        ['요양기관', app?.careLocationWelfare],
                        ['자택', app?.careLocationHome],
                        ['이전 전자기기', app?.electronicDeviceExperience],
                        ['안구마우스 경험', app?.eyeMouseExperience],
                        ['과거 진단서', app?.previousDiagnosisSubmission],
                      ]} />
                    </Section>

                    {/* 스크리닝 분석 */}
                    {scr && (
                      <Section title="스크리닝 분석">
                        <Grid rows={[
                          ['상태', scr.status??'미검토'],
                          ['적합도', suit ? `${suit.label} (${suit.score}점)` : null],
                          ['적합도 근거', suit?.reason],
                        ]} />
                      </Section>
                    )}

                    {/* 지원 사유 */}
                    {app && (
                      <Section title="지원 신청 사유">
                        <LongText label="활용 계획" value={app.utilizationPlan} />
                        <LongText label="개선 조건·환경" value={app.improvementConditions} />
                        <LongText label="지원 필요 이유" value={app.needReason} />
                      </Section>
                    )}

                    {/* 정성 평가 (PP/P + 상위 40위만) */}
                    {(visibleRanked.findIndex(e=>e.key===selRank.key) < 40) && (selRank.screening?.status==='실기기검증적합'||selRank.screening?.status==='적합예상') && (() => {
                      const pKey = selRank.key.replace(/\//g,'_');
                      const evals = qualEvals.get(pKey) ?? {};
                      const evalCount = Object.keys(evals).length;
                      const myKey = evalInput.name.trim() && evalInput.phone.length===4
                        ? `${normalizeStr(evalInput.name.trim())}_${evalInput.phone}` : null;

                      const tryPrefill = () => {
                        if (!myKey) return;
                        const existing = evals[myKey];
                        if (existing) setEvalInput(p=>({...p, c1:String(existing.c1), c2:String(existing.c2), c3:String(existing.c3), comment:existing.comment??''}));
                      };

                      const handleSave = async () => {
                        if (!evalInput.name.trim()) return alert('이름을 입력해주세요.');
                        if (evalInput.phone.length!==4) return alert('전화번호 뒷 4자리를 입력해주세요.');
                        const c1=parseFloat(evalInput.c1), c2=parseFloat(evalInput.c2), c3=parseFloat(evalInput.c3);
                        if ([c1,c2,c3].some(isNaN)) return alert('모든 항목에 점수를 선택해주세요.');
                        if ([c1,c2,c3].some(v=>v<0||v>20)) return alert('각 항목은 0~20점 사이입니다.');
                        const commentVal = evalInput.comment.trim();
                        await saveEvalEntry(selRank.key, {
                          name:evalInput.name.trim(), phone:evalInput.phone, c1, c2, c3,
                          ...(commentVal ? {comment: commentVal} : {}),
                        });
                        setEvalJustSaved(true);
                        setTimeout(()=>setEvalJustSaved(false), 2500);
                      };

                      return (
                        <div style={{ paddingTop:16,borderTop:'1px solid #F2F2F7' }}>
                          <p style={{ fontSize:10,fontWeight:600,color:'#7C3AED',marginBottom:8,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>
                            정성 평가
                          </p>
                          {evalCount>0 && (
                            <div style={{ marginBottom:12,padding:'8px 12px',borderRadius:8,background:'#F3E8FF',fontSize:12,color:'#3C3C43' }}>
                              <span style={{ fontWeight:600,color:'#7C3AED' }}>{evalCount}명 제출</span>
                              <span style={{ color:'#8E8E93',marginLeft:8 }}>{Object.values(evals).map(e=>e.name).join(', ')}</span>
                            </div>
                          )}

                          {/* 평가 입력 */}
                          {(() => {
                            return (
                            <div style={{ marginBottom:14,padding:14,borderRadius:10,border:'1px solid #EDE9FF',background:'#FAF5FF' }}>
                              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
                                <div>
                                  <p style={{ fontSize:10,color:'#8E8E93',marginBottom:4,fontWeight:500 }}>이름</p>
                                  <input value={evalInput.name}
                                    onChange={e=>setEvalInput(p=>({...p,name:e.target.value}))}
                                    onBlur={tryPrefill}
                                    placeholder="홍길동"
                                    style={{ width:'100%',padding:'7px 10px',border:'1.5px solid #DDD6FE',borderRadius:8,fontSize:12,outline:'none',fontFamily:F,boxSizing:'border-box' as const }} />
                                </div>
                                <div>
                                  <p style={{ fontSize:10,color:'#8E8E93',marginBottom:4,fontWeight:500 }}>전화번호 뒷 4자리</p>
                                  <input value={evalInput.phone} maxLength={4}
                                    onChange={e=>setEvalInput(p=>({...p,phone:e.target.value.replace(/\D/g,'')}))}
                                    onBlur={tryPrefill}
                                    placeholder="0000"
                                    style={{ width:'100%',padding:'7px 10px',border:'1.5px solid #DDD6FE',borderRadius:8,fontSize:12,outline:'none',fontFamily:F,boxSizing:'border-box' as const,textAlign:'center' as const }} />
                                </div>
                              </div>
                              <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:10 }}>
                                {([['c1','① 활용계획'],['c2','② 개선조건·환경'],['c3','③ 지원필요이유']] as [keyof typeof evalInput, string][]).map(([field,label])=>(
                                  <div key={field}>
                                    <p style={{ fontSize:10,color:'#8E8E93',marginBottom:5,fontWeight:500 }}>{label}</p>
                                    <div style={{ display:'flex',gap:6 }}>
                                      {[5,10,15,20].map(v=>{
                                        const active = evalInput[field] === String(v);
                                        return (
                                          <button key={v} type="button"
                                            onClick={()=>setEvalInput(p=>({...p,[field]:active?'':String(v)}))}
                                            style={{ flex:1,padding:'7px 0',borderRadius:8,border:`1.5px solid ${active?'#7C3AED':'#DDD6FE'}`,
                                              background:active?'#7C3AED':'#fff',
                                              color:active?'#fff':'#8E8E93',
                                              fontSize:13,fontWeight:active?700:400,cursor:'pointer',fontFamily:F,transition:'all 0.12s' }}>
                                            {v}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginBottom:10 }}>
                                <p style={{ fontSize:10,color:'#8E8E93',marginBottom:4,fontWeight:500 }}>의견 (선택사항)</p>
                                <textarea value={evalInput.comment}
                                  onChange={e=>setEvalInput(p=>({...p,comment:e.target.value}))}
                                  placeholder="자유롭게 의견을 남겨주세요."
                                  rows={3}
                                  style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #DDD6FE',borderRadius:8,fontSize:12,outline:'none',fontFamily:F,resize:'vertical',boxSizing:'border-box' as const,background:'#fff' }} />
                              </div>
                              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                                <button onClick={handleSave}
                                  style={{ flex:1,padding:'9px',borderRadius:10,border:'none',background:'#7C3AED',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                                  저장하기
                                </button>
                                {evalJustSaved && <span style={{ fontSize:12,color:'#1A8C3A',fontWeight:600 }}>✓ 저장됨</span>}
                              </div>
                            </div>
                            );
                          })()}

                          {/* 결과 확인 (관리자) */}
                          {qualViewUnlocked ? (
                            <div>
                              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                                <p style={{ fontSize:10,fontWeight:600,color:'#3C3C43' }}>집계 결과 ({evalCount}명)</p>
                                <button onClick={()=>setQualViewUnlocked(false)} style={{ fontSize:11,color:'#8E8E93',background:'none',border:'none',cursor:'pointer',fontFamily:F }}>닫기</button>
                              </div>
                              <div style={{ overflowX:'auto',borderRadius:10,border:'1px solid #F2F2F7' }}>
                                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                                  <thead>
                                    <tr style={{ background:'#FAFAFA',borderBottom:'1.5px solid #F2F2F7' }}>
                                      {['이름','①활용','②개선','③필요','소계','의견',''].map(h=>(
                                        <th key={h} style={{ padding:'7px 10px',textAlign:'left',color:'#8E8E93',fontWeight:500,fontSize:10 }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(evals).map(([evalKey, e],i)=>(
                                      <tr key={i} style={{ borderBottom:'1px solid #F7F7F9' }}>
                                        <td style={{ padding:'6px 10px',fontSize:12 }}>{e.name}</td>
                                        {[e.c1,e.c2,e.c3].map((v,j)=><td key={j} style={{ padding:'6px 10px',textAlign:'right' as const,fontSize:12 }}>{v}</td>)}
                                        <td style={{ padding:'6px 10px',textAlign:'right' as const,fontWeight:700,fontSize:12 }}>{e.c1+e.c2+e.c3}</td>
                                        <td style={{ padding:'6px 10px',fontSize:11,color:'#3C3C43',maxWidth:120 }}>{e.comment||'-'}</td>
                                        <td style={{ padding:'6px 10px',textAlign:'center' as const }}>
                                          <button onClick={async()=>{
                                            if(!confirm(`${e.name}의 평가를 삭제할까요?`)) return;
                                            await updateDoc(doc(db,'qualitative_scores',pKey),{[`evals.${evalKey}`]:deleteField()});
                                          }} style={{ background:'none',border:'none',cursor:'pointer',color:'#FF3B30',fontSize:12,padding:'2px 6px' }}>삭제</button>
                                        </td>
                                      </tr>
                                    ))}
                                    {(() => { const qa=computeEvalAvg(evals); return qa?(
                                      <tr style={{ background:'#F3E8FF',borderTop:'2px solid #DDD6FE' }}>
                                        <td style={{ padding:'8px 10px',fontWeight:600,fontSize:11,color:'#7C3AED' }}>평균</td>
                                        {[qa.c1,qa.c2,qa.c3].map((v,i)=><td key={i} style={{ padding:'8px 10px',textAlign:'right' as const,fontWeight:700,fontSize:12,color:'#7C3AED' }}>{v.toFixed(1)}</td>)}
                                        <td style={{ padding:'8px 10px',textAlign:'right' as const }}>
                                          <span style={{ fontSize:16,fontWeight:700,color:'#7C3AED' }}>{qa.total.toFixed(1)}</span>
                                          <span style={{ fontSize:9,color:'#8E8E93',marginLeft:2 }}>/60</span>
                                        </td>
                                        <td />
                                      </tr>
                                    ):null; })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                              <input type="password" placeholder="관리자 비밀번호" value={qualViewPw}
                                onChange={e=>setQualViewPw(e.target.value)}
                                onKeyDown={e=>{ if(e.key==='Enter'&&qualViewPw===QUAL_VIEW_PW){setQualViewUnlocked(true);setQualViewPw('');} }}
                                style={{ flex:1,padding:'7px 10px',border:'1.5px solid #E5E5EA',borderRadius:8,fontSize:12,outline:'none',fontFamily:F }} />
                              <button onClick={()=>{ if(qualViewPw===QUAL_VIEW_PW){setQualViewUnlocked(true);setQualViewPw('');}else alert('비밀번호가 틀렸습니다.');}}
                                style={{ padding:'7px 14px',borderRadius:8,border:'1.5px solid #EDE9FF',background:'#FAF5FF',color:'#7C3AED',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,whiteSpace:'nowrap' as const }}>
                                결과 확인
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
            </div>

          </div>
        );
      })()}
      {/* 최종 탭 */}
      {activeView === 'final' && (() => {
        // 비밀번호 게이트
        if (!finalUnlocked) return (
          <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#F7F7F9' }}>
            <div style={{ background:'#fff',borderRadius:16,padding:'40px 36px',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',width:320,textAlign:'center' }}>
              <p style={{ fontSize:20,fontWeight:700,color:'#1C1C1E',marginBottom:8 }}>🔒 최종 순위</p>
              <p style={{ fontSize:13,color:'#8E8E93',marginBottom:24 }}>관리자 비밀번호를 입력해주세요</p>
              <input type="password" value={finalPw} onChange={e=>setFinalPw(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ if(finalPw===QUAL_VIEW_PW){setFinalUnlocked(true);setFinalPw('');}else alert('비밀번호가 틀렸습니다.'); }}}
                placeholder="비밀번호"
                style={{ width:'100%',padding:'11px 14px',border:'1.5px solid #E5E5EA',borderRadius:10,fontSize:14,outline:'none',fontFamily:F,boxSizing:'border-box' as const,marginBottom:12,textAlign:'center' as const }} />
              <button onClick={()=>{ if(finalPw===QUAL_VIEW_PW){setFinalUnlocked(true);setFinalPw('');}else alert('비밀번호가 틀렸습니다.');}}
                style={{ width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#1C1C1E',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                확인
              </button>
            </div>
          </div>
        );

        // 최종 순위 계산
        const statusCatF = (s?: Status) => s==='실기기검증적합'?'PP':s==='적합예상'?'P':'N';
        const catOrderF = (e: {screening?: Result}) =>
          (e.screening?.status==='실기기검증적합'||e.screening?.status==='적합예상')?1:e.screening?0:-1;

        const appScoreF = (a: Application) => {
          const bs: Record<string,number> = {};
          const hasExp = (s?: string) => { const v=(s??'').trim(); return v.length>0&&!/^(없음?|없습니다?|없다|없어요|아니[요오]?|아닙니다|해당\s*없음|X|x|-)$/i.test(v); };
          const trach=a.tracheotomy??'';
          bs.tracheotomy=trach?(/시행/.test(trach)&&!/안|않|미시행|하지/.test(trach)?10:8):0;
          const bulbar=a.bulbarPalsyProgress??'';
          bs.bulbar=!bulbar?0:(/마비|진행/.test(bulbar)&&!/아님|아니|없음|않|미/.test(bulbar)?10:8);
          const cg=a.caregiverCooperation??'';
          bs.caregiver=/가능|협조/.test(cg)?10:/불가|어렵|못/.test(cg)?5:0;
          bs.device=hasExp(a.electronicDeviceExperience)?10:0;
          bs.eyeMouse=hasExp(a.eyeMouseExperience)?5:0;
          bs.duration=0;
          if(a.onsetDate){const d=a.onsetDate.replace(/\D/g,'');if(d.length>=4){const yr=parseInt(d.slice(0,4)),mo=parseInt(d.slice(4,6)||'1')||1;if((Date.now()-new Date(yr,mo-1,1).getTime())/(1000*60*60*24*365.25)>=3)bs.duration=5;}}
          return {bs, total:Object.values(bs).reduce((s,v)=>s+v,0)};
        };
        const F_COLS=['기관절개술','연수마비','보호자협조','전자기기','안구마우스','투병3년+'] as const;
        const F_KEYS=['tracheotomy','bulbar','caregiver','device','eyeMouse','duration'] as const;

        const findAppF = (r: Result) => {
          const p=normalizePhone(r.caregiverContact??'');
          if(p){const a=applications.find(a=>normalizePhone(a.contactPhone??'')===p);if(a)return a;}
          const name=normalizeStr(r.patientName??''),region=normalizeStr(r.region??''),sub=normalizeStr(r.subRegion??'');
          return applications.find(a=>{
            if(normalizeStr(a.patientName??'')!==name)return false;
            const addr=normalizeStr(a.address??'');
            return (region&&regionInAddr(addr,region))||(sub&&addr.includes(sub));
          });
        };

        // ranked 구성 (종합과 동일 로직 + bs breakdown 포함)
        const seen=new Set<string>();
        const ranked: {key:string;name:string;phone:string;caregiver:string;screening?:Result;application?:Application;bs?:Record<string,number>;evals:Record<string,EvalEntry>;appTotal:number;qualTotal:number;finalTotal:number}[]=[];

        const bestScreening=new Map<string,Result>();
        results.forEach(r=>{
          const key=normalizePhone(r.caregiverContact??'')||normalizeStr(r.patientName??'');
          if(!key)return;
          const prev=bestScreening.get(key);
          const cv=(s?:Status)=>s==='실기기검증적합'?2:s==='적합예상'?1:0;
          if(!prev||cv(r.status)>cv(prev.status))bestScreening.set(key,r);
        });
        bestScreening.forEach((r,key)=>{
          seen.add(key);
          const app=findAppF(r);
          if(app){const appKey=normalizePhone(app.contactPhone??'')||normalizeStr(app.patientName??'');if(appKey)seen.add(appKey);}
          const aScore=app?appScoreF(app):null;
          const qualKey=key.replace(/\//g,'_');
          const evals=qualEvals.get(qualKey)??{};
          const qa=computeEvalAvg(evals);
          const qualTotal=qa?Math.round(qa.total*10)/10:0;
          ranked.push({key,name:r.patientName,caregiver:r.caregiverName??'',phone:r.caregiverContact??'',screening:r,application:app,bs:aScore?.bs,evals,appTotal:aScore?.total??0,qualTotal,finalTotal:(aScore?.total??0)+qualTotal});
        });
        applications.forEach(a=>{
          const key=normalizePhone(a.contactPhone??'')||normalizeStr(a.patientName??'');
          if(!key||seen.has(key))return;
          seen.add(key);
          const aScore=appScoreF(a);
          const qualKey=key.replace(/\//g,'_');
          const evals=qualEvals.get(qualKey)??{};
          const qa=computeEvalAvg(evals);
          const qualTotal=qa?Math.round(qa.total*10)/10:0;
          ranked.push({key,name:a.patientName,caregiver:'',phone:a.contactPhone??'',application:a,bs:aScore.bs,evals,appTotal:aScore.total,qualTotal,finalTotal:aScore.total+qualTotal});
        });

        // STEP 1: 종합 탭 기준 정렬 (신청서 배점만) → 상위 40명 선정
        ranked.sort((a,b)=>{
          const cd=catOrderF(b)-catOrderF(a);
          if(cd!==0)return cd;
          return b.appTotal-a.appTotal;
        });
        const top40pool=ranked.slice(0,40);

        // STEP 2: 그 40명을 정성평가 합산으로 재정렬 → 최종 순위
        const finalRanked=[...top40pool].sort((a,b)=>{
          const cd=catOrderF(b)-catOrderF(a);
          if(cd!==0)return cd;
          return b.finalTotal-a.finalTotal;
        });

        // 심사위원 가나다순 → A,B,C... 코드 매핑
        // 오타 이름 통합
        const EV_NAME_FIX: Record<string,string> = {'빅성자':'박성자'};
        const fixEvName = (n: string) => EV_NAME_FIX[n] || n;

        const allEvNames=new Set<string>();
        finalRanked.forEach(r=>Object.values(r.evals||{}).forEach((e:EvalEntry)=>{if(e.name)allEvNames.add(fixEvName(e.name))}));
        const evSorted=[...allEvNames].sort();
        const evCode:Record<string,string>={};
        evSorted.forEach((n,i)=>{evCode[n]=String.fromCharCode(65+i);});
        const evCodes=evSorted.map(n=>evCode[n]);

        const exportExcel = async () => {
          const ExcelJS = (await import('exceljs')).default;
          const wb = new ExcelJS.Workbook();
          const ws = wb.addWorksheet('최종순위');

          // F_COLS: 표시용 한글, F_KEYS: r.bs 조회용 영문 (appScoreF가 영문 키 사용)
          const SC_LABELS=F_COLS as unknown as string[];
          const SC_KEYS=F_KEYS as unknown as string[];
          const headerRow=['전송완료','순위','환우명','보호자','연락처','스크리닝',...SC_LABELS,'신청서합계',...evCodes,'정성평가평균','최종합계'];

          // 컬럼 너비
          ws.columns=[
            {width:8},{width:6},{width:12},{width:10},{width:15},{width:8},
            ...SC_LABELS.map(()=>({width:10})),
            {width:10},...evCodes.map(()=>({width:8})),{width:12},{width:10}
          ];

          // 헤더 행
          const hRow=ws.addRow(headerRow);
          hRow.height=24;
          // includeEmpty:true 로 A1 포함 전체 셀 스타일 적용
          hRow.eachCell({includeEmpty:true},(cell)=>{
            cell.font={bold:true,color:{argb:'FFFFFFFF'},size:10};
            cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1C1C1E'}};
            cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
            cell.border={bottom:{style:'thin',color:{argb:'FFE5E5EA'}}};
          });
          // 신청서합계 = col 13 (= 7+SC_LABELS.length), evCodes 시작 = col 14
          const COL_APP = 7 + SC_LABELS.length;       // 13
          const COL_EV0 = COL_APP + 1;                // 14
          const COL_AVG = COL_EV0 + evCodes.length;   // 14+n
          const COL_TOT = COL_AVG + 1;                // 15+n

          // 심사위원 열 보라색
          evCodes.forEach((_,i)=>{
            hRow.getCell(COL_EV0+i).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF5B21B6'}};
          });
          // 정성평가평균/최종합계 색상
          hRow.getCell(COL_AVG).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF4C1D95'}};
          hRow.getCell(COL_TOT).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF92400E'}};

          ws.views=[{state:'frozen',ySplit:1,activeCell:'A2'}];

          // 데이터 행
          finalRanked.forEach((r,i)=>{
            const sl=r.screening?.status==='실기기검증적합'?'PP':r.screening?.status==='적합예상'?'P':'N';
            const evScores=evSorted.map(name=>{
              const ev=Object.values(r.evals).find(e=>fixEvName(e.name??'')===name);
              return ev?Math.round((ev.c1+ev.c2+ev.c3)*10)/10:'';
            });
            // SC_KEYS로 r.bs 조회 (영문 키)
            const rowData=['',i+1,r.name,r.caregiver||'',r.phone,sl,
              ...SC_KEYS.map(k=>r.bs?.[k]??0),r.appTotal,...evScores,
              r.qualTotal||'',r.finalTotal];
            const dRow=ws.addRow(rowData);
            dRow.height=20;
            dRow.eachCell({includeEmpty:true},(cell,ci)=>{
              cell.alignment={horizontal:'center',vertical:'middle'};
              cell.font={size:10};
              if(i%2===1&&ci!==1) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF9FAFB'}};
            });
            dRow.getCell(3).alignment={horizontal:'left',vertical:'middle'};
            dRow.getCell(4).alignment={horizontal:'left',vertical:'middle'};
            dRow.getCell(3).font={bold:true,size:10};
            const slCell=dRow.getCell(6);
            if(sl==='PP') slCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFD1FAE5'}};
            else if(sl==='P') slCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDBEAFE'}};
            dRow.getCell(COL_APP).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFEF9C3'}};
            dRow.getCell(COL_APP).font={bold:true,size:10};
            const ftCell=dRow.getCell(COL_TOT);
            if(r.finalTotal>0){ftCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFDE68A'}};ftCell.font={bold:true,size:11};}
            const qaCell=dRow.getCell(COL_AVG);
            if(r.qualTotal) qaCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3E8FF'}};
            // 전송완료 열: 연두 배경 + 드롭다운
            dRow.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0FFF4'}};
            dRow.getCell(1).dataValidation={type:'list',allowBlank:true,formulae:['"✓,-"'],showErrorMessage:false};
          });

          const buf=await wb.xlsx.writeBuffer();
          const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download='모스픽_최종순위.xlsx'; a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <div style={{ padding:'10px 20px',borderBottom:'1px solid #F2F2F7',background:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <span style={{ fontSize:12,color:'#8E8E93' }}>종합 상위 40명 기준 · 정성평가 합산 재정렬</span>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={exportExcel}
                  style={{ padding:'6px 14px',borderRadius:8,border:'none',background:'#1A8C3A',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  📊 엑셀 추출
                </button>
                <button onClick={()=>setFinalUnlocked(false)} style={{ fontSize:11,color:'#8E8E93',background:'none',border:'none',cursor:'pointer',fontFamily:F }}>잠금</button>
              </div>
            </div>
            <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
              <table style={{ width:'100%',minWidth:'max-content',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                    {['순위','환우명','보호자','연락처','스크리닝',...F_COLS,'신청서합계','정성평가','최종합계'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finalRanked.length===0&&<tr><td colSpan={14} style={{ padding:60,textAlign:'center',color:'#C7C7CC' }}>데이터를 불러오면 순위가 표시됩니다</td></tr>}
                  {(() => {
                    // 심층인터뷰 매칭: scheduleBookings 연락처/이름 → callNotes
                    const getCallNote = (entry: typeof finalRanked[0]) => {
                      const phone = normalizePhone(entry.phone);
                      for (const [slotId, bk] of Object.entries(scheduleBookings)) {
                        if ((phone && normalizePhone(bk.contactPhone)===phone) || bk.patientName===entry.name) {
                          return callNotes[slotId] ?? null;
                        }
                      }
                      return null;
                    };
                    return finalRanked.map((e,i)=>{
                    const isTop20=i<20;
                    const cat=e.screening?statusCatF(e.screening.status):null;
                    const catStyle=cat==='PP'?{bg:'#D4F5DF',color:'#1A8C3A'}:cat==='P'?{bg:'#E3F2FF',color:'#0071E3'}:cat?{bg:'#F2F2F7',color:'#8E8E93'}:null;
                    const hasQual=e.qualTotal>0;
                    const note=getCallNote(e);
                    const hasInterview=!!note;
                    const isExcludedFinal = excludedKeys.has(e.key);
                    const rawResult=note?.overallResult==='애매함'?'일단보류':note?.overallResult;
                    const result = isExcludedFinal ? undefined : rawResult;
                    const rowBg = isExcludedFinal ? 'rgba(255,59,48,0.04)' : result==='적합' ? '#D4F5DF' : result==='일단보류' ? '#FFF9D4' : result==='부적합' ? '#FFE0DE' : isTop20 ? 'rgba(0,0,0,0.015)' : 'transparent';
                    return (
                      <tr key={e.key} style={{ borderTop:i>0?'1px solid #F7F7F9':'none', background:rowBg }}>
                        <td style={{ padding:'12px 14px',textAlign:'center',fontWeight:isTop20?700:400,color:isTop20?'#1C1C1E':'#8E8E93',fontSize:isTop20?14:13 }}>{i+1}</td>
                        <td style={{ padding:'12px 14px',fontWeight:600,color:'#000',whiteSpace:'nowrap' }}>
                          {isExcludedFinal && (
                            <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#FFE0DE',color:'#CC2200',fontWeight:700,verticalAlign:'middle' }}>✕ 제외</span>
                          )}
                          {isTop20 && !hasInterview && (
                            <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#FFF0D4',color:'#CC7000',fontWeight:700,verticalAlign:'middle' }}>인터뷰 미완료</span>
                          )}
                          {result && (
                            <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,fontWeight:700,verticalAlign:'middle',
                              background:result==='적합'?'#D4F5DF':result==='일단보류'?'#FFF9D4':'#FFE0DE',
                              color:result==='적합'?'#1A8C3A':result==='일단보류'?'#B07800':'#CC2200' }}>
                              {result==='적합'?'✅ 적합':result==='일단보류'?'⏸ 일단보류':'❌ 부적합'}
                            </span>
                          )}
                          {hasInterview && !result && (
                            <span style={{ marginRight:5,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#F2F2F7',color:'#8E8E93',fontWeight:600,verticalAlign:'middle' }}>인터뷰 완료</span>
                          )}
                          {e.name}
                        </td>
                        <td style={{ padding:'12px 14px',color:'#3C3C43',fontSize:12,whiteSpace:'nowrap' }}>{e.caregiver||'-'}</td>
                        <td style={{ padding:'12px 14px',color:'#8E8E93',fontSize:12,whiteSpace:'nowrap' }}>{e.phone}</td>
                        <td style={{ padding:'8px 14px' }}>
                          {catStyle
                            ? <span style={{ fontSize:12,fontWeight:700,padding:'2px 10px',borderRadius:20,background:catStyle.bg,color:catStyle.color }}>{cat}</span>
                            : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                        </td>
                        {F_KEYS.map(k=>{
                          const v=e.bs?.[k]??0;
                          return <td key={k} style={{ padding:'8px 14px',textAlign:'center' as const }}>
                            <span style={{ fontSize:11,fontWeight:600,color:v>0?'#1A8C3A':'#C7C7CC' }}>{e.bs?v>0?`+${v}`:'0':'-'}</span>
                          </td>;
                        })}
                        <td style={{ padding:'12px 14px',textAlign:'right' as const }}>
                          <span style={{ fontSize:13,fontWeight:600,color:'#3C3C43' }}>{e.appTotal}</span>
                          <span style={{ fontSize:10,color:'#C7C7CC',marginLeft:2 }}>/50</span>
                        </td>
                        <td style={{ padding:'12px 14px',textAlign:'right' as const }}>
                          {hasQual
                            ? <><span style={{ fontSize:13,fontWeight:600,color:'#7C3AED' }}>{e.qualTotal}</span><span style={{ fontSize:10,color:'#C7C7CC',marginLeft:2 }}>/60</span></>
                            : <span style={{ color:'#C7C7CC',fontSize:11 }}>미평가</span>}
                        </td>
                        <td style={{ padding:'12px 14px',textAlign:'right' as const }}>
                          <span style={{ fontSize:16,fontWeight:700,color:'#1C1C1E' }}>{e.finalTotal}</span>
                          <span style={{ fontSize:10,color:'#8E8E93',marginLeft:2 }}>/110</span>
                        </td>
                      </tr>
                    );
                  });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {/* 대여 관리대장 탭 */}
      {activeView === 'loan' && (() => {
        if (!finalUnlocked) return (
          <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#F7F7F9' }}>
            <div style={{ background:'#fff',borderRadius:16,padding:'40px 36px',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',width:320,textAlign:'center' }}>
              <p style={{ fontSize:20,fontWeight:700,color:'#1C1C1E',marginBottom:8 }}>📦 대여 관리대장</p>
              <p style={{ fontSize:13,color:'#8E8E93',marginBottom:24 }}>관리자 비밀번호를 입력해주세요</p>
              <input type="password" value={finalPw} onChange={e=>setFinalPw(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ if(finalPw===QUAL_VIEW_PW){setFinalUnlocked(true);setFinalPw('');}else alert('비밀번호가 틀렸습니다.'); }}}
                placeholder="비밀번호"
                style={{ width:'100%',padding:'11px 14px',border:'1.5px solid #E5E5EA',borderRadius:10,fontSize:14,outline:'none',fontFamily:F,boxSizing:'border-box' as const,marginBottom:12,textAlign:'center' as const }} />
              <button onClick={()=>{ if(finalPw===QUAL_VIEW_PW){setFinalUnlocked(true);setFinalPw('');}else alert('비밀번호가 틀렸습니다.');}}
                style={{ width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#1C1C1E',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                확인
              </button>
            </div>
          </div>
        );

        const rows = _finalSelected.map((e, i) => {
          const docId = e.key.replace(/\//g,'_');
          const loan = equipmentLoans[docId] ?? {};
          const app = applications.find(a => {
            const p = normalizePhone(a.contactPhone ?? '');
            const ep = normalizePhone(e.phone);
            if (p && ep && p === ep) return true;
            return normalizeStr(a.patientName ?? '') === normalizeStr(e.name ?? '');
          });
          const address = loan.address || app?.address || '';
          const units = loan.units ?? {};
          let sentCount = 0;
          PACKAGE_ITEMS.forEach(item => {
            for (let idx=0; idx<item.qty; idx++) { if (units[`${item.id}_${idx}`]?.sent) sentCount++; }
          });
          return { key:e.key, docId, name:e.name, caregiver:e.caregiver, phone:e.phone, loan, address, units, sentCount, rank:i+1 };
        });

        const exportLoanExcel = async () => {
          const ExcelJS = (await import('exceljs')).default;
          const wb = new ExcelJS.Workbook();
          const ws = wb.addWorksheet('대여 관리대장');
          const unitCols = PACKAGE_ITEMS.flatMap(item => Array.from({length:item.qty}, (_,idx) => item.qty>1?`${item.label}${idx+1}`:item.label));
          const headers = ['관리번호','환우명','보호자','연락처','주소',...unitCols,'발송현황','비고'];
          ws.columns = [{width:14},{width:12},{width:10},{width:15},{width:26},...unitCols.map(()=>({width:14})),{width:12},{width:20}];
          ws.views=[{state:'frozen',ySplit:1,activeCell:'A2'}];
          const hRow = ws.addRow(headers);
          hRow.height = 22;
          hRow.eachCell({includeEmpty:true},(cell)=>{
            cell.font={bold:true,color:{argb:'FFFFFFFF'},size:10};
            cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1C1C1E'}};
            cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
          });
          rows.forEach((r,i)=>{
            const unitVals = PACKAGE_ITEMS.flatMap(item => Array.from({length:item.qty}, (_,idx) => {
              const u = r.units[`${item.id}_${idx}`];
              return u?.serial ? u.serial : (u?.sent ? '발송완료' : '');
            }));
            const rowData = [r.loan.managementNumber||'',r.name,r.caregiver||'',r.phone,r.address||'',...unitVals,`${r.sentCount}/${TOTAL_UNITS}`,r.loan.memo||''];
            const row = ws.addRow(rowData);
            row.height=19;
            row.eachCell({includeEmpty:true},(cell)=>{
              cell.font={size:10};
              cell.alignment={horizontal:'center',vertical:'middle'};
              if (i%2===1) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF9FAFB'}};
            });
            row.getCell(2).alignment={horizontal:'left',vertical:'middle'};
            row.getCell(5).alignment={horizontal:'left',vertical:'middle'};
            if (r.sentCount===TOTAL_UNITS) row.getCell(headers.indexOf('발송현황')+1).font={bold:true,color:{argb:'FF1A8C3A'},size:10};
          });
          const buf = await wb.xlsx.writeBuffer();
          const blob = new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
          const url = URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download='모스픽_대여관리대장.xlsx'; a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <div style={{ padding:'10px 20px',borderBottom:'1px solid #F2F2F7',background:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <span style={{ fontSize:12,color:'#8E8E93' }}>최종 인터뷰 적합 판정자 {rows.length}명 · 아이패드·침대거치대·의자거치대·IoT플러그3·충전기헤드·충전기선·조명2 패키지 대여</span>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={exportLoanExcel}
                  style={{ padding:'6px 14px',borderRadius:8,border:'none',background:'#1A8C3A',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  📊 엑셀 추출
                </button>
                <button onClick={()=>setFinalUnlocked(false)} style={{ fontSize:11,color:'#8E8E93',background:'none',border:'none',cursor:'pointer',fontFamily:F }}>잠금</button>
              </div>
            </div>
            <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
              <table style={{ width:'100%',minWidth:'max-content',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                    {['#','관리번호','환우명','보호자','연락처','주소','발송현황','비고',''].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length===0 && <tr><td colSpan={9} style={{ padding:60,textAlign:'center',color:'#C7C7CC' }}>최종 인터뷰 적합 판정자가 없습니다</td></tr>}
                  {rows.flatMap(r => {
                    const expanded = expandedLoanKey === r.key;
                    const allSent = r.sentCount===TOTAL_UNITS;
                    const mainRow = (
                      <tr key={r.key} onClick={()=>setExpandedLoanKey(k=>k===r.key?null:r.key)}
                        style={{ cursor:'pointer', borderTop:r.rank>1?'1px solid #F7F7F9':'none', background:expanded?'#FAFAFA':'transparent' }}>
                        <td style={{ padding:'12px 14px',color:'#8E8E93',fontSize:12 }}>{r.rank}</td>
                        <td style={{ padding:'12px 14px',fontWeight:700,color:'#1C1C1E',whiteSpace:'nowrap' }}>{r.loan.managementNumber || '배정 중…'}</td>
                        <td style={{ padding:'12px 14px',fontWeight:600,color:'#000',whiteSpace:'nowrap' }}>{r.name}</td>
                        <td style={{ padding:'12px 14px',color:'#3C3C43',fontSize:12,whiteSpace:'nowrap' }}>{r.caregiver||'-'}</td>
                        <td style={{ padding:'12px 14px',color:'#8E8E93',fontSize:12,whiteSpace:'nowrap' }}>{r.phone}</td>
                        <td style={{ padding:'12px 14px',color:'#3C3C43',fontSize:12,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis' }}>{r.address||'-'}</td>
                        <td style={{ padding:'8px 14px' }}>
                          <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:allSent?'#D4F5DF':r.sentCount>0?'#FFF9D4':'#F2F2F7',color:allSent?'#1A8C3A':r.sentCount>0?'#B07800':'#8E8E93' }}>
                            {r.sentCount}/{TOTAL_UNITS}{allSent?' 발송완료':''}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px',color:'#8E8E93',fontSize:12,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis' }}>{r.loan.memo||''}</td>
                        <td style={{ padding:'12px 14px',color:'#C7C7CC',fontSize:11 }}>{expanded?'▲':'▼'}</td>
                      </tr>
                    );
                    if (!expanded) return [mainRow];
                    const detailRow = (
                      <tr key={r.key+'-detail'}>
                        <td colSpan={9} style={{ padding:0,background:'#FAFAFA',borderBottom:'1px solid #F2F2F7' }}>
                          <div style={{ padding:'16px 24px' }}>
                            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,background:'#fff',borderRadius:10,overflow:'hidden' }}>
                              <thead>
                                <tr style={{ background:'#F2F2F7' }}>
                                  {['품목','유닛','시리얼번호','발송여부','발송일'].map(h=>(
                                    <th key={h} style={{ padding:'8px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,fontSize:11 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {PACKAGE_ITEMS.flatMap(item => Array.from({length:item.qty}, (_,idx) => {
                                  const unitKey = `${item.id}_${idx}`;
                                  const u = r.units[unitKey] ?? {};
                                  return (
                                    <tr key={unitKey} style={{ borderTop:'1px solid #F2F2F7' }}>
                                      <td style={{ padding:'7px 12px',fontWeight:500,color:'#1C1C1E' }}>{item.label}</td>
                                      <td style={{ padding:'7px 12px',color:'#8E8E93' }}>{item.qty>1?`#${idx+1}`:'-'}</td>
                                      <td style={{ padding:'7px 12px' }}>
                                        <input defaultValue={u.serial||''} placeholder="시리얼번호"
                                          onBlur={ev=>saveLoanUnit(r.docId, unitKey, {serial:ev.target.value})}
                                          style={{ width:140,padding:'5px 8px',border:'1.5px solid #E5E5EA',borderRadius:6,fontSize:12,outline:'none',fontFamily:F }} />
                                      </td>
                                      <td style={{ padding:'7px 12px' }}>
                                        <input type="checkbox" checked={!!u.sent}
                                          onChange={ev=>saveLoanUnit(r.docId, unitKey, { sent: ev.target.checked, sentDate: ev.target.checked ? (u.sentDate || new Date().toISOString().slice(0,10)) : u.sentDate })}
                                          style={{ width:14,height:14,cursor:'pointer' }} />
                                      </td>
                                      <td style={{ padding:'7px 12px' }}>
                                        <input type="date" defaultValue={u.sentDate||''}
                                          onBlur={ev=>saveLoanUnit(r.docId, unitKey, {sentDate:ev.target.value})}
                                          style={{ padding:'5px 8px',border:'1.5px solid #E5E5EA',borderRadius:6,fontSize:12,outline:'none',fontFamily:F }} />
                                      </td>
                                    </tr>
                                  );
                                }))}
                              </tbody>
                            </table>
                            <div style={{ marginTop:12,display:'flex',gap:12 }}>
                              <input placeholder="주소" defaultValue={r.address}
                                onBlur={ev=>saveLoanField(r.docId, {address:ev.target.value})}
                                style={{ flex:1,padding:'8px 12px',border:'1.5px solid #E5E5EA',borderRadius:8,fontSize:12,outline:'none',fontFamily:F }} />
                              <input placeholder="비고" defaultValue={r.loan.memo||''}
                                onBlur={ev=>saveLoanField(r.docId, {memo:ev.target.value})}
                                style={{ flex:1,padding:'8px 12px',border:'1.5px solid #E5E5EA',borderRadius:8,fontSize:12,outline:'none',fontFamily:F }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                    return [mainRow, detailRow];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {/* 일정 탭 */}
      {activeView === 'schedule' && (() => {
        const SLOTS: Record<string, string[]> = {
          '2026-06-29': ['09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45','11:00','11:15'],
          '2026-06-30': ['09:45','10:00','10:15','10:30','10:45','11:00','11:15','13:30','13:45','14:00','14:15','14:30','14:45','15:00','15:15','15:30','15:45'],
          '2026-07-01': ['10:00','10:15'],
          '2026-07-02': ['11:00','13:15','13:30','14:00'],
        };
        const BLOCKED_ADMIN = new Set(['20260629-1530','20260629-1630']);
        const DATE_LABELS: Record<string, string> = { '2026-06-29': '6/29 (월)', '2026-06-30': '6/30 (화)', '2026-07-01': '7/1 (수)', '2026-07-02': '7/2 (목)' };
        const slotKey = (date: string, time: string) => `${date.replace(/-/g,'')}-${time.replace(':','')}`;
        const totalBooked = Object.values(scheduleBookings).length;
        const totalSlots = Object.values(SLOTS).reduce((s,v)=>s+v.length,0);
        const completedCount = Object.values(callNotes).filter(n=>n.completed).length;

        const cancelSlot = async (id: string) => {
          if (!confirm('이 예약을 취소하시겠습니까?')) return;
          const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
          await deleteDoc(firestoreDoc(db, 'schedule_slots', id));
        };

        const openScript = (slotId: string) => {
          callTimerRef.current && clearInterval(callTimerRef.current);
          setCallDraft(callNotes[slotId] || {});
          setCallStep(0);
          setCallTimer(900);
          setCallTimerRunning(false);
          setCallScriptSlot(slotId);
        };

        // 예약된 슬롯 목록 (시간순)
        const bookedSlots = Object.entries(SLOTS).flatMap(([date, times]) =>
          times.map(time => ({ id: slotKey(date, time), date, time, dateLabel: DATE_LABELS[date] }))
        ).filter(s => scheduleBookings[s.id]);

        return (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <div style={{ padding:'12px 24px',borderBottom:'1px solid #F2F2F7',background:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ fontSize:13,fontWeight:600,color:'#1C1C1E' }}>면담 일정 신청 현황</span>
                <span style={{ fontSize:12,color:'#8E8E93' }}>{totalBooked}/{totalSlots} 예약</span>
                <span style={{ fontSize:12,color:'#1A8C3A',fontWeight:600 }}>통화완료 {completedCount}/{totalBooked}</span>
              </div>
              <a href="/schedule" target="_blank"
                style={{ fontSize:12,fontWeight:600,padding:'6px 12px',borderRadius:8,background:'#1C1C1E',color:'#fff',textDecoration:'none' }}>
                신청 링크 열기 ↗
              </a>
            </div>
            <div style={{ flex:1,overflow:'auto',background:'#F7F7F9',padding:20 }}>
              {/* 슬롯 그리드 */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:900,marginBottom:24 }}>
                {Object.entries(SLOTS).map(([date, times])=>(
                  <div key={date} style={{ background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ padding:'12px 16px',borderBottom:'1px solid #F2F2F7',background:'#FAFAFA' }}>
                      <span style={{ fontSize:14,fontWeight:700,color:'#1C1C1E' }}>{DATE_LABELS[date]}</span>
                      <span style={{ fontSize:11,color:'#8E8E93',marginLeft:8 }}>{times.filter(t=>scheduleBookings[slotKey(date,t)]).length}/{times.length}</span>
                    </div>
                    {times.map(time=>{
                      const id=slotKey(date,time);
                      const b=scheduleBookings[id];
                      const note=callNotes[id];
                      return (
                        <div key={time} style={{ padding:'9px 16px',borderBottom:'1px solid #F7F7F9',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0 }}>
                            <span style={{ fontSize:13,fontWeight:600,color:'#1C1C1E',width:40,flexShrink:0 }}>{time}</span>
                            {BLOCKED_ADMIN.has(id)&&!b
                              ? <span style={{ fontSize:11,color:'#CC7000',background:'#FFF0D4',padding:'1px 7px',borderRadius:20,fontWeight:600 }}>차단</span>
                              : b ? <>
                                  {note?.completed && <span style={{ fontSize:12 }}>✅</span>}
                                  <span style={{ fontSize:13,color:'#000',fontWeight:500 }}>{b.patientName}</span>
                                  {b.caregiverName&&<span style={{ fontSize:11,color:'#8E8E93' }}>({b.caregiverName})</span>}
                                  {b.meetingType&&<span style={{ fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:20,background:b.meetingType==='kakao'?'#FFF0D4':'#E3F2FF',color:b.meetingType==='kakao'?'#CC7000':'#0071E3' }}>
                                    {b.meetingType==='kakao'?'카카오':'ZOOM'}
                                  </span>}
                                </>
                              : <span style={{ fontSize:11,color:'#C7C7CC' }}>미신청</span>}
                          </div>
                          <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                            {b && <button onClick={()=>openScript(id)}
                              style={{ fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:7,border:'none',cursor:'pointer',fontFamily:F,
                                background: note?.completed ? '#D4F5DF' : '#E3F2FF',
                                color: note?.completed ? '#1A8C3A' : '#0071E3' }}>
                              {note?.completed ? '✅ 완료' : '📞 심층인터뷰'}
                            </button>}
                            {b && <button onClick={()=>cancelSlot(id)}
                              style={{ fontSize:11,color:'#FF3B30',background:'none',border:'none',cursor:'pointer',fontFamily:F }}>취소</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 통화 기록 요약 */}
              {bookedSlots.length > 0 && (
                <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',maxWidth:900 }}>
                  <div style={{ padding:'12px 16px',borderBottom:'1px solid #F2F2F7',background:'#FAFAFA',fontSize:13,fontWeight:700,color:'#1C1C1E' }}>
                    통화 기록 요약 <span style={{ fontSize:11,fontWeight:400,color:'#8E8E93' }}>— 행 클릭 시 상세 내용 확인</span>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#F7F7F9' }}>
                          {['시간','환우','전체 평가','사용 의사 ⭐','눈 깜빡임','설치 담당','온보딩 시간','상태',''].map(h=>(
                            <th key={h} style={{ padding:'8px 10px',textAlign:'left',fontWeight:600,color:'#8E8E93',borderBottom:'1px solid #F2F2F7',whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bookedSlots.map(({id, dateLabel, time})=>{
                          const b=scheduleBookings[id];
                          const n=callNotes[id];
                          const isExpanded=expandedNote===id;
                          const wantsBg = n?.patientWants?.includes('원함') ? '#D4F5DF' : n?.patientWants?.includes('원하지') ? '#FFE0DE' : '#FFF9D4';
                          const wantsColor = n?.patientWants?.includes('원함') ? '#1A8C3A' : n?.patientWants?.includes('원하지') ? '#CC2200' : '#B07800';
                          return (<>
                            <tr key={id} onClick={()=>setExpandedNote(isExpanded?null:id)}
                              style={{ borderBottom: isExpanded?'none':'1px solid #F7F7F9',cursor:'pointer',background:isExpanded?'#FAFFF9':'#fff' }}>
                              <td style={{ padding:'9px 10px',whiteSpace:'nowrap',color:'#8E8E93',fontSize:11 }}>{dateLabel} {time}</td>
                              <td style={{ padding:'9px 10px',fontWeight:700,color:'#1C1C1E' }}>{b.patientName}<br/><span style={{ fontSize:11,fontWeight:400,color:'#8E8E93' }}>{b.caregiverName||''}</span></td>
                              <td style={{ padding:'9px 10px' }}>
                                {n?.overallResult ? <span style={{ padding:'3px 10px',borderRadius:10,fontSize:12,fontWeight:700,
                                  background: n.overallResult==='적합'?'#D4F5DF':(n.overallResult==='일단보류'||n.overallResult==='애매함')?'#FFF9D4':'#FFE0DE',
                                  color: n.overallResult==='적합'?'#1A8C3A':(n.overallResult==='일단보류'||n.overallResult==='애매함')?'#B07800':'#CC2200'
                                }}>{n.overallResult==='애매함'?'일단보류':n.overallResult}</span> : <span style={{ color:'#C7C7CC' }}>-</span>}
                              </td>
                              <td style={{ padding:'9px 10px' }}>
                                {n?.patientWants ? <span style={{ padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700,background:wantsBg,color:wantsColor }}>{n.patientWants}</span> : <span style={{ color:'#C7C7CC' }}>-</span>}
                              </td>
                              <td style={{ padding:'9px 10px' }}>
                                {n?.blink ? <span style={{ padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600,
                                  background: n.blink.includes('구분') ? '#D4F5DF' : n.blink.includes('어려') ? '#FFE0DE' : '#FFF9D4',
                                  color: n.blink.includes('구분') ? '#1A8C3A' : n.blink.includes('어려') ? '#CC2200' : '#B07800'
                                }}>{n.blink}</span> : <span style={{ color:'#C7C7CC' }}>-</span>}
                              </td>
                              <td style={{ padding:'9px 10px',fontSize:11,color:'#444' }}>{n?.installPerson||'-'}</td>
                              <td style={{ padding:'9px 10px',fontSize:11,color:'#444' }}>{n?.scheduleTime||'-'}</td>
                              <td style={{ padding:'9px 10px' }}>
                                <span style={{ padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:600,
                                  background: n?.completed ? '#D4F5DF' : n?.patientWants ? '#FFF9D4' : '#F2F2F7',
                                  color: n?.completed ? '#1A8C3A' : n?.patientWants ? '#B07800' : '#8E8E93' }}>
                                  {n?.completed ? '✅ 완료' : n?.patientWants ? '📝 진행중' : '미시작'}
                                </span>
                              </td>
                              <td style={{ padding:'9px 10px' }}>
                                <span style={{ fontSize:11,color:'#8E8E93' }}>{isExpanded?'▲':'▼'}</span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={id+'-detail'} style={{ borderBottom:'1px solid #F2F2F7',background:'#FAFFF9' }}>
                                <td colSpan={8} style={{ padding:'0 10px 14px 10px' }}>
                                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,paddingTop:10 }}>
                                    {[
                                      ['환우', b.patientName],
                                      ['보호자', b.caregiverName||'-'],
                                      ['연락처', b.contactPhone],
                                      ['사용 의사', n?.patientWants||'-'],
                                      ['의사 메모', n?.patientWantsNote||'-'],
                                      ['보호자 동의', n?.consent||'-'],
                                      ['눈 깜빡임', n?.blink||'-'],
                                      ['깜빡임 메모', n?.blinkNote||'-'],
                                      ['위치', n?.location||'-'],
                                      ['자세', n?.posture||'-'],
                                      ['와이파이', n?.wifi||'-'],
                                      ['기술 역량', n?.tech||'-'],
                                      ['기기', n?.deviceNote||'-'],
                                      ['니즈', n?.goal||'-'],
                                      ['니즈 메모', n?.goalNote||'-'],
                                      ['설치 담당', n?.installPerson||'-'],
                                      ['설치 메모', n?.installNote||'-'],
                                      ['온보딩 시간', n?.scheduleTime||'-'],
                                      ['일정 메모', n?.scheduleNote||'-'],
                                      ['연락 수단', n?.contactNote||'-'],
                                      ['특이사항', n?.specialNote||'-'],
                                    ].map(([label,val])=>(
                                      <div key={label} style={{ background:'#fff',border:'1px solid #E4E2DC',borderRadius:8,padding:'8px 10px' }}>
                                        <div style={{ fontSize:10,color:'#8E8E93',fontWeight:600,marginBottom:2 }}>{label}</div>
                                        <div style={{ fontSize:12,color:'#1A1916',lineHeight:1.5 }}>{val}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ marginTop:10,display:'flex',gap:8 }}>
                                    <button onClick={e=>{e.stopPropagation();openScript(id);}}
                                      style={{ fontSize:12,fontWeight:600,padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:F,background:'#2D5F8A',color:'#fff' }}>
                                      📞 심층인터뷰 열기
                                    </button>
                                    {n?.completedAt && <span style={{ fontSize:11,color:'#8E8E93',alignSelf:'center' }}>완료: {new Date(n.completedAt).toLocaleString('ko-KR')}</span>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 심층인터뷰 모달 */}
      {callScriptSlot && (() => {
        const slotId = callScriptSlot;
        const booking = scheduleBookings[slotId];
        const STEPS = [
          { badge:'PREP', title:'통화 전 준비' },
          { badge:'OPEN', title:'인사 & 소개' },
          { badge:'CORE', title:'사용 의사 확인' },
          { badge:'INFO', title:'환경 파악' },
          { badge:'NEED', title:'니즈 파악' },
          { badge:'CLOSE', title:'설치 & 마무리' },
        ];

        const upd = (patch: Partial<CallNote>) => setCallDraft(d => ({...d, ...patch}));

        // chip: 인라인 span (컴포넌트 정의 금지 — 매 렌더마다 재정의되면 리마운트 발생)
        const chip = (label: string, field: keyof CallNote, val: string) => (
          <span key={val} onClick={()=>upd({[field]: callDraft[field]===val?'':val})}
            style={{ display:'inline-block',padding:'5px 12px',borderRadius:20,fontSize:12,cursor:'pointer',border:'1.5px solid',
              borderColor: callDraft[field]===val ? '#2D5F8A' : '#E4E2DC',
              background: callDraft[field]===val ? '#EBF2F8' : '#fff',
              color: callDraft[field]===val ? '#2D5F8A' : '#6B6860',
              fontWeight: callDraft[field]===val ? 600 : 400 }}>
            {label}
          </span>
        );
        // textarea: defaultValue+onBlur 방식 — controlled value를 쓰면 매 렌더마다 리마운트되어 한 글자만 입력됨
        const taStyle: React.CSSProperties = { width:'100%',marginTop:6,padding:'8px 10px',border:'1.5px solid #E4E2DC',borderRadius:8,fontFamily:F,fontSize:13,resize:'vertical',minHeight:52,outline:'none',background:'#F7F6F3',lineHeight:1.6 };
        const ta = (field: keyof CallNote, placeholder: string) => (
          <textarea key={slotId+field} defaultValue={(callDraft[field] as string)||''}
            onBlur={e=>upd({[field]:e.target.value})} placeholder={placeholder} style={taStyle} />
        );

        const handleSave = async (complete?: boolean) => {
          const note: CallNote = {...callDraft, ...(complete ? {completed:true, completedAt: new Date().toISOString()} : {})};
          await setDoc(doc(db, 'call_notes', slotId), note, {merge:true});
          setCallNotes(prev => ({...prev, [slotId]: note}));
          if (complete) { callTimerRef.current && clearInterval(callTimerRef.current); setCallScriptSlot(null); }
        };

        const toggleTimer = () => {
          if (callTimerRunning) {
            callTimerRef.current && clearInterval(callTimerRef.current);
            setCallTimerRunning(false);
          } else {
            setCallTimerRunning(true);
            callTimerRef.current = setInterval(() => {
              setCallTimer(t => { if(t<=1){clearInterval(callTimerRef.current!);setCallTimerRunning(false);return 0;} return t-1; });
            }, 1000);
          }
        };

        const mm = String(Math.floor(callTimer/60)).padStart(2,'0');
        const ss = String(callTimer%60).padStart(2,'0');

        const scriptBox = (text: React.ReactNode) => (
          <div style={{ background:'#EBF2F8',borderLeft:'3px solid #2D5F8A',borderRadius:'0 8px 8px 0',padding:'12px 14px',marginBottom:12,fontSize:14,lineHeight:1.8 }}>
            <div style={{ fontSize:10,fontWeight:700,color:'#2D5F8A',marginBottom:4,letterSpacing:'0.5px' }}>📞 가온</div>
            {text}
          </div>
        );
        const noteBox = (text: string) => (
          <div style={{ background:'#FDF0EA',borderLeft:'3px solid #C0522A',borderRadius:'0 8px 8px 0',padding:'10px 14px',fontSize:12,color:'#C0522A',marginBottom:10 }}>⚠️ {text}</div>
        );
        const tipBox = (text: string) => (
          <div style={{ background:'#EAF5F0',borderLeft:'3px solid #2E7D5E',borderRadius:'0 8px 8px 0',padding:'10px 14px',fontSize:12,color:'#2E7D5E',marginBottom:10 }}>💡 {text}</div>
        );

        return (
          <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ background:'#F7F6F3',width:'min(740px,96vw)',height:'90vh',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>

              {/* 헤더 */}
              <div style={{ background:'#2D5F8A',color:'#fff',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:700 }}>모스픽 온보딩 심층인터뷰</div>
                  <div style={{ fontSize:12,opacity:0.75,marginTop:2 }}>
                    {booking?.patientName} / {booking?.caregiverName||'보호자'} · {booking?.contactPhone}
                    {booking?.meetingType && <span style={{ marginLeft:8,background:'rgba(255,255,255,0.2)',padding:'1px 7px',borderRadius:20,fontSize:11 }}>
                      {booking.meetingType==='kakao'?'카카오 영상':'ZOOM'}
                    </span>}
                  </div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div onClick={toggleTimer} style={{ background:'rgba(255,255,255,0.15)',border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:10,padding:'8px 14px',textAlign:'center',cursor:'pointer',minWidth:80 }}>
                    <div style={{ fontSize:20,fontWeight:700,fontVariantNumeric:'tabular-nums',letterSpacing:1 }}>{mm}:{ss}</div>
                    <div style={{ fontSize:10,opacity:0.7,marginTop:1 }}>{callTimerRunning?'⏸ 정지':'▶ 시작'}</div>
                  </div>
                  <button onClick={()=>{callTimerRef.current&&clearInterval(callTimerRef.current);setCallScriptSlot(null);}}
                    style={{ background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                </div>
              </div>

              {/* 단계 탭 */}
              <div style={{ display:'flex',background:'#fff',borderBottom:'1px solid #E4E2DC',flexShrink:0,overflowX:'auto' }}>
                {STEPS.map((s,i)=>(
                  <button key={i} onClick={()=>setCallStep(i)}
                    style={{ flex:1,padding:'10px 4px',border:'none',borderBottom: callStep===i?'3px solid #2D5F8A':i<callStep?'3px solid #2E7D5E':'3px solid transparent',
                      background:'none',cursor:'pointer',fontFamily:F,fontSize:11,fontWeight:600,whiteSpace:'nowrap',
                      color: callStep===i?'#2D5F8A':i<callStep?'#2E7D5E':'#9E9C96' }}>
                    {s.badge}
                  </button>
                ))}
              </div>

              {/* 단계 제목 */}
              <div style={{ padding:'10px 20px 0',flexShrink:0 }}>
                <span style={{ fontSize:11,fontWeight:700,color:'#fff',background:'#2D5F8A',padding:'2px 10px',borderRadius:20,marginRight:8 }}>{STEPS[callStep].badge}</span>
                <span style={{ fontSize:15,fontWeight:700,color:'#1A1916' }}>{STEPS[callStep].title}</span>
              </div>

              {/* 콘텐츠 */}
              <div style={{ flex:1,overflow:'auto',padding:'12px 20px 20px' }}>
                {callStep===0 && <>
                  {tipBox('통화 전 신청서에서 환자분 이름과 상태를 한 번 더 확인해두세요.')}
                  <div style={{ fontSize:13,color:'#1A1916',lineHeight:2 }}>
                    {'☐ 신청서 미리 열어두기 (환자 이름, 진단명, 현재 상태)'.split('\n').map((l,i)=><div key={i}>{l}</div>)}
                    <div>☐ 메모할 노트/메모앱 준비</div>
                    <div>☐ 카메라 각도·조명 확인</div>
                    <div>☐ 눈 깜빡임 안내 멘트 연습 — "살짝 감았다가 바로 떠보세요" / "살짝 감았다가 조금 있다가 떠보세요"</div>
                  </div>
                </>}

                {callStep===1 && <>
                  {scriptBox(<>
                    안녕하세요, 저는 모스픽 대표 한가온이라고 합니다.<br/>
                    오늘 바쁘신 와중에 시간 내주셔서 정말 감사드려요.<br/><br/>
                    저희 모스픽은 눈 깜빡임만으로 의사를 표현할 수 있는 앱을 만드는 팀이고요, 이번에 <strong>현대 아산나눔재단</strong>의 지원을 받아서 환우분들께 기기를 무상으로 대여해드리는 프로그램을 직접 진행하게 됐어요. 승일희망재단을 통해 연결이 됐고, {booking?.patientName} 어르신 신청서도 검토하게 됐습니다.<br/><br/>
                    오늘 통화는 15분 정도 예정이고요, 편하게 말씀해주시면 될 것 같아요.
                  </>)}
                  {tipBox('보호자분이 먼저 감사하다고 하시면 "저희가 더 감사하죠" 식으로 자연스럽게 받아주세요.')}
                </>}

                {callStep===2 && <>
                  {noteBox('가장 중요한 파트입니다. 환자분의 직접 의사를 눈 깜빡임으로 확인하세요.')}

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',marginBottom:8 }}>① 환자분 카메라 연결 요청</div>
                  {scriptBox(<>
                    혹시 지금 환자분이 옆에 계세요? 잠깐 카메라로 환자분을 비춰주실 수 있을까요? 직접 눈으로 뵙고 싶어서요.
                  </>)}

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'14px 0 8px' }}>② 눈 깜빡임 신호 연습</div>
                  {scriptBox(<>
                    어르신, 안녕하세요. 저는 모스픽 한가온이라고 해요.<br/><br/>
                    제가 간단하게 눈 동작 한 가지만 부탁드릴게요.<br/>
                    먼저, <strong>눈을 살짝 감았다가 바로 떠보세요.</strong> 네, 그렇게요.<br/>
                    이번엔 <strong>살짝 감았다가, 조금 있다가 떠보세요.</strong>
                  </>)}
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:10 }}>
                    {['✅ 짧게/길게 구분됨','⚠️ 약하지만 가능','⚠️ 속도가 느림','❌ 확인 어려움'].map(v=>chip(v,'blink',v))}
                  </div>
                  {ta('blinkNote','눈 깜빡임 관찰 메모 (예: 단신호는 가능, 장신호 구분이 약함 등)')}

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'16px 0 8px' }}>③ 사용 의사 직접 확인 ⭐ 핵심</div>
                  {scriptBox(<>
                    어르신, 저희 모스픽 앱을 써보고 싶으세요?<br/><br/>
                    <strong>써보고 싶으시면 눈을 짧게 한 번만 깜빡여 주세요.</strong><br/>
                    <strong>원하지 않으시면 눈을 여러 번 깜빡여 주세요.</strong>
                  </>)}
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:10 }}>
                    {['✅ 원함 (짧게 1번)','❌ 원하지 않음 (여러번)','⚠️ 환자 확인 불가','📋 보호자 대신 확인'].map(v=>chip(v,'patientWants',v))}
                  </div>
                  {ta('patientWantsNote','상황 메모 (예: 짧게 1번 깜빡임 확인, 반응이 느렸으나 의사 표현 확인 등)')}

                  {callDraft.patientWants?.includes('보호자') && <>
                    <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'14px 0 8px' }}>보호자 대신 확인 시</div>
                    {scriptBox('혹시 환자분께서 이 기기를 써보고 싶다는 의사를 표현하신 적이 있으신가요?')}
                    <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                      {['✅ 본인 의향 있다고 함','⚠️ 보호자 판단으로 신청','❌ 의사 미확인'].map(v=>chip(v,'consent',v))}
                    </div>
                  </>}

                  {(callDraft.patientWants?.includes('원하지 않음')) && (
                    <div style={{ background:'#FFE0DE',border:'1px solid #FFBFBA',borderRadius:10,padding:'12px 14px',marginTop:12,fontSize:13,color:'#CC2200',lineHeight:1.7 }}>
                      ⛔ 사용 의사 없음으로 확인됨. 통화를 마무리해주세요.<br/>
                      <span style={{ fontSize:12 }}>"네, 말씀해주셔서 감사합니다. 혹시 나중에 생각이 바뀌시면 언제든 연락 주세요."</span>
                    </div>
                  )}
                </>}

                {callStep===3 && <>
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>주로 계시는 공간</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:12 }}>
                    {['침실 (침대)','거실','요양시설/병원','이동 혼합'].map(v=>chip(v,'location',v))}
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>자세</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:12 }}>
                    {['주로 앉음','앉기도·눕기도','주로 누움','완전 와상'].map(v=>chip(v,'posture',v))}
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>와이파이</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:12 }}>
                    {['있음','없음','불안정'].map(v=>chip(v,'wifi',v))}
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>기술 역량 (보조자)</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:12 }}>
                    {['잘 하는 편','기본 수준','어려운 편'].map(v=>chip(v,'tech',v))}
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:4 }}>사용 중인 기기</div>
                  {ta('deviceNote','예: 갤럭시 탭, 아이패드 등')}
                </>}

                {callStep===4 && <>
                  {scriptBox('지금 환자분이 가장 답답하게 느끼시는 게 뭔지 아세요? 의사표현, 심심함, 다른 부분?')}
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>제일 먼저 써보고 싶은 기능</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
                    {['의사표현·대화','TV·IoT 제어','음악·콘텐츠','아직 모르겠음'].map(v=>chip(v,'goal',v))}
                  </div>
                  {ta('goalNote','핵심 니즈 메모')}
                </>}

                {callStep===5 && <>
                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',marginBottom:8 }}>① 설치 안내</div>
                  {scriptBox(<>
                    저희가 기기를 직접 방문해서 설치해드리는 게 아니라, <strong>설치에 필요한 기기와 부품을 먼저 택배로 보내드려요.</strong><br/><br/>
                    설치 자체는 어렵지 않아요. 거치대 조립이랑 콘센트 연결 정도거든요. 저희가 사진이랑 영상으로 안내드리고, 설치하시면서 궁금한 게 있으시면 영상통화로 같이 보면서 도와드릴 수 있어요.<br/><br/>
                    혹시 <strong>설치를 직접 도와주실 수 있는 분</strong>이 집에 계세요? 자녀분이나 주변에 손재주 있으신 분이요.
                  </>)}
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',marginBottom:6 }}>설치 담당 가능 여부</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
                    {['✅ 직접 가능','👨‍👩‍👧 가족이 도와줄 수 있음','⚠️ 어려울 것 같음','❓ 모르겠음'].map(v=>chip(v,'installPerson',v))}
                  </div>
                  {ta('installNote','설치 담당자 메모 (예: 아들이 주말에 와서 도와줄 수 있음)')}

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'16px 0 8px' }}>② 온보딩 통화 일정</div>
                  {scriptBox(<>
                    설치 완료하시면 저희랑 영상통화로 처음 사용 방법을 같이 설정해드릴 거예요. 30분 정도 걸리고요.<br/>
                    편하신 시간대가 언제쯤이세요?
                  </>)}
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
                    {['오전 (9–12시)','오후 (12–17시)','저녁 (17시 이후)','주말'].map(v=>chip(v,'scheduleTime',v))}
                  </div>
                  {ta('scheduleNote','구체적 날짜/시간 메모')}

                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',margin:'10px 0 4px' }}>연락 수단</div>
                  {ta('contactNote','예: 010-xxxx-xxxx 카카오톡 선호')}

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'16px 0 8px' }}>③ 전체 평가 결과</div>
                  <div style={{ display:'flex',gap:10,marginBottom:10 }}>
                    {[
                      {val:'적합', bg:'#D4F5DF', color:'#1A8C3A', border:'#1A8C3A'},
                      {val:'일단보류', bg:'#FFF9D4', color:'#B07800', border:'#B07800'},
                      {val:'부적합', bg:'#FFE0DE', color:'#CC2200', border:'#CC2200'},
                    ].map(({val,bg,color,border})=>(
                      <span key={val} onClick={()=>upd({overallResult: callDraft.overallResult===val?'':val})}
                        style={{ flex:1,textAlign:'center',padding:'10px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',border:'2px solid',
                          borderColor: callDraft.overallResult===val ? border : '#E4E2DC',
                          background: callDraft.overallResult===val ? bg : '#fff',
                          color: callDraft.overallResult===val ? color : '#9E9C96' }}>
                        {val}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize:13,fontWeight:700,color:'#1A1916',margin:'14px 0 8px' }}>④ 마무리</div>
                  {scriptBox(<>
                    오늘 정말 도움이 많이 됐어요. 감사합니다.<br/>
                    제가 일정 확정되면 문자/카카오로 먼저 안내드릴게요. 그 사이에 궁금하신 게 있으면 편하게 연락 주세요. 건강하게 잘 지내시고요!
                  </>)}
                  <div style={{ fontSize:12,fontWeight:700,color:'#6B6860',margin:'10px 0 4px' }}>특이사항</div>
                  {ta('specialNote','신체 상태, 환경, 주의점, 요청사항 등 자유 메모')}
                </>}
              </div>

              {/* 하단 버튼 */}
              <div style={{ borderTop:'1px solid #E4E2DC',padding:'12px 20px',display:'flex',gap:8,background:'#fff',flexShrink:0 }}>
                <button onClick={()=>setCallStep(s=>Math.max(0,s-1))} disabled={callStep===0}
                  style={{ flex:1,padding:'11px',border:'1.5px solid #E4E2DC',borderRadius:10,background:'#F7F6F3',color:'#6B6860',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,opacity:callStep===0?0.4:1 }}>
                  ← 이전
                </button>
                <button onClick={()=>handleSave()}
                  style={{ padding:'11px 16px',border:'1.5px solid #E4E2DC',borderRadius:10,background:'#F7F6F3',color:'#6B6860',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                  저장
                </button>
                {callStep < STEPS.length-1
                  ? <button onClick={()=>setCallStep(s=>s+1)}
                      style={{ flex:2,padding:'11px',border:'none',borderRadius:10,background:'#2D5F8A',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F }}>
                      다음 →
                    </button>
                  : <button onClick={()=>handleSave(true)}
                      style={{ flex:2,padding:'11px',border:'none',borderRadius:10,background:'#2E7D5E',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F }}>
                      ✅ 통화 완료
                    </button>
                }
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
