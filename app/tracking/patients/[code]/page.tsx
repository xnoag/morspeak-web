'use client'
import { use, useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, query, orderBy, getDocs, where, deleteDoc, setDoc, limit, updateDoc, onSnapshot } from 'firebase/firestore'

const F = "-apple-system,'SF Pro Display','SF Pro Text',sans-serif"
const M = "'SF Mono','Fira Mono',monospace"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}
function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  return getFirestore(app)
}
function todayKey() { return new Date().toISOString().slice(0, 10) }
function fmtT(sec?: number) {
  if (!sec) return '—'
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtS(s?: number) { return s != null ? `${s.toFixed(2)}s` : '—' }
function n(v: any) { return (v ?? 0) as number }
// 단계 완료까지 걸린 시간 표시용 — 60초 넘으면 "1분 20초"로
function fmtDur(sec?: number) {
  if (sec == null) return null
  if (sec < 60) return `${sec.toFixed(1)}초`
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return `${m}분 ${s}초`
}
function statsOf(arr?: number[]) {
  if (!arr || !arr.length) return null
  const mean = arr.reduce((a,b)=>a+b,0) / arr.length
  return { count: arr.length, mean, min: Math.min(...arr), max: Math.max(...arr) }
}
// 성공/실패가 뒤섞인 시도 로그를 "목표 1개당 몇 번 시도했는지"로 묶음 — 성공이 나올 때까지의
// 연속 시도(실패 여러 번 + 성공 1번)를 하나의 그룹으로 봄. 아직 성공 못 한 마지막 그룹도 포함
function groupAttempts(attempts?: {duration:number, success:boolean}[]) {
  if (!attempts || !attempts.length) return []
  const reps: {duration:number, success:boolean}[][] = []
  let current: {duration:number, success:boolean}[] = []
  for (const a of attempts) {
    current.push(a)
    if (a.success) { reps.push(current); current = [] }
  }
  if (current.length) reps.push(current)
  return reps
}
// activeStep(관리자가 보낸 의도)과 deviceStatus.renderedStep(기기가 실제로 그리고 있는 화면)을 비교해서
// "명령을 보냈는데 화면이 안 바뀜"을 자동으로 감지 — 기기에 로그를 뽑으러 갈 필요 없이 여기서 바로 보여줌
function reflectionStatus(
  activeStep: number | null,
  deviceStatus: {screen:string, renderedStep:number|null, updatedAt:any} | null,
  requestedAt: any,
): { label: string; color: string } {
  if (!deviceStatus) return { label: '기기 상태 정보 없음 (앱 업데이트 필요)', color: '#8e8e93' }
  const matches = (deviceStatus.renderedStep ?? null) === (activeStep ?? null)
  if (matches) {
    return activeStep == null
      ? { label: '대기 중', color: '#8e8e93' }
      : { label: '화면에 반영됨', color: '#34c759' }
  }
  const sentAgo = requestedAt?.toDate ? (Date.now() - requestedAt.toDate().getTime()) / 1000 : Infinity
  if (sentAgo < 8) return { label: '반영 대기 중...', color: '#ff9500' }
  return { label: '화면이 반영되지 않았어요 — 기기 확인 필요', color: '#ff3b30' }
}

const KBD_C = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const KBD_V = ['ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ','ㅐ','ㅒ','ㅔ','ㅖ']
const FN_BTNS = [
  ['말하기','11','btn_fn_speak'],['초기화','11211','btn_fn_reset'],['호출','22','btn_fn_call'],
  ['AI 추천','12','btn_fn_ai'],['딜리트','1','btn_fn_delete'],['커맨드','2','btn_fn_command'],
  ['잠그기','2(기능)','btn_fn_lock'],['→ 키보드','11112','btn_fn_toKeyboard'],['→ 단축어','21111','btn_fn_toShortcut'],
  ['콘센트01','12(기능)','iotOutlet1Count'],['콘센트02','211','iotOutlet2Count'],['콘센트03','121','iotOutlet3Count'],
]
const NAV_ITEMS = [
  { id: '개요',     icon: '📊', label: '개요' },
  { id: '발화기록', icon: '💬', label: '발화 기록' },
  { id: '일별데이터',icon: '📅', label: '일별 데이터' },
  { id: '세션기록', icon: '⏱', label: '세션 기록' },
  { id: '버튼분석', icon: '🎯', label: '버튼 분석' },
  { id: '교육온보딩', icon: '🎓', label: '교육 · 온보딩' },
  { id: '기능관리', icon: '🔧', label: '기능 관리' },
  { id: '설정',     icon: '⚙️', label: '설정' },
]
const TABS = NAV_ITEMS.map(n => n.id)

const FEATURE_FLAGS: { key: string; label: string; morse: string; defaultOn: boolean }[] = [
  { key: 'speak',       label: '말하기',       morse: '●● (11)',            defaultOn: true  },
  { key: 'sendMessage', label: '메시지 보내기', morse: '● (1, 기능모드)',     defaultOn: true  },
  { key: 'call',        label: '호출',          morse: '━━ (22)',            defaultOn: true  },
  { key: 'lock',        label: '잠금',          morse: '━ (2, 기능모드)',     defaultOn: true  },
  { key: 'repeatSpeak', label: '반복 말하기',   morse: '●●━ (112, 기능모드)', defaultOn: true  },
  { key: 'youtube',     label: '유튜브',        morse: '●●● (111, 기능모드)', defaultOn: false },
  { key: 'outlet1',     label: '콘센트 1',      morse: '●━ (12, 기능모드)',   defaultOn: true  },
  { key: 'outlet2',     label: '콘센트 2',      morse: '━●● (211, 기능모드)', defaultOn: true  },
  { key: 'outlet3',     label: '콘센트 3',       morse: '●━● (121, 기능모드)',   defaultOn: true  },
  { key: 'reset',       label: '초기화',          morse: '●●━●● (11211)',        defaultOn: true  },
  { key: 'delete',      label: '삭제',            morse: '● (1, 키보드모드)',      defaultOn: true  },
  { key: 'aiSuggest',   label: 'AI 추천',         morse: '●━ (12, 키보드/단축어)', defaultOn: true  },
  { key: 'commandMode', label: '커맨드(쌍자음)',   morse: '━ (2, 키보드/단축어모드)', defaultOn: true  },
  { key: 'voiceChange', label: '목소리 설정 (유료)', morse: '(설정 화면)',            defaultOn: true  },
]

// 개별 기능보다 넓은 의미 — 모드 자체 진입 가능 여부 (튜토리얼 진행 상황에 맞춰 접근 제한)
const MODE_FLAGS: { key: string; label: string; morse: string; defaultOn: boolean }[] = [
  { key: 'keyboardMode', label: '키보드 모드 진입', morse: '●●●●━ (11112)', defaultOn: true },
  { key: 'shortcut',     label: '단축어 모드 진입', morse: '━●●●● (21111)', defaultOn: false },
  { key: 'functionMode', label: '기능 모드 진입',   morse: '(기능 버튼)',    defaultOn: false },
]

export default function PatientDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [tab, setTab] = useState('개요')
  const [stats, setStats]   = useState<Record<string,any>>({})
  const [blink, setBlink]   = useState<Record<string,any>>({})
  const [daily, setDaily]   = useState<any[]>([])
  const [today, setToday]   = useState<Record<string,any>>({})
  const [speaks, setSpeaks] = useState<any[]>([])
  const [shortcuts, setShortcuts] = useState<string[]>([])
  const [youtube, setYoutube]     = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [editSC, setEditSC] = useState<string[]|null>(null)
  const [editYT, setEditYT] = useState<string[]|null>(null)
  const [saving, setSaving] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({})
  const [flagSaving, setFlagSaving] = useState<string | null>(null)
  const [careEmailInput, setCareEmailInput] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [editBoundary, setEditBoundary] = useState<number | null>(null)
  const [editTimer, setEditTimer] = useState<number | null>(null)
  const [calibSaving, setCalibSaving] = useState(false)
  const [tutorialSteps, setTutorialSteps] = useState<number[]>([])
  const [tutorialSending, setTutorialSending] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [liveProgress, setLiveProgress] = useState<{step: number, count: number, total: number} | null>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [stepDurations, setStepDurations] = useState<Record<string, number>>({})
  const [requestedAt, setRequestedAt] = useState<any>(null)
  const [deviceStatus, setDeviceStatus] = useState<{screen:string, renderedStep:number|null, updatedAt:any} | null>(null)
  const [focusMode, setFocusMode] = useState(true)
  const [previewStep, setPreviewStep] = useState<number | null>(null)
  const [runningStep, setRunningStep] = useState<number | null>(null)
  const [runningAction, setRunningAction] = useState<{step:number, type:string} | null>(null)
  const [eduStatus, setEduStatus] = useState<string>('idle')  // idle | pending | active
  const [adminContact, setAdminContact] = useState('xnoag@icloud.com')

  useEffect(() => {
    async function load() {
      const db = getDb()
      const [sS,bS,dS,pS,pD,scS,ytS,tS,spS] = await Promise.all([
        getDoc(doc(db,'usageStats',code)), getDoc(doc(db,'blinkProfiles',code)),
        getDocs(query(collection(db,'usageStats',code,'daily'),orderBy('date','desc'))),
        getDocs(query(collection(db,'patients'),where('chatCode','==',code))), getDoc(doc(db,'patients',code)),
        getDoc(doc(db,'shortcuts',code)), getDoc(doc(db,'youtubeSuggestions',code)),
        getDoc(doc(db,'usageStats',code,'daily',todayKey())),
        getDocs(query(collection(db,'usageStats',code,'speaks'),orderBy('timestamp','desc'),limit(500))),
      ])
      const ssSnap = await getDocs(query(collection(db,'usageStats',code,'sessions'),orderBy('start','desc'),limit(200)))
      setSessions(ssSnap.docs.map(d=>({id:d.id,...d.data()})))
      let m: Record<string,any> = sS.exists() ? sS.data() : {}
      if (!pS.empty) m={...pS.docs[0].data(),...m}
      else if (pD.exists()) m={...pD.data(),...m}
      setStats(m); if(bS.exists()) setBlink(bS.data())
      setDaily(dS.docs.map(d=>({id:d.id,...d.data()})))
      if(tS.exists()) setToday(tS.data())
      setSpeaks(spS.docs.map(d=>({id:d.id,...d.data()})))
      if(scS.exists()) setShortcuts((scS.data()?.items as string[])??[])
      if(ytS.exists()) setYoutube((ytS.data()?.items as string[])??[])
      setLoading(false)
    }
    load()
  }, [code])

  const totalKbd = speaks.reduce((s,e)=>s+(e.keyboardCount||0),0)
  const totalAI  = speaks.reduce((s,e)=>s+(e.aiCount||0),0)
  const totalSC  = speaks.reduce((s,e)=>s+(e.shortcutCount||0),0)
  const totalIn  = totalKbd+totalAI+totalSC
  const shortMean = blink.onboardingShortDurations?.length ? blink.onboardingShortDurations.reduce((a:number,b:number)=>a+b,0)/blink.onboardingShortDurations.length : null
  const longMean  = blink.onboardingLongDurations?.length  ? blink.onboardingLongDurations.reduce((a:number,b:number)=>a+b,0)/blink.onboardingLongDurations.length  : null

  // 교육 세션 실시간 리스너
  useEffect(() => {
    const unsub = onSnapshot(doc(getDb(),'educationSessions',code), snap => {
      const status = snap.data()?.status ?? 'idle'
      setEduStatus(status === 'ended' ? 'idle' : status)
    })
    return () => unsub()
  }, [code])

  // 튜토리얼(캘리브레이션 포함) 진행 상황 실시간 리스너
  useEffect(() => {
    const unsub = onSnapshot(doc(getDb(),'tutorialConfig',code), snap => {
      setCompletedSteps((snap.data()?.completedSteps as number[]) ?? [])
      setLiveProgress((snap.data()?.liveProgress as {step:number,count:number,total:number}) ?? null)
      setActiveStep((snap.data()?.activeStep as number | null | undefined) ?? null)
      setStepDurations((snap.data()?.stepDurations as Record<string,number>) ?? {})
      setRequestedAt(snap.data()?.requestedAt ?? null)
    })
    return () => unsub()
  }, [code])

  // featureFlags 실시간 리스너 — 특히 blinkDetection은 꺼져있으면 환자가 아무것도 할 수 없는
  // 치명적인 상태라, 한 번만 읽고 끝나면(예전 getDoc) 다른 곳(교육세션 패널)에서 끄고 잊어버렸을 때
  // 이 페이지에 반영이 안 돼서 못 알아차림 — 실시간으로 계속 구독해서 항상 최신 상태를 보여줌
  useEffect(() => {
    const unsub = onSnapshot(doc(getDb(),'featureFlags',code), snap => {
      const d = (snap.data() as Record<string, boolean | string>) ?? {}
      setFeatureFlags(d)
      setCareEmailInput((d.careEmail as string) ?? '')
    })
    return () => unsub()
  }, [code])

  // 기기가 지금 실제로 뭘 보여주고 있는지(반영 확인용) — activeStep은 앱이 전환하기로 "결정한" 의도일
  // 뿐이라, 화면이 실제로 그걸 그리는지는 별도로 확인해야 함. 명령을 보냈는데 화면이 안 바뀌는 걸
  // 로그를 뽑지 않고도 여기서 바로 알 수 있게 하기 위한 리스너
  useEffect(() => {
    const unsub = onSnapshot(doc(getDb(),'deviceStatus',code), snap => {
      const d = snap.data()
      setDeviceStatus(d ? {screen: d.screen, renderedStep: d.renderedStep ?? null, updatedAt: d.updatedAt} : null)
    })
    return () => unsub()
  }, [code])

  // 일별 최대값 (바 차트 기준)
  const maxSpeak = Math.max(1,...daily.map(d=>n(d.speakCount)))

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f2f2f7',fontFamily:F,color:'#8e8e93',fontSize:13}}>불러오는 중...</div>

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f2f2f7',fontFamily:F,color:'#1d1d1f'}}>

      {/* 상단 헤더 */}
      <div style={{background:'#1d1d1f',flexShrink:0,padding:'0 24px',display:'flex',alignItems:'center',gap:16,height:56}}>
        <a href="/tracking/dashboard" style={{color:'rgba(255,255,255,0.6)',textDecoration:'none',fontSize:12,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          목록
        </a>
        <div style={{width:1,height:16,background:'rgba(255,255,255,0.15)'}}/>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:'#fff',letterSpacing:'-.3px'}}>{stats.userName||code}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontFamily:M}}>{[stats.diagnosis,stats.hospital].filter(Boolean).join(' · ')}{stats.diagnosis||stats.hospital?' · ':''}{code}</div>
        </div>
        {/* 이 환자를 담당 FaceTime 주소(unit01@morspeak.com 등)로 지정 — 공유 Apple ID에서
            이 주소로 전화를 걸면 이 환자의 iPad만 울리도록 iPad 쪽 FaceTime 설정을 맞춰둠 */}
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <input value={careEmailInput} onChange={e=>setCareEmailInput(e.target.value)}
            onBlur={async()=>{ await setDoc(doc(getDb(),'featureFlags',code),{careEmail:careEmailInput},{merge:true}) }}
            placeholder="unit01" style={{width:70,padding:'4px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.1)',fontSize:11,fontFamily:M,outline:'none',color:'#fff'}}/>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontFamily:M}}>@morspeak.com</span>
        </div>
        <div style={{flex:1}}/>
        {/* 교육 세션 */}
        {eduStatus==='idle' && <>
          <input value={adminContact} onChange={e=>setAdminContact(e.target.value)} placeholder="FaceTime 연락처"
            style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.1)',fontSize:11,fontFamily:M,outline:'none',width:150,color:'#fff'}}/>
          <button onClick={async()=>{ await setDoc(doc(getDb(),'educationSessions',code),{status:'pending',adminContact,requestedAt:new Date()}); setEduStatus('pending') }}
            style={{height:32,padding:'0 14px',borderRadius:8,border:'none',background:'#007AFF',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,flexShrink:0}}>
            교육시간 시작
          </button>
        </>}
        {eduStatus==='pending' && <>
          <span style={{fontSize:11,color:'#ff9500'}}>수락 대기 중...</span>
          <button onClick={async()=>{ await setDoc(doc(getDb(),'educationSessions',code),{status:'ended'},{merge:true}); setEduStatus('idle') }}
            style={{height:32,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',fontSize:11,cursor:'pointer',fontFamily:F}}>취소</button>
        </>}
        {eduStatus==='active' && (
          <button onClick={async()=>{ await setDoc(doc(getDb(),'educationSessions',code),{status:'ended'},{merge:true}); setEduStatus('idle') }}
            style={{height:32,padding:'0 14px',borderRadius:8,border:'none',background:'#ff3b30',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>
            세션 종료
          </button>
        )}
        <button onClick={async()=>{
          if(!confirm(`"${stats.userName||code}" 전체 데이터를 삭제합니다.`)) return
          setDeleting(true); const db=getDb()
          const [d1,d2,d3]=await Promise.all([getDocs(collection(db,'usageStats',code,'daily')),getDocs(collection(db,'chats',code,'messages')),getDocs(collection(db,'usageStats',code,'speaks'))])
          await Promise.all([...d1.docs,...d2.docs,...d3.docs].map(d=>deleteDoc(d.ref)))
          await Promise.all([deleteDoc(doc(db,'usageStats',code)),deleteDoc(doc(db,'blinkProfiles',code)),deleteDoc(doc(db,'patients',code)),deleteDoc(doc(db,'chats',code)),deleteDoc(doc(db,'shortcuts',code)),deleteDoc(doc(db,'youtubeSuggestions',code))])
          const byCode=await getDocs(query(collection(db,'patients'),where('chatCode','==',code)))
          await Promise.all(byCode.docs.map(d=>deleteDoc(d.ref)))
          location.href='/tracking/dashboard'
        }} disabled={deleting} style={{fontSize:11,color:'#ff453a',border:'none',background:'transparent',cursor:'pointer',fontFamily:F}}>
          {deleting?'삭제 중...':'삭제'}
        </button>
      </div>

      {/* 깜빡임 감지 꺼짐 경고 — 탭/세션 상태와 무관하게 항상 보여야 함. 꺼진 채로 잊어버리기 쉽고
          (교육 세션이 끝나면 이 토글 자체가 안 보이는 곳에 있었음), 꺼져있으면 환자가 아예 아무것도
          할 수 없는 치명적인 상태라서 눈에 확 띄게 배너로 항상 노출 */}
      {featureFlags.blinkDetection === false && (
        <div style={{background:'#ff3b30',padding:'10px 24px',flexShrink:0,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>⚠️ 깜빡임 감지가 꺼져있어요 — 환자가 아무것도 입력할 수 없어요</span>
          <div style={{flex:1}}/>
          <button onClick={async()=>{ await setDoc(doc(getDb(),'featureFlags',code),{blinkDetection:true},{merge:true}) }}
            style={{height:28,padding:'0 14px',borderRadius:8,border:'none',background:'#fff',color:'#ff3b30',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F,flexShrink:0}}>
            지금 켜기
          </button>
        </div>
      )}

      {/* 교육 세션 패널 */}
      {eduStatus==='active' && (
        <div style={{background:'#1c3a5e',padding:'10px 24px',flexShrink:0}}>
          <LessonPanel code={code} getDb={getDb}/>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:6}}>
            <span style={{fontSize:11,fontWeight:700,color:'#5ac8fa'}}>⚡ 실행</span>
            {[{label:'말하기',type:'speak'},{label:'초기화',type:'reset'},{label:'삭제',type:'delete'},{label:'호출',type:'call'},{label:'키보드',type:'toKeyboard'},{label:'단축어',type:'toShortcut'},{label:'기능',type:'toFunction'},{label:'잠금',type:'lock'}].map(b=>(
              <button key={b.type} onClick={async()=>{ await setDoc(doc(getDb(),'educationSessions',code),{command:{type:b.type,id:Math.random().toString(36),ts:new Date()}},{merge:true}) }}
                style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.3)',background:'transparent',color:'rgba(255,255,255,0.8)',fontSize:11,cursor:'pointer',fontFamily:F}}>{b.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* 메인: 사이드바 + 콘텐츠 */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

      {/* 좌측 사이드바 */}
      <div style={{width:200,background:'#fff',borderRight:'1px solid #e5e5ea',flexShrink:0,display:'flex',flexDirection:'column',paddingTop:8}}>
        {NAV_ITEMS.map(item=>(
          <button key={item.id} onClick={()=>setTab(item.id)} style={{
            display:'flex',alignItems:'center',gap:10,padding:'10px 16px',border:'none',
            background:tab===item.id?'#f2f2f7':'transparent',
            borderRadius:10,margin:'2px 8px',cursor:'pointer',fontFamily:F,
            color:tab===item.id?'#007AFF':'#3a3a3c',
            fontWeight:tab===item.id?600:400,fontSize:13,textAlign:'left',
          }}>
            <span style={{fontSize:16,width:20,textAlign:'center'}}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        {/* 환우 정보 요약 */}
        <div style={{marginTop:'auto',padding:'16px',borderTop:'1px solid #f2f2f7'}}>
          <div style={{fontSize:10,fontWeight:600,color:'#8e8e93',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>환우 정보</div>
          {[['보호자',stats.guardianName],['병원',stats.hospital],['지역',stats.region]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k as string} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
              <span style={{color:'#8e8e93'}}>{k}</span>
              <span style={{color:'#1d1d1f',fontWeight:500}}>{v as string}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{flex:1,overflow:'auto',padding:'28px 32px'}}>

        {/* ── 개요 ── */}
        {tab==='개요' && (
          <div>
            {/* 오늘 핵심 지표 카드 */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:28}}>
              {[
                {label:'오늘 말하기', v:n(today.speakCount), total:n(stats.speakCount), color:'#007AFF'},
                {label:'오늘 호출', v:n(today.callCount), total:n(stats.callCount), color:'#ff9500'},
                {label:'오늘 사용 시간', v:fmtT(today.sessionSeconds), total:fmtT(stats.totalSessionSeconds), color:'#5856d6'},
                {label:'오늘 IoT 제어', v:n(today.iotCount), total:n(stats.iotCount), color:'#34c759'},
              ].map(c=>(
                <div key={c.label} style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:'1px solid #e5e5ea',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                  <div style={{fontSize:11,color:'#8e8e93',fontWeight:600,marginBottom:6}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:700,color:c.color,letterSpacing:'-.5px'}}>{c.v}</div>
                  <div style={{fontSize:10,color:'#aeaeb2',marginTop:3}}>누적 {c.total}</div>
                </div>
              ))}
            </div>
            {/* 2열 레이아웃 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
              {/* 모드별 시간 */}
              <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #e5e5ea'}}>
                <ColTitle>모드별 사용 시간 (오늘)</ColTitle>
                {(() => {
                  const modes: [string,number,string][] = [
                    ['키보드',n(today.modeSeconds_keyboard),'#007AFF'],
                    ['단축어',n(today.modeSeconds_shortcut),'#34c759'],
                    ['기능',n(today.modeSeconds_function),'#ff9500'],
                    ['YouTube',n(today.modeSeconds_youtubeSurf),'#8e8e93'],
                  ]
                  const total = modes.reduce((s,[,v])=>s+v,0)
                  if(!total) return <p style={{color:'#aeaeb2',fontSize:13}}>오늘 데이터 없음</p>
                  return modes.map(([l,v,c])=>(
                    <div key={l} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,color:'#3a3a3c'}}>{l}</span>
                        <span style={{fontFamily:M,fontSize:12,color:c,fontWeight:600}}>{fmtT(v)}</span>
                      </div>
                      <Bar val={v} max={total} color={c}/>
                    </div>
                  ))
                })()}
              </div>
              {/* 누적 요약 */}
              <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #e5e5ea'}}>
                <ColTitle>누적 현황</ColTitle>
                {[
                  ['총 말하기', n(stats.speakCount), '회'],
                  ['총 호출', n(stats.callCount), '회'],
                  ['총 사용 시간', null, fmtT(stats.totalSessionSeconds)],
                  ['총 잠금', n(stats.lockCount), '회'],
                  ['YouTube 선택', n(stats.youtubeSelectCount), '회'],
                ].map(([l,v,u])=>(
                  <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f5f5f7'}}>
                    <span style={{fontSize:13,color:'#3c3c43'}}>{l}</span>
                    <span style={{fontFamily:M,fontSize:13,fontWeight:600,color:'#1d1d1f'}}>
                      {v!==null?`${n(v as number).toLocaleString()} ${u}`:(u as string)}
                    </span>
                  </div>
                ))}
                <div style={{marginTop:14,padding:'12px',background:'#f9f9fb',borderRadius:10}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#8e8e93',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>캘리브레이션</div>
                  <div style={{display:'flex',gap:16}}>
                    <div><div style={{fontSize:10,color:'#aeaeb2'}}>경계값</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#007AFF'}}>{fmtS(blink.dotDashBoundary)}</div></div>
                    <div><div style={{fontSize:10,color:'#aeaeb2'}}>짧은 평균</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#007AFF'}}>{fmtS(shortMean??undefined)}</div></div>
                    <div><div style={{fontSize:10,color:'#aeaeb2'}}>긴 평균</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#007AFF'}}>{fmtS(longMean??undefined)}</div></div>
                  </div>
                </div>
              </div>
            </div>
            {/* 입력 방법 */}
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #e5e5ea'}}>
              <ColTitle>입력 방법 분석 (최근 {speaks.length}회 발화)</ColTitle>
              {totalIn>0 ? (
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                  {[
                    {label:'키보드 직접 입력', val:totalKbd, color:'#007AFF', desc:'자모를 직접 타이핑'},
                    {label:'AI 추천 선택', val:totalAI, color:'#5856d6', desc:'AI가 제안한 단어'},
                    {label:'단축어 표현', val:totalSC, color:'#34c759', desc:'등록된 표현 바로 사용'},
                  ].map(item=>(
                    <div key={item.label}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:12,color:'#3a3a3c',fontWeight:500}}>{item.label}</span>
                        <span style={{fontFamily:M,fontSize:12,color:item.color,fontWeight:600}}>{item.val}회</span>
                      </div>
                      <Bar val={item.val} max={totalIn} color={item.color}/>
                      <div style={{fontSize:10,color:'#aeaeb2',marginTop:3}}>{item.desc} · {totalIn>0?Math.round(item.val/totalIn*100):0}%</div>
                    </div>
                  ))}
                </div>
              ) : <p style={{color:'#aeaeb2',fontSize:13}}>발화 기록 없음</p>}
            </div>
          </div>
        )}

        {/* ── 오늘 현황 (구 이름 호환) ── */}
        {tab==='오늘 현황' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 48px'}}>

            {/* 컬럼 1: 핵심 활동 */}
            <div>
              <ColTitle>핵심 활동</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                오늘 {stats.userName||'환우'}의 모스픽 사용 현황입니다. 말하기 횟수는 의사소통 빈도를, 호출은 보호자 호출 빈도를 나타냅니다.
              </p>
              {[
                {label:'말하기', today:n(today.speakCount), total:n(stats.speakCount), color:'#1d1d1f'},
                {label:'호출', today:n(today.callCount), total:n(stats.callCount), color:'#1d1d1f'},
                {label:'문자 발신', today:n(today.messageSentCount), total:n(stats.messageSentCount), color:'#1d1d1f'},
                {label:'IoT 제어', today:n(today.iotCount), total:n(stats.iotCount), color:'#1d1d1f'},
              ].map(item=>(
                <MetricRow key={item.label} label={item.label} today={item.today} total={item.total} color={item.color}/>
              ))}
            </div>

            {/* 컬럼 2: 시간 & 모드 */}
            <div>
              <ColTitle>시간 현황</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                앱 사용 시간과 각 모드에서 보낸 시간을 보여줍니다.
              </p>
              <div style={{marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'#1d1d1f',fontWeight:500}}>사용 시간</span>
                  <span style={{fontFamily:M,fontSize:12,fontWeight:700}}>{fmtT(today.sessionSeconds)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'#1d1d1f',fontWeight:500}}>잠금 시간</span>
                  <span style={{fontFamily:M,fontSize:12,fontWeight:700}}>{fmtT(today.lockSeconds)}</span>
                </div>
              </div>
              {(() => {
                const modes: [string,number,string][] = [
                  ['키보드',n(today.modeSeconds_keyboard),'#06c'],
                  ['단축어',n(today.modeSeconds_shortcut),'#34c759'],
                  ['기능',n(today.modeSeconds_function),'#ff9500'],
                  ['YouTube',n(today.modeSeconds_youtubeSurf),'#8e8e93'],
                ]
                const total = modes.reduce((s,[,v])=>s+v,0)
                if (!total) return null
                return modes.map(([l,v,c])=>(
                  <div key={l} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:12,color:'#1d1d1f'}}>{l} 모드</span>
                      <span style={{fontFamily:M,fontSize:12,color:c,fontWeight:600}}>{fmtT(v)}</span>
                    </div>
                    <Bar val={v} max={total} color={c}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                      <span style={{fontSize:10,color:'#aeaeb2'}}>0</span>
                      <span style={{fontSize:10,color:'#aeaeb2'}}>{total>0?Math.round(v/total*100):0}%</span>
                    </div>
                  </div>
                ))
              })()}
            </div>

            {/* 컬럼 3: 누적 요약 */}
            <div>
              <ColTitle>누적 현황</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                지금까지 모스픽을 사용한 전체 누적 데이터입니다.
              </p>
              {[
                ['총 말하기', n(stats.speakCount), '회'],
                ['총 호출', n(stats.callCount), '회'],
                ['총 문자 발신', n(stats.messageSentCount), '회'],
                ['총 사용 시간', null, fmtT(stats.totalSessionSeconds)],
                ['총 잠금', n(stats.lockCount), '회'],
                ['총 IoT 제어', n(stats.iotCount), '회'],
                ['YouTube 선택', n(stats.youtubeSelectCount), '회'],
              ].map(([l,v,u])=>(
                <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #f5f5f7'}}>
                  <span style={{fontSize:13,color:'#3c3c43'}}>{l}</span>
                  <span style={{fontFamily:M,fontSize:13,fontWeight:600,color:'#1d1d1f'}}>
                    {v!==null?`${n(v).toLocaleString()} ${u}`:(u as string)}
                  </span>
                </div>
              ))}
              <div style={{marginTop:20,padding:'14px 16px',background:'#f5f5f7',borderRadius:8}}>
                <div style={{fontSize:10,fontWeight:600,color:'#6e6e73',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>눈깜빡임 캘리브레이션</div>
                <div style={{display:'flex',gap:16}}>
                  <div><div style={{fontSize:10,color:'#aeaeb2'}}>경계값</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#06c'}}>{fmtS(blink.dotDashBoundary)}</div></div>
                  <div><div style={{fontSize:10,color:'#aeaeb2'}}>짧은 평균</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#06c'}}>{fmtS(shortMean??undefined)}</div></div>
                  <div><div style={{fontSize:10,color:'#aeaeb2'}}>긴 평균</div><div style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#06c'}}>{fmtS(longMean??undefined)}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 사용 분석 ── */}
        {tab==='사용 분석' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 48px'}}>
            <div>
              <ColTitle>입력 방법</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                최근 {speaks.length}회 발화에서 어떤 방법으로 텍스트를 입력했는지 보여줍니다.
              </p>
              {totalIn > 0 ? [
                {label:'키보드 직접 입력', val:totalKbd, color:'#06c', desc:'자모를 직접 눈깜빡임으로 조합'},
                {label:'AI 추천 선택', val:totalAI, color:'#5856d6', desc:'AI가 제안한 단어를 선택'},
                {label:'단축어 표현', val:totalSC, color:'#34c759', desc:'등록해둔 표현을 바로 사용'},
              ].map(item=>(
                <div key={item.label} style={{marginBottom:20}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:12,color:'#1d1d1f',fontWeight:500}}>{item.label}</span>
                    <span style={{fontFamily:M,fontSize:12,color:item.color,fontWeight:600}}>{item.val}회</span>
                  </div>
                  <Bar val={item.val} max={totalIn} color={item.color}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                    <span style={{fontSize:10,color:'#aeaeb2'}}>{item.desc}</span>
                    <span style={{fontSize:10,color:'#aeaeb2'}}>{totalIn>0?Math.round(item.val/totalIn*100):0}%</span>
                  </div>
                </div>
              )) : <p style={{fontSize:13,color:'#aeaeb2'}}>발화 기록 없음</p>}
            </div>

            <div>
              <ColTitle>콘센트 제어</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                HomeKit 스마트 콘센트 제어 횟수입니다.
              </p>
              {[
                ['콘센트01', n(stats.iotOutlet1Count)],
                ['콘센트02', n(stats.iotOutlet2Count)],
                ['콘센트03', n(stats.iotOutlet3Count)],
              ].map(([l,v])=>{
                const mx = Math.max(1,n(stats.iotOutlet1Count),n(stats.iotOutlet2Count),n(stats.iotOutlet3Count))
                return (
                  <div key={l as string} style={{marginBottom:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:12,color:'#1d1d1f',fontWeight:500}}>{l}</span>
                      <span style={{fontFamily:M,fontSize:12,fontWeight:600}}>{n(v)>0?n(v):'0'}</span>
                    </div>
                    <Bar val={n(v)} max={mx} color='#ff9500'/>
                  </div>
                )
              })}
              <div style={{paddingTop:16,borderTop:'1px solid #f5f5f7'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'#6e6e73'}}>YouTube 선택</span>
                  <span style={{fontFamily:M,fontSize:12,fontWeight:600}}>{n(stats.youtubeSelectCount)}</span>
                </div>
              </div>
            </div>

            <div>
              <ColTitle>잠금 현황</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>
                눈깜빡임 감지를 차단하는 잠금 기능의 사용 패턴입니다.
              </p>
              {[
                ['오늘 잠금 횟수', `${n(today.lockCount)}회`],
                ['오늘 잠금 시간', fmtT(today.lockSeconds)],
                ['누적 잠금 횟수', `${n(stats.lockCount)}회`],
              ].map(([l,v])=>(
                <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #f5f5f7'}}>
                  <span style={{fontSize:13,color:'#3c3c43'}}>{l}</span>
                  <span style={{fontFamily:M,fontSize:13,fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:24}}>
                <ColTitle>기본 정보</ColTitle>
                {[
                  ['생년월일',stats.patientBirth],['진단명',stats.diagnosis],
                  ['병원',stats.hospital],['보호자',stats.guardianName],
                  ['연락처',stats.guardianPhone],['아이디',stats.loginId],
                ].map(([l,v])=>(
                  <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f5f5f7'}}>
                    <span style={{fontSize:12,color:'#6e6e73'}}>{l}</span>
                    <span style={{fontSize:12,color:'#1d1d1f',fontFamily:l==='아이디'?M:undefined}}>{(v as string)||'—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 발화 기록 ── */}
        {tab==='발화기록' && <SpeakLogSection speaks={speaks} />}

        {/* ── 버튼 통계 ── */}
        {tab==='버튼분석' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 48px'}}>
            <div>
              <ColTitle>기능 버튼</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>각 기능 버튼의 누적 사용 횟수입니다.</p>
              {FN_BTNS.map(([l,m,k])=>{
                const val=n(stats[k as string])
                const mx=Math.max(1,...FN_BTNS.map(([,,k2])=>n(stats[k2 as string])))
                return (
                  <div key={k as string} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:12,color:'#1d1d1f'}}>{l} <span style={{fontSize:10,fontFamily:M,color:'#aeaeb2'}}>({m})</span></span>
                      <span style={{fontFamily:M,fontSize:12,fontWeight:600,color:val>0?'#1d1d1f':'#d1d1d6'}}>{val>0?val:'0'}</span>
                    </div>
                    <Bar val={val} max={mx} color='#06c'/>
                  </div>
                )
              })}
            </div>
            <div>
              <ColTitle>자음 키</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>키보드 모드에서 각 자음을 누른 횟수입니다.</p>
              {KBD_C.map(k=>{
                const val=n(stats[`btn_kbd_${k}`])
                const mx=Math.max(1,...KBD_C.map(x=>n(stats[`btn_kbd_${x}`])))
                return (
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#1d1d1f'}}>{k}</span>
                      <span style={{fontFamily:M,fontSize:12,fontWeight:600,color:val>0?'#06c':'#d1d1d6'}}>{val>0?val:'0'}</span>
                    </div>
                    <Bar val={val} max={mx} color='#06c'/>
                  </div>
                )
              })}
            </div>
            <div>
              <ColTitle>모음 키</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:24}}>키보드 모드에서 각 모음을 누른 횟수입니다.</p>
              {KBD_V.map(k=>{
                const val=n(stats[`btn_kbd_${k}`])
                const mx=Math.max(1,...KBD_V.map(x=>n(stats[`btn_kbd_${x}`])))
                return (
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#1d1d1f'}}>{k}</span>
                      <span style={{fontFamily:M,fontSize:12,fontWeight:600,color:val>0?'#5856d6':'#d1d1d6'}}>{val>0?val:'0'}</span>
                    </div>
                    <Bar val={val} max={mx} color='#5856d6'/>
                  </div>
                )
              })}
              {/* 단축어 슬롯 */}
              {(() => {
                const sc=Object.keys(stats).filter(k=>k.startsWith('btn_sc_')).map(k=>({label:k.replace('btn_sc_',''),val:n(stats[k])})).sort((a,b)=>b.val-a.val).slice(0,8)
                if(!sc.length) return null
                const mx=sc[0].val
                return <>
                  <div style={{marginTop:24,marginBottom:12,paddingTop:16,borderTop:'1px solid #d2d2d7'}}>
                    <ColTitle>단축어 슬롯 TOP</ColTitle>
                  </div>
                  {sc.map(s=>(
                    <div key={s.label} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,color:'#1d1d1f'}}>{s.label}</span>
                        <span style={{fontFamily:M,fontSize:12,fontWeight:600,color:'#34c759'}}>{s.val}</span>
                      </div>
                      <Bar val={s.val} max={mx} color='#34c759'/>
                    </div>
                  ))}
                </>
              })()}
            </div>
          </div>
        )}

        {/* ── 일별 데이터 ── */}
        {tab==='일별데이터' && <DailySection daily={daily} />}

        {/* ── 세션 기록 ── */}
        {tab==='세션기록' && <SessionSection sessions={sessions} />}

        {/* ── 교육 · 온보딩 ── */}
        {tab==='교육온보딩' && (() => {
          const tutorialStepsList = [
            {n:1, label:'짧게 깜빡이기',     desc:'캘리브레이션 · 짧게 ×5',
              script:'"눈에 힘을 빼고 편안하게, 짧게 감았다가 떠보세요. 5번 정도 반복하면 짧은 깜빡임 길이를 기억해둘게요."'},
            {n:2, label:'길게 깜빡이기',     desc:'캘리브레이션 · 길게 ×5',
              script:'"이번엔 조금 더 길게 감았다가 떠보세요. 짧게보다 확실히 오래 감아주시면 돼요."'},
            {n:3, label:'혼합 깜빡이기',     desc:'캘리브레이션 · 짧게/길게 혼합 ×5',
              script:'"이제 짧게와 길게를 화면에 나오는 순서대로 섞어서 깜빡여볼게요."'},
            {n:4, label:'ㄱ 입력하기',      desc:'짧게·짧게·길게 깜빡임',
              script:'"짧게·짧게·길게 순서로 깜빡이면 \'ㄱ\'이 입력돼요. 화면에 ㄱ이 뜨는지 같이 확인해볼게요."'},
            {n:5, label:'ㅏ 입력하기',      desc:'길게·짧게 깜빡임',
              script:'"길게·짧게로 깜빡이면 \'ㅏ\'가 입력돼요. ㄱ 다음에 이어서 \'가\'를 만들어볼게요."'},
            {n:6, label:'말하기',           desc:'짧게·짧게 (11)',
              script:'"짧게·짧게로 깜빡이면 지금까지 입력한 문장을 소리로 읽어줘요."'},
            {n:7, label:'잠그기',           desc:'길게·짧게·길게 (212)',
              script:'"길게·짧게·길게로 깜빡이면 화면이 잠겨요. 원치 않는 입력을 막고 싶을 때 사용해요."'},
            {n:8, label:'잠그기 해제',      desc:'길게·짧게·길게 (212)',
              script:'"잠긴 상태에서 같은 동작(길게·짧게·길게)을 반복하면 다시 풀려요."'},
            {n:9, label:'AI 추천',          desc:'짧게·길게 (12)',
              script:'"짧게·길게로 깜빡이면 AI가 이어서 할 말을 추천해줘요."'},
            // 10은 "대기 해제" 명령과 겹쳐서 건너뜀
            {n:11, label:'AI 추천 선택하기', desc:'길게·짧게 (21)',
              script:'"추천된 표현 중 첫 번째를 길게·짧게로 선택해서 바로 말할 수 있어요."'},
            {n:12, label:'초기화',          desc:'짧게·짧게·길게·짧게·짧게 (11211)',
              script:'"이 동작을 하면 지금까지 입력한 내용이 전부 지워져요. 잘못 입력했을 때 사용해요."'},
            {n:13, label:'커맨드 버튼',      desc:'길게 (2)',
              script:'"길게 한 번 깜빡이면 커맨드 버튼이에요. 쌍자음(ㄲ, ㄸ 등) 같은 다른 자모를 입력할 때 화면을 바꿔줘요."'},
            {n:14, label:'지우기',          desc:'짧게 (1)',
              script:'"짧게 한 번 깜빡이면 마지막 글자가 지워져요. 잘못 입력했을 때 하나씩 지울 수 있어요."'},
            {n:15, label:'단축어 모드 전환', desc:'길게·짧게·짧게·짧게·짧게 (21111)',
              script:'"이 동작으로 자주 쓰는 표현들이 모여있는 화면으로 넘어가요."'},
            {n:16, label:'표현 선택하기',    desc:'길게·짧게 (21)',
              script:'"단축어 모드에서 길게·짧게로 첫 번째 표현을 바로 말할 수 있어요."'},
            {n:17, label:'기능 모드 전환',   desc:'짧게·짧게·짧게·짧게·길게 (11112)',
              script:'"이 동작으로 여러 기능이 모여있는 화면으로 넘어가요."'},
            {n:18, label:'호출',            desc:'짧게·길게 (12, 기능모드)',
              script:'"기능 모드에서 짧게·길게로 보호자를 호출할 수 있어요. 잠금 상태에서도 항상 작동해요."'},
          ]
          const CHAPTERS = [
            {title:'1장 · 캘리브레이션', desc:'눈 깜빡임 길이를 학습시켜요', steps:[1,2,3]},
            {title:'2장 · 키보드 모드',   desc:'자모 입력부터 커맨드·지우기까지', steps:[4,5,6,7,8,9,11,12,13,14]},
            {title:'3장 · 단축어 모드',   desc:'자주 쓰는 표현으로 빠르게 말하기', steps:[15,16]},
            {title:'4장 · 기능 모드',     desc:'여러 기능과 보호자 호출', steps:[17,18]},
          ]
          return (
          <div style={{maxWidth:920}}>
            <ColTitle>교육 · 온보딩</ColTitle>
            <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:20}}>
              캘리브레이션부터 튜토리얼 단계, 화면 제어, 감지 파라미터까지 온보딩 교육에 필요한 모든 것을 여기서 관리하고 진행 상황을 추적합니다.
            </p>

            {/* 전체 진행률 개요 */}
            <div style={{marginBottom:32,padding:'20px 24px',background:'#fff',border:'1px solid #e5e5ea',borderRadius:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
                <div style={{fontSize:14,fontWeight:700,color:'#1d1d1f'}}>전체 온보딩 진행률</div>
                <div style={{fontSize:13,fontFamily:M,fontWeight:700,color:'#007AFF'}}>
                  {tutorialStepsList.filter(s=>completedSteps.includes(s.n)).length}/{tutorialStepsList.length}
                </div>
              </div>
              <div style={{height:8,background:'#f0f0f5',borderRadius:4,overflow:'hidden',marginBottom:16}}>
                <div style={{
                  height:'100%',
                  width:`${Math.round(tutorialStepsList.filter(s=>completedSteps.includes(s.n)).length/tutorialStepsList.length*100)}%`,
                  background:'#34c759',borderRadius:4,transition:'width .3s',
                }}/>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {CHAPTERS.map(ch => {
                  const chSteps = tutorialStepsList.filter(s=>ch.steps.includes(s.n))
                  const chDone = chSteps.filter(s=>completedSteps.includes(s.n)).length
                  const allDone = chSteps.length>0 && chDone===chSteps.length
                  return (
                    <div key={ch.title} style={{
                      fontSize:11,fontFamily:M,fontWeight:600,padding:'5px 10px',borderRadius:20,
                      background:allDone?'#e8f9ee':'#f5f5f7',color:allDone?'#34c759':'#6e6e73',
                    }}>
                      {ch.title.split(' · ')[0]} {chDone}/{chSteps.length}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 지금 화면 제어 */}
            <div style={{marginBottom:32}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f',marginBottom:8}}>지금 화면 제어</div>
              <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:12}}>
                지금 뭘 하고 있든 상관없이 환자 앱을 즉시 대기 화면(검정 화면)으로 돌려보냅니다.
              </p>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async () => {
                  await setDoc(doc(getDb(),'tutorialConfig',code), { steps: [0], requestedAt: new Date() }, {merge:true})
                }} style={{...smallBtn,background:'#1d1d1f'}}>대기 화면으로 전환</button>
                <button onClick={async () => {
                  await setDoc(doc(getDb(),'tutorialConfig',code), { steps: [10], requestedAt: new Date() }, {merge:true})
                }} style={{...smallBtn,background:'#0071e3'}}>대기 해제 (키보드 모드로)</button>
              </div>
            </div>

            {/* 튜토리얼 · 캘리브레이션 단계 열기 */}
            <div style={{marginBottom:32}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f'}}>튜토리얼 · 캘리브레이션 단계 열기</div>
                <div style={{flex:1}}/>
                <button onClick={()=>setFocusMode(v=>!v)}
                  style={{fontSize:11,color:'#0071e3',background:'none',border:'1px solid #d2e6fb',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                  {focusMode ? '전체 목록 보기' : '포커스 모드 (화상통화용)'}
                </button>
              </div>
              {focusMode ? (() => {
                // 번호 눌렀을 때 바로 실행되지 않고, 먼저 미리보기만 하고 "지금 실행"을 눌러야 실제로 전송됨
                const currentStep = tutorialStepsList.find(s => s.n === previewStep)
                  ?? tutorialStepsList.find(s => s.n === activeStep)
                  ?? tutorialStepsList.find(s => !completedSteps.includes(s.n))
                const suggestingNext = !currentStep || currentStep.n !== activeStep
                const isCalibrationStep = !!currentStep && currentStep.n <= 3
                const isTutorialStep = !!currentStep && currentStep.n >= 4 && activeStep === currentStep.n
                const running = !!currentStep && runningStep === currentStep.n
                const runningPractice = !!currentStep && runningAction?.step === currentStep.n && runningAction.type === 'practice'
                const runningRetry = !!currentStep && runningAction?.step === currentStep.n && runningAction.type === 'retry'
                const runningAdvance = !!currentStep && runningAction?.step === currentStep.n && runningAction.type === 'advance'
                return (
                  <div>
                    <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:8}}>
                      화면 공유 보면서 실시간으로 단계를 열어줄 때 쓰는 모드입니다. 지금 환자 화면에 떠 있는 단계만 크게 보여줍니다.
                    </p>
                    {(() => {
                      const rs = reflectionStatus(activeStep, deviceStatus, requestedAt)
                      return (
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:16}}>
                          <span style={{width:8,height:8,borderRadius:'50%',background:rs.color,flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:600,color:rs.color}}>{rs.label}</span>
                        </div>
                      )
                    })()}
                    {currentStep ? (
                      <div style={{border:`2px solid ${suggestingNext?'#d2d2d7':'#007AFF'}`,borderRadius:16,padding:'32px 36px',background:suggestingNext?'#fafafa':'#f0f7ff'}}>
                        <div style={{fontSize:11,fontWeight:700,color:suggestingNext?'#8e8e93':'#007AFF',fontFamily:M,marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>
                          {suggestingNext ? '다음으로 열어줄 단계' : '지금 환자 화면에 열려있는 단계'}
                        </div>
                        <div style={{fontSize:24,fontWeight:700,color:'#1d1d1f',marginBottom:4}}>{currentStep.n}. {currentStep.label}</div>
                        <div style={{fontSize:14,color:'#8e8e93',fontFamily:M,marginBottom:16}}>{currentStep.desc}</div>
                        {currentStep.script && (
                          <div style={{fontSize:14,color:'#3a3a3c',lineHeight:1.65,marginBottom:20,padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e5e5ea'}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#8e8e93',textTransform:'uppercase',letterSpacing:'.04em',display:'block',marginBottom:5}}>환자에게 말하기</span>
                            💬 {currentStep.script}
                          </div>
                        )}
                        {completedSteps.includes(currentStep.n) && (() => {
                          const dur = fmtDur(stepDurations[String(currentStep.n)])
                          const shortStats = statsOf(blink.onboardingShortDurations)
                          const longStats  = statsOf(blink.onboardingLongDurations)
                          const cards: {label:string; value:string; sub?:string; color:string}[] = []
                          if (dur) cards.push({label:'완료까지 걸린 시간', value:dur, color:'#34c759'})
                          if (currentStep.n !== 2 && shortStats) cards.push({
                            label:'짧게 깜빡임 길이', value:`평균 ${fmtS(shortStats.mean)}`,
                            sub:`${shortStats.count}회 누적 · 최소 ${fmtS(shortStats.min)} ~ 최대 ${fmtS(shortStats.max)}`, color:'#007AFF',
                          })
                          if (currentStep.n !== 1 && longStats) cards.push({
                            label:'길게 깜빡임 길이', value:`평균 ${fmtS(longStats.mean)}`,
                            sub:`${longStats.count}회 누적 · 최소 ${fmtS(longStats.min)} ~ 최대 ${fmtS(longStats.max)}`, color:'#ff9500',
                          })
                          if (blink.dotDashBoundary != null && currentStep.n <= 3) cards.push({
                            label:'적용 중인 점·선 경계값', value:fmtS(blink.dotDashBoundary), color:'#ff3b30',
                          })
                          // 시도별 breakdown — 짧게 단계(n=1)는 onboardingShortAttempts, 길게 단계(n=2)는
                          // onboardingLongAttempts만 보여줌(위 카드들이 short/long을 나누는 것과 동일한 기준)
                          const attemptsField = currentStep.n === 1 ? 'onboardingShortAttempts' : currentStep.n === 2 ? 'onboardingLongAttempts' : null
                          const reps = attemptsField ? groupAttempts(blink[attemptsField]).slice(-5) : []
                          return (
                            <div style={{marginBottom:24}}>
                              <div style={{fontSize:14,fontWeight:700,color:'#34c759',marginBottom:cards.length?14:0}}>✓ 완료됨</div>
                              {cards.length > 0 && (
                                <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(cards.length,4)},1fr)`,gap:14}}>
                                  {cards.map(c => (
                                    <div key={c.label} style={{background:'#fff',border:'1px solid #e5e5ea',borderRadius:12,padding:'16px 18px'}}>
                                      <div style={{fontSize:10,color:'#8e8e93',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>{c.label}</div>
                                      <div style={{fontSize:20,fontWeight:700,color:c.color,fontFamily:M}}>{c.value}</div>
                                      {c.sub && <div style={{fontSize:11,color:'#aeaeb2',marginTop:6,fontFamily:M,lineHeight:1.5}}>{c.sub}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {reps.length > 0 && (
                                <div style={{marginTop:14}}>
                                  <div style={{fontSize:10,color:'#8e8e93',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>최근 시도별 breakdown</div>
                                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                                    {reps.map((tries, i) => (
                                      <div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,fontFamily:M,padding:'8px 12px',background:'#fff',border:'1px solid #e5e5ea',borderRadius:8,flexWrap:'wrap'}}>
                                        <span style={{fontWeight:700,color:'#3a3a3c',flexShrink:0}}>{i+1}번째</span>
                                        <span style={{color:'#8e8e93',flexShrink:0}}>{tries.length>1?`${tries.length}번 시도`:'1번에 성공'}</span>
                                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                                          {tries.map((t,j)=>(
                                            <span key={j} style={{padding:'2px 6px',borderRadius:5,background:t.success?'rgba(52,199,89,0.12)':'rgba(255,59,48,0.1)',color:t.success?'#34c759':'#ff3b30'}}>
                                              {fmtS(t.duration)}{t.success?' 성공':' 실패'}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {!completedSteps.includes(currentStep.n) && liveProgress?.step === currentStep.n && liveProgress.count > 0 && (
                          <div style={{fontSize:15,fontWeight:700,color:'#ff9500',fontFamily:M,marginBottom:14}}>{liveProgress.count}/{liveProgress.total}</div>
                        )}
                        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                          {isCalibrationStep && (
                            <>
                              <button type="button" disabled={!!runningAction} style={{...smallBtn,padding:'12px 22px',fontSize:15,background:'#34c759'}}
                                onClick={async()=>{ setRunningAction({step:currentStep.n,type:'practice'}); await setDoc(doc(getDb(),'tutorialConfig',code),{remoteActionType:'practice',remoteActionStep:currentStep.n,requestedAt:new Date()},{merge:true}); setRunningAction(null); setPreviewStep(null) }}>
                                {runningPractice?'실행 중...':'직접 해보기'}
                              </button>
                              <button type="button" disabled={!!runningAction} style={{...smallBtn,padding:'12px 22px',fontSize:15,background:'#ff3b30'}}
                                onClick={async()=>{ setRunningAction({step:currentStep.n,type:'retry'}); await setDoc(doc(getDb(),'tutorialConfig',code),{remoteActionType:'retry',remoteActionStep:currentStep.n,requestedAt:new Date()},{merge:true}); setRunningAction(null); setPreviewStep(null) }}>
                                {runningRetry?'실행 중...':'다시 하기'}
                              </button>
                            </>
                          )}
                          {isTutorialStep && (
                            <>
                              <button type="button" disabled={!!runningAction} style={{...smallBtn,padding:'12px 22px',fontSize:15,background:'#ff3b30'}}
                                onClick={async()=>{ setRunningAction({step:currentStep.n,type:'retry'}); await setDoc(doc(getDb(),'tutorialConfig',code),{remoteActionType:'retry',remoteActionStep:currentStep.n,requestedAt:new Date()},{merge:true}); setRunningAction(null); setPreviewStep(null) }}>
                                {runningRetry?'실행 중...':'다시 해보기'}
                              </button>
                              <button type="button" disabled={!!runningAction} style={{...smallBtn,padding:'12px 22px',fontSize:15,background:'#34c759'}}
                                onClick={async()=>{ setRunningAction({step:currentStep.n,type:'advance'}); await setDoc(doc(getDb(),'tutorialConfig',code),{remoteActionType:'advance',remoteActionStep:currentStep.n,requestedAt:new Date()},{merge:true}); setRunningAction(null); setPreviewStep(null) }}>
                                {runningAdvance?'실행 중...':'다음 단계'}
                              </button>
                            </>
                          )}
                          <button type="button" disabled={running} style={{...smallBtn,padding:'12px 22px',fontSize:15,background:'#0071e3'}}
                            onClick={async()=>{ setRunningStep(currentStep.n); await setDoc(doc(getDb(),'tutorialConfig',code),{steps:[currentStep.n],requestedAt:new Date()},{merge:true}); setRunningStep(null); setPreviewStep(null) }}>
                            {running?'실행 중...':(suggestingNext?'이 단계 열기':'지금 실행')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{padding:32,textAlign:'center',color:'#8e8e93',fontSize:13,border:'1px solid #e5e5ea',borderRadius:16}}>
                        전체 단계를 다 완료했어요 🎉
                      </div>
                    )}
                    <div style={{fontSize:11,color:'#8e8e93',marginTop:16,marginBottom:6}}>
                      번호를 누르면 위 카드에 미리보기만 되고, 실제로 환자 화면에 보내려면 위의 "지금 실행"/"이 단계 열기"를 눌러야 합니다.
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {tutorialStepsList.map(s => {
                        const isDone = completedSteps.includes(s.n)
                        const isCurrent = s.n === currentStep?.n
                        return (
                          <button key={s.n} type="button"
                            onClick={() => setPreviewStep(s.n === previewStep ? null : s.n)}
                            title={s.label}
                            style={{
                              width:32,height:32,borderRadius:8,fontSize:11,fontFamily:M,fontWeight:700,cursor:'pointer',
                              border: isCurrent ? '2px solid #007AFF' : '1px solid #d2d2d7',
                              background: isDone ? '#34c759' : isCurrent ? '#f0f7ff' : '#fff',
                              color: isDone ? '#fff' : isCurrent ? '#007AFF' : '#8e8e93',
                            }}>
                            {s.n}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })() : (
              <>
              <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:12}}>
                단계를 선택하고 열면 환자 앱에서 해당 단계가 실행됩니다. 1~3은 눈 깜빡임 캘리브레이션, 4~9는 실제 사용법 튜토리얼입니다.
                완료 여부는 실시간으로 아래에 표시되니, 이전 단계 완료를 확인한 뒤 직접 다음 단계를 열어주세요.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:20,marginBottom:12}}>
                {CHAPTERS.map(ch => {
                  const chSteps = tutorialStepsList.filter(s => ch.steps.includes(s.n))
                  const chDone = chSteps.filter(s=>completedSteps.includes(s.n)).length
                  return (
                  <div key={ch.title}>
                    <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#1d1d1f'}}>{ch.title}</div>
                      <div style={{fontSize:11,color:'#8e8e93'}}>{ch.desc}</div>
                      <div style={{flex:1}}/>
                      <div style={{fontSize:11,fontFamily:M,fontWeight:600,color:chDone===chSteps.length?'#34c759':'#8e8e93'}}>{chDone}/{chSteps.length}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {chSteps.map(s => {
                  const checked = tutorialSteps.includes(s.n)
                  const done = completedSteps.includes(s.n)
                  const running = runningStep === s.n
                  const isCalibrationStep = s.n <= 3 // 1~3(짧게/길게/혼합) — "직접 해보기"/"다시 하기"
                  // 지금 환자 화면에 실제로 떠 있는 단계일 때만 "다시 해보기"/"다음 단계"를 보여줌 —
                  // 아직 열어주지 않은 단계에서 눌러도 의미가 없으므로 버튼 자체를 숨김
                  const isTutorialStep = s.n >= 4 && activeStep === s.n
                  const runningPractice = runningAction?.step === s.n && runningAction.type === 'practice'
                  const runningRetry = runningAction?.step === s.n && runningAction.type === 'retry'
                  const runningAdvance = runningAction?.step === s.n && runningAction.type === 'advance'
                  return (
                    <label key={s.n} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:`1.5px solid ${checked?'#007AFF':'#d2d2d7'}`,borderRadius:10,cursor:'pointer',background:checked?'#f0f7ff':'#fff'}}>
                      <input type="checkbox" checked={checked} onChange={() =>
                        setTutorialSteps(prev => checked ? prev.filter(x=>x!==s.n) : [...prev,s.n].sort((a,b)=>a-b))
                      } style={{accentColor:'#007AFF',width:16,height:16}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:checked?'#007AFF':'#1d1d1f'}}>{s.n}. {s.label}</div>
                        <div style={{fontSize:11,color:'#8e8e93',fontFamily:M}}>{s.desc}</div>
                        {s.script && <div style={{fontSize:11,color:'#aeaeb2',marginTop:2,fontStyle:'italic'}}>💬 {s.script}</div>}
                      </div>
                      {done && (
                        <span style={{fontSize:11,fontWeight:700,color:'#34c759',fontFamily:M,flexShrink:0}}>
                          ✓ 완료{fmtDur(stepDurations[String(s.n)]) ? ` · ${fmtDur(stepDurations[String(s.n)])}` : ''}
                        </span>
                      )}
                      {!done && liveProgress?.step === s.n && liveProgress.count > 0 && (
                        <span style={{fontSize:12,fontWeight:700,color:'#ff9500',fontFamily:M,flexShrink:0}}>{liveProgress.count}/{liveProgress.total}</span>
                      )}
                      {isCalibrationStep && (
                        <>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRunningAction({step:s.n, type:'practice'})
                              await setDoc(doc(getDb(),'tutorialConfig',code), { remoteActionType: 'practice', remoteActionStep: s.n, requestedAt: new Date() }, {merge:true})
                              setRunningAction(null)
                            }}
                            disabled={!!runningAction}
                            style={{...smallBtn,padding:'6px 12px',fontSize:11,flexShrink:0,background:'#34c759'}}
                          >
                            {runningPractice ? '실행 중...' : '직접 해보기'}
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRunningAction({step:s.n, type:'retry'})
                              await setDoc(doc(getDb(),'tutorialConfig',code), { remoteActionType: 'retry', remoteActionStep: s.n, requestedAt: new Date() }, {merge:true})
                              setRunningAction(null)
                            }}
                            disabled={!!runningAction}
                            style={{...smallBtn,padding:'6px 12px',fontSize:11,flexShrink:0,background:'#ff3b30'}}
                          >
                            {runningRetry ? '실행 중...' : '다시 하기'}
                          </button>
                        </>
                      )}
                      {isTutorialStep && (
                        <>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRunningAction({step:s.n, type:'retry'})
                              await setDoc(doc(getDb(),'tutorialConfig',code), { remoteActionType: 'retry', remoteActionStep: s.n, requestedAt: new Date() }, {merge:true})
                              setRunningAction(null)
                            }}
                            disabled={!!runningAction}
                            style={{...smallBtn,padding:'6px 12px',fontSize:11,flexShrink:0,background:'#ff3b30'}}
                          >
                            {runningRetry ? '실행 중...' : '다시 해보기'}
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRunningAction({step:s.n, type:'advance'})
                              await setDoc(doc(getDb(),'tutorialConfig',code), { remoteActionType: 'advance', remoteActionStep: s.n, requestedAt: new Date() }, {merge:true})
                              setRunningAction(null)
                            }}
                            disabled={!!runningAction}
                            style={{...smallBtn,padding:'6px 12px',fontSize:11,flexShrink:0,background:'#34c759'}}
                          >
                            {runningAdvance ? '실행 중...' : '다음 단계'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setRunningStep(s.n)
                          await setDoc(doc(getDb(),'tutorialConfig',code), { steps: [s.n], requestedAt: new Date() }, {merge:true})
                          setRunningStep(null)
                        }}
                        disabled={running}
                        style={{...smallBtn,padding:'6px 12px',fontSize:11,flexShrink:0,background:'#0071e3'}}
                      >
                        {running ? '실행 중...' : '지금 실행'}
                      </button>
                    </label>
                  )
                    })}
                    </div>
                  </div>
                  )
                })}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async () => {
                  if (!tutorialSteps.length) return
                  setTutorialSending(true)
                  await setDoc(doc(getDb(),'tutorialConfig',code), {
                    steps: tutorialSteps,
                    requestedAt: new Date(),
                  }, {merge:true})
                  setTutorialSending(false)
                }} disabled={tutorialSending||!tutorialSteps.length} style={smallBtn}>
                  {tutorialSending ? '전송 중...' : `단계 열기 (${tutorialSteps.length}개 선택)`}
                </button>
                <button onClick={()=>setTutorialSteps([])}
                  style={{...smallBtn,background:'#f5f5f7',color:'#3c3c43',border:'none'}}>선택 해제</button>
              </div>
              </>
              )}
            </div>

            {/* 캘리브레이션 조정 */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f',marginBottom:8}}>캘리브레이션 조정</div>
              <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:16}}>
                눈깜빡임 감지 파라미터를 수동으로 조정합니다. 변경 즉시 앱에 반영됩니다.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 48px'}}>
                {/* 점/선 경계값 */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#6e6e73',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>점·선 경계값 (초)</div>
                  {(() => {
                    const shorts: number[] = blink.onboardingShortDurations ?? []
                    const longs:  number[] = blink.onboardingLongDurations  ?? []
                    const boundary = editBoundary ?? blink.dotDashBoundary ?? 0.6
                    const allVals  = [...shorts, ...longs]
                    const maxVal   = Math.max(...allVals, boundary * 1.5, 1.2)
                    const toX = (v: number) => Math.round(v / maxVal * 100)
                    return (
                      <div>
                        {/* 분포 시각화 */}
                        {allVals.length > 0 && (
                          <div style={{position:'relative',height:40,marginBottom:8,background:'#f5f5f7',borderRadius:8,overflow:'hidden'}}>
                            {shorts.map((v,i) => (
                              <div key={`s${i}`} style={{position:'absolute',left:`${toX(v)}%`,top:4,width:3,height:14,background:'#007AFF',borderRadius:2,opacity:.6}}/>
                            ))}
                            {longs.map((v,i) => (
                              <div key={`l${i}`} style={{position:'absolute',left:`${toX(v)}%`,top:22,width:3,height:14,background:'#ff9500',borderRadius:2,opacity:.6}}/>
                            ))}
                            <div style={{position:'absolute',left:`${toX(boundary)}%`,top:0,width:2,height:40,background:'#ff3b30'}}/>
                          </div>
                        )}
                        {allVals.length > 0 && (
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#aeaeb2',marginBottom:12}}>
                            <span style={{color:'#007AFF'}}>● 짧게 ({shorts.length}회)</span>
                            <span style={{color:'#ff9500'}}>● 길게 ({longs.length}회)</span>
                            <span style={{color:'#ff3b30'}}>│ 경계</span>
                          </div>
                        )}
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <input type="range" min={0.20} max={1.20} step={0.01}
                            value={boundary}
                            onChange={e => setEditBoundary(parseFloat(e.target.value))}
                            style={{flex:1,accentColor:'#ff3b30'}}
                          />
                          <span style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#ff3b30',minWidth:48}}>{boundary.toFixed(2)}s</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#aeaeb2',marginTop:4,marginBottom:16}}>
                          <span>빠름 0.20s</span><span>느림 1.20s</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                {/* 입력 대기 시간 */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#6e6e73',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>입력 대기 시간 (초)</div>
                  <p style={{fontSize:12,color:'#6e6e73',lineHeight:1.6,marginBottom:12}}>깜빡임 후 이 시간 안에 다음 깜빡임이 없으면 현재까지 입력한 모스코드를 확정합니다.</p>
                  {(() => {
                    const timer = editTimer ?? (blink.blinkTimerInterval ?? 2.5)
                    return (
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                          <input type="range" min={1.5} max={4.0} step={0.1}
                            value={timer}
                            onChange={e => setEditTimer(parseFloat(e.target.value))}
                            style={{flex:1,accentColor:'#007AFF'}}
                          />
                          <span style={{fontFamily:M,fontSize:14,fontWeight:700,color:'#007AFF',minWidth:48}}>{timer.toFixed(1)}s</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#aeaeb2',marginBottom:16}}>
                          <span>빠름 1.5s</span><span>느림 4.0s</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
              {(editBoundary !== null || editTimer !== null) && (
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onClick={async () => {
                    setCalibSaving(true)
                    const update: Record<string,number> = {}
                    if (editBoundary !== null) update.dotDashBoundary = editBoundary
                    if (editTimer !== null) update.blinkTimerInterval = editTimer
                    await setDoc(doc(getDb(),'blinkProfiles',code), update, {merge: true})
                    if (editBoundary !== null) setBlink((b:any) => ({...b, dotDashBoundary: editBoundary}))
                    if (editTimer !== null) setBlink((b:any) => ({...b, blinkTimerInterval: editTimer}))
                    setEditBoundary(null); setEditTimer(null); setCalibSaving(false)
                  }} disabled={calibSaving} style={smallBtn}>
                    {calibSaving ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => { setEditBoundary(null); setEditTimer(null) }}
                    style={{...smallBtn, background:'#f5f5f7', color:'#3c3c43', border:'none'}}>취소</button>
                </div>
              )}
            </div>
          </div>
          )
        })()}

        {/* ── 기능 관리 ── */}
        {tab==='기능관리' && (() => {
          const toggleRow = (f: {key:string;label:string;morse:string;defaultOn:boolean}, i: number, list: typeof FEATURE_FLAGS) => {
            const enabled = f.key in featureFlags ? featureFlags[f.key] : f.defaultOn
            const isLast = i === list.length - 1
            return (
              <div key={f.key} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'14px 20px',
                borderBottom: isLast ? 'none' : '1px solid #f0f0f5',
                background: enabled ? '#fff' : '#fafafa',
              }}>
                <div>
                  <div style={{fontSize:14,fontWeight:500,color: enabled ? '#1d1d1f' : '#aeaeb2'}}>{f.label}</div>
                  <div style={{fontSize:11,fontFamily:M,color:'#aeaeb2',marginTop:2}}>{f.morse}</div>
                </div>
                <button
                  disabled={flagSaving === f.key}
                  onClick={async () => {
                    const next = !enabled
                    setFlagSaving(f.key)
                    try {
                      await setDoc(doc(getDb(),'featureFlags',code), { [f.key]: next }, { merge: true })
                      setFeatureFlags(prev => ({...prev, [f.key]: next}))
                    } finally {
                      setFlagSaving(null)
                    }
                  }}
                  style={{
                    position:'relative',width:44,height:26,borderRadius:13,border:'none',cursor:'pointer',
                    background: enabled ? '#34c759' : '#d1d1d6',
                    transition:'background .2s',padding:0,flexShrink:0,
                    opacity: flagSaving === f.key ? 0.5 : 1,
                  }}
                >
                  <span style={{
                    position:'absolute',top:3,left: enabled ? 21 : 3,
                    width:20,height:20,borderRadius:'50%',background:'#fff',
                    boxShadow:'0 1px 3px rgba(0,0,0,.25)',transition:'left .2s',display:'block',
                  }}/>
                </button>
              </div>
            )
          }
          return (
          <div style={{maxWidth:560}}>
            <ColTitle>기능 관리</ColTitle>

            {/* 모드 접근 제어 — 개별 기능보다 넓은 의미 */}
            <div style={{marginBottom:32}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f',marginBottom:8}}>모드 접근 제어</div>
              <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:12}}>
                튜토리얼 진행 상황에 맞춰 아직 배우지 않은 모드로 넘어가지 못하도록 막습니다. 꺼진 모드는 전환을 시도해도 진입하지 않습니다.
              </p>
              <div style={{border:'1px solid #d2d2d7',borderRadius:12,overflow:'hidden'}}>
                {MODE_FLAGS.map((f, i) => toggleRow(f, i, MODE_FLAGS))}
              </div>
            </div>

            {/* 개별 기능 관리 */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f',marginBottom:8}}>개별 기능 관리</div>
              <p style={{fontSize:12,color:'#8e8e93',lineHeight:1.6,marginBottom:12}}>
                각 기능의 모스부호 입력이 실행되지 않도록 차단합니다. 꺼진 기능은 모스부호가 입력되어도 앱에서 아무 반응이 없습니다.
              </p>
              <div style={{border:'1px solid #d2d2d7',borderRadius:12,overflow:'hidden'}}>
                {FEATURE_FLAGS.map((f, i) => toggleRow(f, i, FEATURE_FLAGS))}
              </div>
              <p style={{fontSize:11,color:'#aeaeb2',marginTop:12}}>변경 즉시 앱에 반영됩니다 (실시간 동기화)</p>
            </div>
          </div>
          )
        })()}

        {/* ── 설정 ── */}
        {tab==='설정' && (
          <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 48px'}}>
            {/* 자주 쓰는 표현 */}
            <div>
              <ColTitle>자주 쓰는 표현 ({shortcuts.length}/24)</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:16}}>환자가 자주 사용하는 표현 목록입니다. 단축어 모드에서 직접 선택할 수 있습니다.</p>
              <div style={{marginBottom:12}}>
                {editSC===null
                  ? <button onClick={()=>setEditSC([...shortcuts])} style={smallBtn}>편집</button>
                  : <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>setEditSC(null)} style={{...smallBtn,background:'#f5f5f7',color:'#3c3c43',border:'none'}}>취소</button>
                      <button onClick={async()=>{setSaving(true);const items=(editSC||[]).map(s=>s.trim()).filter(Boolean);await setDoc(doc(getDb(),'shortcuts',code),{items});setShortcuts(items);setEditSC(null);setSaving(false)}} style={smallBtn} disabled={saving}>{saving?'저장 중...':'저장'}</button>
                    </div>
                }
              </div>
              {(editSC??shortcuts).map((item:string,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #f5f5f7'}}>
                  <span style={{fontSize:10,fontFamily:M,color:'#d1d1d6',minWidth:20,textAlign:'right'}}>{i+1}</span>
                  {editSC!==null
                    ? <input value={item||''} onChange={e=>{const a=[...(editSC||[])];a[i]=e.target.value;setEditSC(a)}} style={{flex:1,border:'none',borderBottom:'1px solid #d2d2d7',outline:'none',fontSize:13,fontFamily:F,color:'#1d1d1f',padding:'2px 0',background:'transparent'}}/>
                    : <span style={{flex:1,fontSize:13}}>{item||'—'}</span>
                  }
                  {editSC!==null && <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{if(!i)return;const a=[...(editSC||[])];[a[i-1],a[i]]=[a[i],a[i-1]];setEditSC(a)}} style={iconBtn}>↑</button>
                    <button onClick={()=>{if(i===(editSC||[]).length-1)return;const a=[...(editSC||[])];[a[i],a[i+1]]=[a[i+1],a[i]];setEditSC(a)}} style={iconBtn}>↓</button>
                    <button onClick={()=>setEditSC((editSC||[]).filter((_:any,j:number)=>j!==i))} style={{...iconBtn,color:'#ff3b30'}}>✕</button>
                  </div>}
                </div>
              ))}
              {editSC!==null && editSC.length<24 && <button onClick={()=>setEditSC([...editSC,''])} style={{marginTop:8,padding:'6px 0',border:'none',background:'transparent',color:'#06c',fontSize:13,cursor:'pointer',fontFamily:F}}>+ 추가</button>}
            </div>

            {/* YouTube 검색어 */}
            <div>
              <ColTitle>YouTube 검색어 ({youtube.length}/24)</ColTitle>
              <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7,marginBottom:16}}>YouTube 검색 모드에서 표시되는 추천 검색어 목록입니다.</p>
              <div style={{marginBottom:12}}>
                {editYT===null
                  ? <button onClick={()=>setEditYT([...youtube])} style={smallBtn}>편집</button>
                  : <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>setEditYT(null)} style={{...smallBtn,background:'#f5f5f7',color:'#3c3c43',border:'none'}}>취소</button>
                      <button onClick={async()=>{setSaving(true);const items=(editYT||[]).map(s=>s.trim()).filter(Boolean);await setDoc(doc(getDb(),'youtubeSuggestions',code),{items});setYoutube(items);setEditYT(null);setSaving(false)}} style={smallBtn} disabled={saving}>{saving?'저장 중...':'저장'}</button>
                    </div>
                }
              </div>
              {(editYT??youtube).map((item:string,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #f5f5f7'}}>
                  <span style={{fontSize:10,fontFamily:M,color:'#d1d1d6',minWidth:20,textAlign:'right'}}>{i+1}</span>
                  {editYT!==null
                    ? <input value={item||''} onChange={e=>{const a=[...(editYT||[])];a[i]=e.target.value;setEditYT(a)}} style={{flex:1,border:'none',borderBottom:'1px solid #d2d2d7',outline:'none',fontSize:13,fontFamily:F,color:'#1d1d1f',padding:'2px 0',background:'transparent'}}/>
                    : <span style={{flex:1,fontSize:13}}>{item||'—'}</span>
                  }
                  {editYT!==null && <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{if(!i)return;const a=[...(editYT||[])];[a[i-1],a[i]]=[a[i],a[i-1]];setEditYT(a)}} style={iconBtn}>↑</button>
                    <button onClick={()=>{if(i===(editYT||[]).length-1)return;const a=[...(editYT||[])];[a[i],a[i+1]]=[a[i+1],a[i]];setEditYT(a)}} style={iconBtn}>↓</button>
                    <button onClick={()=>setEditYT((editYT||[]).filter((_:any,j:number)=>j!==i))} style={{...iconBtn,color:'#ff3b30'}}>✕</button>
                  </div>}
                </div>
              ))}
              {editYT!==null && editYT.length<24 && <button onClick={()=>setEditYT([...editYT,''])} style={{marginTop:8,padding:'6px 0',border:'none',background:'transparent',color:'#06c',fontSize:13,cursor:'pointer',fontFamily:F}}>+ 추가</button>}
            </div>
          </div>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-.3px',margin:'0 0 12px',color:'#1d1d1f'}}>{children}</h2>
}
function Bar({ val, max, color }: { val: number; max: number; color: string }) {
  const w = max > 0 ? Math.round(val/max*100) : 0
  return (
    <div style={{height:6,background:'#f0f0f5',borderRadius:3,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${w}%`,background:color,borderRadius:3,transition:'width .3s'}}/>
    </div>
  )
}
function MetricRow({ label, today, total, color }: { label: string; today: number; total: number; color: string }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:12,color:'#1d1d1f',fontWeight:500}}>{label}</span>
        <span style={{fontFamily:M,fontSize:12,fontWeight:700,color:today>0?color:'#d1d1d6'}}>{today>0?today.toLocaleString():'—'}</span>
      </div>
      <Bar val={today} max={Math.max(total,today,1)} color={today>0?color:'#d1d1d6'}/>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
        <span style={{fontSize:10,color:'#aeaeb2'}}>오늘</span>
        <span style={{fontSize:10,color:'#aeaeb2'}}>누적 {total.toLocaleString()}</span>
      </div>
    </div>
  )
}
function DTd({ v, accent, c }: { v?: number; accent?: boolean; c?: string }) {
  const val = n(v)
  return <td style={{padding:'9px 10px',textAlign:'right',fontFamily:M,fontSize:11,color:val>0?(c||(accent?'#06c':'#1d1d1f')):'#d1d1d6'}}>{val>0?val.toLocaleString():'—'}</td>
}
const smallBtn: React.CSSProperties = { padding:'5px 14px',borderRadius:7,border:'1px solid #d2d2d7',background:'#1d1d1f',color:'#fff',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:F }
const iconBtn: React.CSSProperties = { padding:'2px 5px',border:'1px solid #d2d2d7',borderRadius:4,background:'#fff',color:'#3c3c43',fontSize:10,cursor:'pointer' }

// ── 일별 데이터 섹션 ──────────────────────────────────────────
const DAILY_METRICS = [
  { key: 'speakCount',        label: '말하기',    color: '#1d1d1f' },
  { key: 'callCount',         label: '호출',      color: '#ff3b30' },
  { key: 'messageSentCount',  label: '문자',      color: '#06c'    },
  { key: 'iotCount',          label: 'IoT',       color: '#ff9500' },
  { key: 'youtubeSelectCount',label: 'YouTube',   color: '#5856d6' },
  { key: 'keyboardInputTotal',label: '키보드',    color: '#06c'    },
  { key: 'aiInputTotal',      label: 'AI',        color: '#5856d6' },
  { key: 'shortcutInputTotal',label: '단축어',    color: '#34c759' },
]

function DailySection({ daily }: { daily: any[] }) {
  const [focus, setFocus] = useState<string>('speakCount')
  if (!daily.length) return <p style={{fontSize:13,color:'#aeaeb2'}}>데이터 없음</p>

  // 메트릭별 최대값 계산
  const maxVal: Record<string, number> = {}
  DAILY_METRICS.forEach(m => {
    maxVal[m.key] = Math.max(1, ...daily.map(d => n(d[m.key])))
  })
  const maxSession = Math.max(1, ...daily.map(d => n(d.sessionSeconds)))

  // 전일 대비 델타
  function delta(arr: any[], i: number, key: string) {
    if (i >= arr.length - 1) return null
    const cur = n(arr[i][key]), prev = n(arr[i+1][key])
    if (prev === 0 && cur === 0) return null
    return cur - prev
  }

  const focusMetric = DAILY_METRICS.find(m => m.key === focus)!

  return (
    <div>
      {/* 메트릭 선택 탭 */}
      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:24}}>
        {DAILY_METRICS.map(m => (
          <button key={m.key} onClick={()=>setFocus(m.key)} style={{
            padding:'5px 12px',borderRadius:20,border:'none',
            background:focus===m.key?m.color:'#f5f5f7',
            color:focus===m.key?'#fff':'#3c3c43',
            fontSize:12,fontWeight:focus===m.key?600:400,cursor:'pointer',fontFamily:F
          }}>{m.label}</button>
        ))}
      </div>

      {/* 포커스 메트릭 막대 차트 */}
      <div style={{marginBottom:32}}>
        <div style={{fontSize:11,fontWeight:600,color:'#6e6e73',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:12}}>
          {focusMetric.label} 추이 (최근 {Math.min(daily.length,21)}일)
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:80,paddingBottom:20,position:'relative' as const}}>
          {daily.slice(0,21).reverse().map((d:any,i:number,arr:any[])=>{
            const val = n(d[focus])
            const h = Math.round(val / maxVal[focus] * 64)
            const isToday = i === arr.length - 1
            return (
              <div key={d.id} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2}}>
                {val > 0 && <span style={{fontSize:9,color:focusMetric.color,fontWeight:600,fontFamily:M}}>{val}</span>}
                <div style={{width:'100%',borderRadius:'3px 3px 0 0',background:isToday?focusMetric.color:`${focusMetric.color}55`,height:`${h+2}px`,minHeight:2,transition:'height .2s'}}/>
                <span style={{fontSize:8,color:'#aeaeb2',whiteSpace:'nowrap' as const,transform:'rotate(-45deg)',transformOrigin:'top left',marginLeft:3}}>{d.date?.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 전체 지표 히트맵 테이블 */}
      <div style={{overflowX:'auto' as const}}>
        <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12}}>
          <thead>
            <tr style={{borderBottom:'2px solid #1d1d1f'}}>
              <th style={{padding:'8px 12px 10px',textAlign:'left' as const,fontSize:10,fontWeight:600,color:'#6e6e73',textTransform:'uppercase' as const,letterSpacing:'.07em',minWidth:90}}>날짜</th>
              {DAILY_METRICS.map(m => (
                <th key={m.key} onClick={()=>setFocus(m.key)} style={{
                  padding:'8px 10px 10px',textAlign:'right' as const,fontSize:10,fontWeight:focus===m.key?700:500,
                  color:focus===m.key?m.color:'#6e6e73',textTransform:'uppercase' as const,
                  letterSpacing:'.07em',cursor:'pointer',whiteSpace:'nowrap' as const
                }}>
                  {focus===m.key?'▸ ':''}{m.label}
                </th>
              ))}
              <th style={{padding:'8px 10px 10px',textAlign:'right' as const,fontSize:10,fontWeight:500,color:'#6e6e73',textTransform:'uppercase' as const,letterSpacing:'.07em',whiteSpace:'nowrap' as const}}>사용 시간</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d:any,i:number)=>{
              const isToday = i === 0
              return (
                <tr key={d.id} style={{borderBottom:'1px solid #f5f5f7',background:isToday?'#f5f9ff':''}}>
                  <td style={{padding:'9px 12px',fontFamily:M,fontSize:11,fontWeight:isToday?700:400,color:isToday?'#06c':'#1d1d1f',whiteSpace:'nowrap' as const}}>
                    {d.date}{isToday?' ●':''}
                  </td>
                  {DAILY_METRICS.map(m => {
                    const val = n(d[m.key])
                    const intensity = maxVal[m.key] > 0 ? val / maxVal[m.key] : 0
                    const d2 = delta(daily, i, m.key)
                    return (
                      <td key={m.key} style={{
                        padding:'7px 10px',textAlign:'right' as const,
                        background:val>0?`${m.color}${Math.round(intensity*22+6).toString(16).padStart(2,'0')}`:'transparent',
                      }}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}>
                          {d2 !== null && (
                            <span style={{fontSize:9,color:d2>0?'#34c759':d2<0?'#ff3b30':'#aeaeb2',fontWeight:600}}>
                              {d2>0?`+${d2}`:d2}
                            </span>
                          )}
                          <span style={{fontFamily:M,fontWeight:val>0?600:400,color:val>0?m.color:'#d1d1d6'}}>{val>0?val:'—'}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td style={{padding:'9px 10px',textAlign:'right' as const,fontFamily:M,fontSize:11,color:'#6e6e73'}}>
                    {(() => {
                      const v = n(d.sessionSeconds)
                      const p = Math.round(v/maxSession*100)
                      return (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                          <div style={{width:40,height:3,background:'#f0f0f5',borderRadius:2}}>
                            <div style={{height:'100%',width:`${p}%`,background:'#1d1d1f',borderRadius:2}}/>
                          </div>
                          <span>{fmtT(v)}</span>
                        </div>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 발화 기록 섹션 (날짜별 + 빈도 순위) ────────────────────────
function SpeakLogSection({ speaks }: { speaks: any[] }) {
  const [view, setView] = useState<'daily'|'ranking'>('daily')
  const [selectedDate, setSelectedDate] = useState<string|null>(null)

  // 날짜별 그룹핑
  const byDate: Record<string, any[]> = {}
  speaks.forEach(s => {
    const d = s.date || (s.timestamp?.toDate ? s.timestamp.toDate().toISOString().slice(0,10) : '—')
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(s)
  })
  const dates = Object.keys(byDate).sort((a,b) => b.localeCompare(a))

  // 빈도 순위
  const freq: Record<string, number> = {}
  speaks.forEach(s => { if (s.text) freq[s.text] = (freq[s.text] || 0) + 1 })
  const ranked = Object.entries(freq).sort((a,b) => b[1]-a[1])
  const maxFreq = ranked[0]?.[1] || 1

  const curDate = selectedDate || dates[0]
  const curSpeak = byDate[curDate] || []

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
      {/* 왼쪽: 날짜별 목록 */}
      <div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <ColTitle>날짜별 발화 내역</ColTitle>
          <span style={{fontSize:12,color:'#6e6e73'}}>총 {speaks.length}회</span>
        </div>
        {/* 날짜 탭 */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:16}}>
          {dates.map(d => (
            <button key={d} onClick={()=>setSelectedDate(d)} style={{
              padding:'4px 10px',borderRadius:20,border:'none',
              background:curDate===d?'#1d1d1f':'#f5f5f7',
              color:curDate===d?'#fff':'#3c3c43',
              fontSize:11,fontWeight:curDate===d?600:400,cursor:'pointer',
              fontFamily:F,whiteSpace:'nowrap'
            }}>
              {d.slice(5)} <span style={{opacity:.6}}>({byDate[d].length})</span>
            </button>
          ))}
        </div>
        {/* 선택된 날짜의 발화 목록 */}
        <div style={{borderTop:'2px solid #1d1d1f'}}>
          {curSpeak.length === 0 && <p style={{fontSize:13,color:'#aeaeb2',paddingTop:12}}>데이터 없음</p>}
          {curSpeak.map((s: any, i: number) => {
            const ts = s.timestamp?.toDate ? s.timestamp.toDate() : null
            const timeStr = ts ? ts.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—'
            const aiW: string[] = s.aiWords||[], scW: string[] = s.shortcutWords||[]
            const tokens = buildTokens(s.text||'', aiW, scW)
            return (
              <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 0',borderBottom:'1px solid #f5f5f7'}}>
                <span style={{fontFamily:M,fontSize:11,color:'#aeaeb2',whiteSpace:'nowrap',paddingTop:3,minWidth:56}}>{timeStr}</span>
                <div style={{flex:1}}>
                  {/* 전체 문장 */}
                  <div style={{fontSize:15,fontWeight:500,color:'#1d1d1f',marginBottom:6,lineHeight:1.5}}>
                    {s.text||'—'}
                  </div>
                  {/* 입력 방법 색상 분류 */}
                  {tokens.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:4}}>
                      {tokens.map((t,j) => (
                        <span key={j} style={{fontSize:11,padding:'1px 6px',borderRadius:4,
                          background:t.source==='ai'?'#f0efff':t.source==='shortcut'?'#edfaee':'#eef4ff',
                          color:t.source==='ai'?'#5856d6':t.source==='shortcut'?'#34c759':'#007AFF'}}>
                          {t.text}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:8}}>
                    {s.keyboardCount>0 && <span style={{fontSize:10,color:'#aeaeb2'}}>⌨️ 키보드 {s.keyboardCount}자</span>}
                    {s.aiCount>0 && <span style={{fontSize:10,color:'#5856d6'}}>✨ AI {aiW.join(', ')}</span>}
                    {s.shortcutCount>0 && <span style={{fontSize:10,color:'#34c759'}}>⭐ 단축어 {scW.join(', ')}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 오른쪽: 빈도 순위 */}
      <div>
        <div style={{marginBottom:20}}>
          <ColTitle>문장·단어 빈도 순위</ColTitle>
          <p style={{fontSize:13,color:'#6e6e73',lineHeight:1.7}}>말하기 버튼을 누른 전체 기록에서 가장 많이 입력한 문장/단어 순위입니다.</p>
        </div>
        <div style={{borderTop:'2px solid #1d1d1f'}}>
          {ranked.slice(0,50).map(([text, cnt], i) => (
            <div key={text} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:'1px solid #f5f5f7'}}>
              <span style={{fontFamily:M,fontSize:11,color:'#d1d1d6',minWidth:20,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{marginBottom:4,fontSize:13,color:'#1d1d1f',fontWeight:500}}>{text}</div>
                <div style={{height:3,background:'#f0f0f5',borderRadius:2}}>
                  <div style={{height:'100%',width:`${Math.round(cnt/maxFreq*100)}%`,background:'#1d1d1f',borderRadius:2}}/>
                </div>
              </div>
              <span style={{fontFamily:M,fontSize:13,fontWeight:700,color:'#1d1d1f',minWidth:24,textAlign:'right'}}>{cnt}</span>
              <span style={{fontSize:11,color:'#aeaeb2'}}>회</span>
            </div>
          ))}
          {ranked.length === 0 && <p style={{fontSize:13,color:'#aeaeb2',paddingTop:12}}>데이터 없음</p>}
        </div>
      </div>
    </div>
  )
}

function buildTokens(text: string, aiW: string[], scW: string[]): {text:string;source:'ai'|'shortcut'|'keyboard'}[] {
  if(!text) return []
  const known=[...aiW.map(w=>({text:w,source:'ai' as const})),...scW.map(w=>({text:w,source:'shortcut' as const}))]
  const out: {text:string;source:'ai'|'shortcut'|'keyboard'}[]=[]
  let rem=text.trim()
  while(rem.length>0){
    rem=rem.trimStart(); if(!rem) break
    let matched=false
    for(const k of known){if(rem.startsWith(k.text)){out.push({text:k.text,source:k.source});rem=rem.slice(k.text.length);matched=true;break}}
    if(!matched){let end=rem.length;for(const k of known){const idx=rem.indexOf(k.text);if(idx>0&&idx<end)end=idx};const w=rem.slice(0,end).trim();if(w)out.push({text:w,source:'keyboard'});rem=rem.slice(end)}
  }
  return out.filter(t=>t.text.trim())
}

// ── 교육 레슨 패널 ────────────────────────────────────────────────
const F2 = "system-ui,-apple-system,'SF Pro Text',sans-serif"
const M2 = "'SF Mono','Fira Mono',monospace"

type LessonBtn = { label:string; key:string; morse:string; instr:string; mode:string }

const KEYBOARD_JAUM: LessonBtn[] = [
  {label:'ㄱ', key:'jamo_ㄱ', morse:'112',  instr:'ㄱ을 입력해보세요', mode:'keyboard'},
  {label:'ㄴ', key:'jamo_ㄴ', morse:'1121', instr:'ㄴ을 입력해보세요', mode:'keyboard'},
  {label:'ㄷ', key:'jamo_ㄷ', morse:'121',  instr:'ㄷ을 입력해보세요', mode:'keyboard'},
  {label:'ㄹ', key:'jamo_ㄹ', morse:'1112', instr:'ㄹ을 입력해보세요', mode:'keyboard'},
  {label:'ㅁ', key:'jamo_ㅁ', morse:'1122', instr:'ㅁ을 입력해보세요', mode:'keyboard'},
  {label:'ㅂ', key:'jamo_ㅂ', morse:'1212', instr:'ㅂ을 입력해보세요', mode:'keyboard'},
  {label:'ㅅ', key:'jamo_ㅅ', morse:'1111', instr:'ㅅ을 입력해보세요', mode:'keyboard'},
  {label:'ㅇ', key:'jamo_ㅇ', morse:'111',  instr:'ㅇ을 입력해보세요', mode:'keyboard'},
  {label:'ㅈ', key:'jamo_ㅈ', morse:'1211', instr:'ㅈ을 입력해보세요', mode:'keyboard'},
  {label:'ㅊ', key:'jamo_ㅊ', morse:'1221', instr:'ㅊ을 입력해보세요', mode:'keyboard'},
  {label:'ㅋ', key:'jamo_ㅋ', morse:'2112', instr:'ㅋ을 입력해보세요', mode:'keyboard'},
  {label:'ㅌ', key:'jamo_ㅌ', morse:'2121', instr:'ㅌ을 입력해보세요', mode:'keyboard'},
  {label:'ㅍ', key:'jamo_ㅍ', morse:'2211', instr:'ㅍ을 입력해보세요', mode:'keyboard'},
  {label:'ㅎ', key:'jamo_ㅎ', morse:'2111', instr:'ㅎ을 입력해보세요', mode:'keyboard'},
]
const KEYBOARD_MOUM: LessonBtn[] = [
  {label:'ㅏ', key:'jamo_ㅏ', morse:'21',  instr:'ㅏ를 입력해보세요', mode:'keyboard'},
  {label:'ㅓ', key:'jamo_ㅓ', morse:'221', instr:'ㅓ를 입력해보세요', mode:'keyboard'},
  {label:'ㅗ', key:'jamo_ㅗ', morse:'222', instr:'ㅗ를 입력해보세요', mode:'keyboard'},
  {label:'ㅜ', key:'jamo_ㅜ', morse:'122', instr:'ㅜ를 입력해보세요', mode:'keyboard'},
  {label:'ㅡ', key:'jamo_ㅡ', morse:'212', instr:'ㅡ를 입력해보세요', mode:'keyboard'},
  {label:'ㅣ', key:'jamo_ㅣ', morse:'211', instr:'ㅣ를 입력해보세요', mode:'keyboard'},
]
const KEYBOARD_BTNS: LessonBtn[] = [
  {label:'말하기',   key:'speak',      morse:'11',    instr:'말하기를 해보세요',          mode:'keyboard'},
  {label:'호출',     key:'call',       morse:'22',    instr:'호출을 해보세요',            mode:'keyboard'},
  {label:'잠금',     key:'lock',       morse:'2',     instr:'잠금을 해보세요',            mode:'function'},
  {label:'잠금해제', key:'lock',       morse:'2',     instr:'잠금 해제를 해보세요',       mode:'function'},
  {label:'삭제',     key:'delete',     morse:'1',     instr:'삭제를 해보세요',            mode:'keyboard'},
  {label:'초기화',   key:'reset',      morse:'11211', instr:'초기화를 해보세요',          mode:'keyboard'},
  {label:'기능전환', key:'toFunction', morse:'11112', instr:'기능 모드로 전환해보세요',   mode:'keyboard'},
  {label:'단축어전환',key:'toShortcut',morse:'21111', instr:'단축어 모드로 전환해보세요', mode:'keyboard'},
  {label:'키보드전환',key:'toKeyboard',morse:'11121', instr:'키보드 모드로 전환해보세요', mode:'shortcut'},
]
const FUNCTION_BTNS: LessonBtn[] = [
  {label:'보내기',     key:'send',       morse:'1',   instr:'보내기를 해보세요',     mode:'function'},
  {label:'잠그기',     key:'lock',       morse:'2',   instr:'잠그기를 해보세요',     mode:'function'},
  {label:'잠금해제',   key:'lock',       morse:'2',   instr:'잠금 해제를 해보세요',  mode:'function'},
  {label:'반복말하기', key:'repeatSpeak',morse:'112', instr:'반복 말하기를 해보세요', mode:'function'},
  {label:'유튜브',     key:'youtubeOn',  morse:'111', instr:'유튜브를 실행해보세요',  mode:'function'},
  {label:'콘센트1',    key:'outlet1',    morse:'12',  instr:'콘센트1을 제어해보세요', mode:'function'},
  {label:'콘센트2',    key:'outlet2',    morse:'211', instr:'콘센트2를 제어해보세요', mode:'function'},
  {label:'콘센트3',    key:'outlet3',    morse:'121', instr:'콘센트3을 제어해보세요', mode:'function'},
]

function LessonPanel({ code, getDb }: { code: string; getDb: ()=>any }) {
  const [modeTab, setModeTab] = useState<'keyboard'|'function'|'free'>('keyboard')

  async function setStep(btn: LessonBtn) {
    await setDoc(doc(getDb(),'educationSessions',code), {
      lessonStep: { targetKey: btn.key, morse: btn.morse, instruction: btn.instr, mode: btn.mode }
    }, { merge: true })
  }
  async function clearStep() {
    await setDoc(doc(getDb(),'educationSessions',code), { lessonStep: null }, { merge: true })
  }

  function BtnChip({ b }: { b: LessonBtn }) {
    return (
      <button onClick={() => setStep(b)} style={{
        padding:'5px 10px',borderRadius:16,border:'1.5px solid #007AFF',
        background:'#fff',color:'#007AFF',fontSize:11,fontWeight:600,
        cursor:'pointer',fontFamily:F2,display:'flex',alignItems:'center',gap:4
      }}>
        <span style={{fontSize:13}}>{b.label}</span>
        <span style={{fontFamily:M2,fontSize:9,opacity:.55}}>{b.morse}</span>
      </button>
    )
  }

  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:'#007AFF'}}>🎯 연습</span>
        {(['keyboard','function','free'] as const).map(t => (
          <button key={t} onClick={()=>setModeTab(t)} style={{
            padding:'3px 10px',borderRadius:20,border:'none',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F2,
            background: modeTab===t ? '#007AFF' : '#f0f0f5',
            color: modeTab===t ? '#fff' : '#6e6e73',
          }}>
            {t==='keyboard'?'키보드':t==='function'?'기능':'자유입력'}
          </button>
        ))}
        <button onClick={clearStep} style={{padding:'3px 10px',borderRadius:20,border:'1px solid #d2d2d7',background:'#fff',color:'#8e8e93',fontSize:10,cursor:'pointer',fontFamily:F2,marginLeft:'auto'}}>
          자유 입력
        </button>
      </div>

      {modeTab === 'keyboard' && (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:9,fontWeight:700,color:'#8e8e93',minWidth:20}}>자음</span>
            {KEYBOARD_JAUM.map(b=><BtnChip key={b.key+b.label} b={b}/>)}
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:9,fontWeight:700,color:'#8e8e93',minWidth:20}}>모음</span>
            {KEYBOARD_MOUM.map(b=><BtnChip key={b.key+b.label} b={b}/>)}
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:9,fontWeight:700,color:'#8e8e93',minWidth:20}}>버튼</span>
            {KEYBOARD_BTNS.map(b=><BtnChip key={b.key+b.label} b={b}/>)}
          </div>
        </div>
      )}
      {modeTab === 'function' && (
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {FUNCTION_BTNS.map(b=><BtnChip key={b.key+b.label} b={b}/>)}
        </div>
      )}
    </div>
  )
}

// ── 세션 기록 (시각화) ─────────────────────────────────────────────
function SessionSection({ sessions }: { sessions: any[] }) {
  const Ff = "system-ui,-apple-system,'SF Pro Text',sans-serif"
  const Mm = "'SF Mono','Fira Mono',monospace"
  const [tooltip, setTooltip] = useState<{x:number;y:number;lines:string[]}|null>(null)

  function fmtDur(sec: number) {
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60
    if (h > 0) return `${h}시간 ${m}분`
    if (m > 0) return `${m}분 ${s}초`
    return `${s}초`
  }
  function fmtTime(ts:{seconds:number}) {
    return new Date(ts.seconds*1000).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})
  }
  function dayLabel(date:string) {
    const d = new Date(date)
    const days = ['일','월','화','수','목','금','토']
    return { md: `${d.getMonth()+1}/${d.getDate()}`, dow: days[d.getDay()] }
  }

  const byDate: Record<string, any[]> = {}
  sessions.forEach(s => {
    const date = s.date || (s.start?.seconds ? new Date(s.start.seconds*1000).toISOString().slice(0,10) : '—')
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(s)
  })
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).slice(0,14)

  if (!sessions.length) return (
    <div style={{padding:'48px 0',textAlign:'center',color:'#aeaeb2',fontFamily:Ff,fontSize:13}}>
      세션 기록 없음 — 앱 업데이트 후부터 쌓입니다
    </div>
  )

  const allTotals = dates.map(d=>byDate[d].reduce((s,r)=>s+(r.duration??0),0))
  const maxTotal  = Math.max(...allTotals, 1)
  const totalAll  = allTotals.reduce((a,b)=>a+b,0)
  const avgDaily  = Math.round(totalAll / dates.length)

  // 가장 많이 사용한 시간대
  const hourBuckets = Array(24).fill(0)
  sessions.forEach(s => {
    if (s.start?.seconds) hourBuckets[new Date(s.start.seconds*1000).getHours()]++
  })
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets))

  return (
    <div style={{fontFamily:Ff}} onMouseLeave={()=>setTooltip(null)}>

      {/* 요약 카드 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:36}}>
        {[
          {label:'기록 일수', value:`${dates.length}일`, sub:'최근 기준'},
          {label:'총 사용 시간', value:fmtDur(totalAll), sub:'누적'},
          {label:'일 평균', value:fmtDur(avgDaily), sub:'사용 시간'},
          {label:'주요 사용 시간대', value:`${peakHour}–${peakHour+1}시`, sub:'가장 자주 켬'},
        ].map(c=>(
          <div key={c.label} style={{padding:'16px 20px',background:'#f9f9fb',borderRadius:14,border:'1px solid #ebebef'}}>
            <div style={{fontSize:11,color:'#8e8e93',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:'#1d1d1f',letterSpacing:'-.5px'}}>{c.value}</div>
            <div style={{fontSize:10,color:'#aeaeb2',marginTop:2}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 타임라인 헤더 */}
      <div style={{display:'flex',alignItems:'center',marginBottom:4,gap:0}}>
        <div style={{width:56,flexShrink:0}}/>
        <div style={{width:48,flexShrink:0,marginRight:12}}/>
        <div style={{flex:1,position:'relative',height:16}}>
          {[0,3,6,9,12,15,18,21,24].map(h=>(
            <div key={h} style={{position:'absolute',left:`${h/24*100}%`,fontSize:9,color:'#c7c7cc',fontFamily:Mm,transform:'translateX(-50%)'}}>
              {h===0?'0':h===12?'12':h===24?'':h}
            </div>
          ))}
        </div>
        <div style={{width:60,flexShrink:0}}/>
      </div>

      {/* 날짜별 행 */}
      {dates.map((date,di) => {
        const daySessions = byDate[date]
        const totalSec = allTotals[di]
        const totalPct = totalSec/maxTotal
        const {md,dow} = dayLabel(date)
        const isWeekend = dow==='토'||dow==='일'
        return (
          <div key={date} style={{
            display:'flex',alignItems:'center',gap:0,
            padding:'6px 0',
            borderBottom:'1px solid #f5f5f7',
          }}>
            {/* 날짜 */}
            <div style={{width:56,flexShrink:0,textAlign:'right',paddingRight:10}}>
              <div style={{fontSize:13,fontWeight:600,color:isWeekend?'#ff3b30':'#1d1d1f'}}>{md}</div>
              <div style={{fontSize:10,color:'#aeaeb2'}}>{dow}</div>
            </div>

            {/* 총 사용량 미니 바 */}
            <div style={{width:48,flexShrink:0,marginRight:12,display:'flex',alignItems:'center',gap:4}}>
              <div style={{flex:1,height:28,background:'#f0f0f5',borderRadius:4,overflow:'hidden',display:'flex',alignItems:'flex-end'}}>
                <div style={{
                  width:'100%',
                  height:`${Math.max(4,totalPct*100)}%`,
                  background: totalPct>0.6?'#007AFF':totalPct>0.25?'#34c759':'#5ac8fa',
                  borderRadius:'4px 4px 0 0',
                  transition:'height .3s'
                }}/>
              </div>
            </div>

            {/* 24h 타임라인 */}
            <div style={{flex:1,position:'relative',height:36,background:'#f5f5f7',borderRadius:8,overflow:'hidden'}}>
              {/* 시간 구분선 */}
              {[6,12,18].map(h=>(
                <div key={h} style={{position:'absolute',left:`${h/24*100}%`,top:0,bottom:0,width:1,background:'rgba(0,0,0,0.06)',zIndex:0}}/>
              ))}

              {/* 세션 블록 */}
              {daySessions.map((s,i) => {
                if (!s.start?.seconds) return null
                const startD = new Date(s.start.seconds*1000)
                const endD   = s.end?.seconds ? new Date(s.end.seconds*1000) : new Date(startD.getTime()+(s.duration||60)*1000)
                const dayStart = new Date(startD); dayStart.setHours(0,0,0,0)
                const startMin = (startD.getTime()-dayStart.getTime())/60000
                const endMin   = (endD.getTime()-dayStart.getTime())/60000
                const left  = `${Math.max(0,startMin/1440*100)}%`
                const width = `${Math.min(100,Math.max(0.5,(endMin-startMin)/1440*100))}%`
                const dur   = s.duration??0
                const color = dur<120
                  ? 'linear-gradient(135deg,#5ac8fa,#32ade6)'
                  : dur<600
                    ? 'linear-gradient(135deg,#0a84ff,#007AFF)'
                    : 'linear-gradient(135deg,#0051d5,#003baa)'
                return (
                  <div key={i}
                    style={{position:'absolute',left,width,top:4,bottom:4,background:color,borderRadius:4,cursor:'pointer',zIndex:2,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}
                    onMouseEnter={e=>{
                      const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
                      setTooltip({x:rect.left+rect.width/2,y:rect.top,
                        lines:[`${fmtTime(s.start)} → ${s.end?fmtTime(s.end):'진행중'}`,fmtDur(dur)]
                      })
                    }}
                  />
                )
              })}
            </div>

            {/* 오른쪽 정보 */}
            <div style={{width:60,flexShrink:0,paddingLeft:10,textAlign:'right'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#1d1d1f'}}>{fmtDur(totalSec)}</div>
              <div style={{fontSize:10,color:'#aeaeb2'}}>{daySessions.length}회</div>
            </div>
          </div>
        )
      })}

      {/* 시간 눈금 (하단) */}
      <div style={{display:'flex',marginTop:4,gap:0}}>
        <div style={{width:56+48+12,flexShrink:0}}/>
        <div style={{flex:1,position:'relative',height:12}}>
          {['자정','6시','정오','18시','자정'].map((l,i)=>(
            <div key={l+i} style={{position:'absolute',left:`${i*25}%`,transform:'translateX(-50%)',fontSize:9,color:'#c7c7cc',fontFamily:Mm}}>{l}</div>
          ))}
        </div>
        <div style={{width:60,flexShrink:0}}/>
      </div>

      {/* 범례 */}
      <div style={{display:'flex',gap:20,marginTop:20,alignItems:'center'}}>
        <span style={{fontSize:11,color:'#8e8e93',fontWeight:500}}>세션 길이</span>
        {[
          {color:'linear-gradient(135deg,#5ac8fa,#32ade6)',label:'2분 미만'},
          {color:'linear-gradient(135deg,#0a84ff,#007AFF)',label:'2–10분'},
          {color:'linear-gradient(135deg,#0051d5,#003baa)',label:'10분 이상'},
        ].map(({color,label})=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:16,height:10,background:color,borderRadius:3}}/>
            <span style={{fontSize:11,color:'#6e6e73'}}>{label}</span>
          </div>
        ))}
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          position:'fixed',left:tooltip.x,top:tooltip.y-8,transform:'translate(-50%,-100%)',
          background:'rgba(28,28,30,0.92)',backdropFilter:'blur(12px)',
          color:'#fff',fontFamily:Mm,
          padding:'8px 14px',borderRadius:10,pointerEvents:'none',zIndex:9999,
          boxShadow:'0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {tooltip.lines.map((l,i)=>(
            <div key={i} style={{fontSize:i===0?12:11,fontWeight:i===0?500:400,opacity:i===0?1:0.7,whiteSpace:'nowrap'}}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
