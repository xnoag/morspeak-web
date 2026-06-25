'use client'
import { use, useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, query, orderBy, getDocs, where, deleteDoc, setDoc, limit } from 'firebase/firestore'

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

const KBD_C = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const KBD_V = ['ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ','ㅐ','ㅒ','ㅔ','ㅖ']
const FN_BTNS = [
  ['말하기','11','btn_fn_speak'],['초기화','11211','btn_fn_reset'],['호출','22','btn_fn_call'],
  ['AI 추천','12','btn_fn_ai'],['딜리트','1','btn_fn_delete'],['커맨드','2','btn_fn_command'],
  ['잠그기','2(기능)','btn_fn_lock'],['→ 키보드','11112','btn_fn_toKeyboard'],['→ 단축어','21111','btn_fn_toShortcut'],
  ['콘센트01','12(기능)','iotOutlet1Count'],['콘센트02','211','iotOutlet2Count'],['콘센트03','121','iotOutlet3Count'],
]
const TABS = ['오늘 현황', '사용 분석', '발화 기록', '버튼 통계', '일별 데이터', '설정']

export default function PatientDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [tab, setTab] = useState('오늘 현황')
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

  // 일별 최대값 (바 차트 기준)
  const maxSpeak = Math.max(1,...daily.map(d=>n(d.speakCount)))

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',fontFamily:F,color:'#6e6e73',fontSize:14}}>불러오는 중...</div>

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:F,color:'#1d1d1f'}}>

      {/* 상단 탭 바 — Apple Report 스타일 */}
      <div style={{borderBottom:'1px solid #d2d2d7',position:'sticky',top:0,zIndex:50,background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 48px',display:'flex',alignItems:'center',gap:0}}>
          <a href="/tracking/dashboard" style={{color:'#06c',textDecoration:'none',fontSize:12,padding:'14px 16px 14px 0',borderRight:'1px solid #d2d2d7',marginRight:4,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
            <svg width="5" height="9" viewBox="0 0 5 9" fill="none"><path d="M4.5 1L1 4.5L4.5 8" stroke="#06c" strokeWidth="1.4" strokeLinecap="round"/></svg>
            목록
          </a>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{padding:'14px 16px',border:'none',borderBottom:tab===t?'2px solid #1d1d1f':'2px solid transparent',background:'transparent',fontSize:12,fontWeight:tab===t?600:400,color:tab===t?'#1d1d1f':'#6e6e73',cursor:'pointer',fontFamily:F,whiteSpace:'nowrap',marginBottom:-1}}>
              {t}
            </button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={async()=>{
            if(!confirm(`"${stats.userName||code}" 전체 데이터를 삭제합니다.`)) return
            setDeleting(true); const db=getDb()
            const [d1,d2,d3]=await Promise.all([getDocs(collection(db,'usageStats',code,'daily')),getDocs(collection(db,'chats',code,'messages')),getDocs(collection(db,'usageStats',code,'speaks'))])
            await Promise.all([...d1.docs,...d2.docs,...d3.docs].map(d=>deleteDoc(d.ref)))
            await Promise.all([deleteDoc(doc(db,'usageStats',code)),deleteDoc(doc(db,'blinkProfiles',code)),deleteDoc(doc(db,'patients',code)),deleteDoc(doc(db,'chats',code)),deleteDoc(doc(db,'shortcuts',code)),deleteDoc(doc(db,'youtubeSuggestions',code))])
            const byCode=await getDocs(query(collection(db,'patients'),where('chatCode','==',code)))
            await Promise.all(byCode.docs.map(d=>deleteDoc(d.ref)))
            location.href='/tracking/dashboard'
          }} disabled={deleting} style={{fontSize:11,color:'#ff3b30',border:'none',background:'transparent',cursor:'pointer',fontFamily:F,padding:'0 0 0 16px'}}>
            {deleting?'삭제 중...':'삭제'}
          </button>
        </div>
      </div>

      {/* 보고서 제목 */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 48px 0'}}>
        <div style={{fontSize:11,fontWeight:500,color:'#6e6e73',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>
          Morspeak 사용 현황 보고서 · {todayKey()}
        </div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',paddingBottom:32,borderBottom:'1px solid #d2d2d7'}}>
          <div>
            <h1 style={{fontSize:40,fontWeight:700,letterSpacing:'-.5px',margin:'0 0 6px',lineHeight:1.1}}>{stats.userName||code}</h1>
            <p style={{fontSize:14,color:'#6e6e73',margin:0,lineHeight:1.6}}>
              {[stats.diagnosis,stats.hospital,stats.region].filter(Boolean).join(' · ')}
              <span style={{fontFamily:M,fontSize:12,color:'#aeaeb2',marginLeft:12}}>{code}</span>
            </p>
          </div>
          <div style={{textAlign:'right',fontSize:13,color:'#6e6e73',lineHeight:1.8}}>
            <div>보호자: <b style={{color:'#1d1d1f'}}>{stats.guardianName||'—'}</b>{stats.guardianRelation?` (${stats.guardianRelation})`:''}</div>
            <div style={{fontSize:11,color:'#aeaeb2',fontFamily:M}}>ID: {stats.loginId||'—'}</div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 48px 80px'}}>

        {/* ── 오늘 현황 ── */}
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
        {tab==='발화 기록' && <SpeakLogSection speaks={speaks} />}

        {/* ── 버튼 통계 ── */}
        {tab==='버튼 통계' && (
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
        {tab==='일별 데이터' && <DailySection daily={daily} />}

        {/* ── 설정 ── */}
        {tab==='설정' && (
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
        )}

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
              <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid #f5f5f7'}}>
                <span style={{fontFamily:M,fontSize:11,color:'#aeaeb2',whiteSpace:'nowrap',paddingTop:2,minWidth:56}}>{timeStr}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:3}}>
                    {tokens.map((t,j) => (
                      <span key={j} style={{fontSize:13,fontWeight:500,padding:'1px 6px',borderRadius:4,
                        background:t.source==='ai'?'#f0efff':t.source==='shortcut'?'#edfaee':'#eef4ff',
                        color:t.source==='ai'?'#5856d6':t.source==='shortcut'?'#34c759':'#06c'}}>
                        {t.text}
                      </span>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {s.keyboardCount>0 && <span style={{fontSize:10,color:'#aeaeb2'}}>키보드 {s.keyboardCount}</span>}
                    {s.aiCount>0 && <span style={{fontSize:10,color:'#5856d6'}}>AI {aiW.join(', ')}</span>}
                    {s.shortcutCount>0 && <span style={{fontSize:10,color:'#34c759'}}>단축어 {scW.join(', ')}</span>}
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
