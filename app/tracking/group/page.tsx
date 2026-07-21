'use client'
import React, { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'

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

const STORAGE_KEY = 'morspeak_tracking_group_codes'

const tutorialStepsList = [
  { n: 1, short: '짧게', label: '짧게 깜빡이기', desc: '캘리브레이션 · 짧게 ×5' },
  { n: 2, short: '길게', label: '길게 깜빡이기', desc: '캘리브레이션 · 길게 ×5' },
  { n: 3, short: '혼합', label: '혼합 깜빡이기', desc: '캘리브레이션 · 짧게/길게 혼합 ×5' },
  { n: 4, short: 'ㄱ', label: 'ㄱ 입력하기', desc: '짧게·짧게·길게 깜빡임' },
  { n: 5, short: 'ㅏ', label: 'ㅏ 입력하기', desc: '길게·짧게 깜빡임' },
  { n: 6, short: '말하기', label: '말하기', desc: '짧게·짧게 (11)' },
  { n: 7, short: '잠그기', label: '잠그기', desc: '길게·짧게·길게 (212)' },
  { n: 8, short: '잠금해제', label: '잠그기 해제', desc: '길게·짧게·길게 (212)' },
  { n: 9, short: 'AI추천', label: 'AI 추천', desc: '짧게·길게 (12)' },
  // 10은 "대기 해제" 명령과 겹쳐서 건너뜀
  { n: 11, short: 'AI선택', label: 'AI 추천 선택하기', desc: '길게·짧게 (21)' },
  { n: 12, short: '더보기', label: '더보기', desc: '길게 (2)' },
  { n: 13, short: '지우기', label: '지우기', desc: '짧게 (1)' },
  { n: 14, short: '초기화', label: '초기화', desc: '짧게·짧게·길게·짧게·짧게 (11211)' },
  { n: 15, short: '단축어전환', label: '단축어 모드 전환', desc: '길게·짧게·짧게·짧게·짧게 (21111)' },
  { n: 16, short: '표현선택', label: '표현 선택하기', desc: '길게·짧게 (21)' },
  { n: 17, short: '기능전환', label: '기능 모드 전환', desc: '짧게·짧게·짧게·짧게·길게 (11112)' },
  { n: 18, short: '호출', label: '호출', desc: '짧게·길게 (12, 기능모드)' },
]

const smallBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 7, border: '1px solid #d2d2d7', background: '#1d1d1f', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F }

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
]

const MODE_FLAGS: { key: string; label: string; morse: string; defaultOn: boolean }[] = [
  { key: 'keyboardMode', label: '키보드 모드 진입', morse: '●●●●━ (11112)', defaultOn: true },
  { key: 'shortcut',     label: '단축어 모드 진입', morse: '━●●●● (21111)', defaultOn: false },
  { key: 'functionMode', label: '기능 모드 진입',   morse: '(기능 버튼)',    defaultOn: false },
]

function parseCodes(raw: string): string[] {
  const codes = raw.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
  return Array.from(new Set(codes))
}

type RowState = {
  code: string
  userName?: string
  completedSteps: number[]
  liveProgress?: { step: number, count: number, total: number }
  activeStep?: number | null
  requestedAt?: any
  deviceStatus?: { screen: string, renderedStep: number | null } | null
}

// activeStep(관리자가 보낸 의도)과 deviceStatus.renderedStep(기기가 실제로 그리고 있는 화면)을 비교해서
// "명령을 보냈는데 화면이 안 바뀜"을 자동으로 감지 — patients/[code]/page.tsx와 동일한 판단 로직
function reflectionStatus(row: RowState): { label: string; color: string } {
  if (row.deviceStatus === undefined) return { label: '···', color: '#d1d1d6' }
  if (!row.deviceStatus) return { label: '기기 정보 없음', color: '#8e8e93' }
  const activeStep = row.activeStep ?? null
  const matches = (row.deviceStatus.renderedStep ?? null) === activeStep
  if (matches) return activeStep == null ? { label: '대기', color: '#8e8e93' } : { label: '반영됨', color: '#34c759' }
  const sentAgo = row.requestedAt?.toDate ? (Date.now() - row.requestedAt.toDate().getTime()) / 1000 : Infinity
  if (sentAgo < 8) return { label: '반영 중...', color: '#ff9500' }
  return { label: '반영 안 됨', color: '#ff3b30' }
}

export default function GroupTracking() {
  const [codes, setCodes] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [rawInput, setRawInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [sendingStep, setSendingStep] = useState<number | null>(null)
  const [sendingAction, setSendingAction] = useState<{step: number, type: string} | null>(null)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [runningStep, setRunningStep] = useState<{code: string, step: number} | null>(null)
  const [runningAction, setRunningAction] = useState<{code: string, step: number, type: string} | null>(null)
  const [resettingCode, setResettingCode] = useState<string | null>(null)
  const [groupFlags, setGroupFlags] = useState<Record<string, boolean>>({})
  const [flagSending, setFlagSending] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = parseCodes(saved)
      setCodes(parsed)
      setRawInput(parsed.join('\n'))
    } else {
      setEditing(true)
    }
  }, [])

  useEffect(() => {
    if (!codes.length) return
    const unsubs = codes.map(code => {
      const unsubConfig = onSnapshot(doc(getDb(), 'tutorialConfig', code), snap => {
        setRows(prev => ({
          ...prev,
          [code]: {
            ...(prev[code] ?? { code, completedSteps: [] }),
            code,
            completedSteps: (snap.data()?.completedSteps as number[]) ?? [],
            liveProgress: snap.data()?.liveProgress as RowState['liveProgress'],
            activeStep: (snap.data()?.activeStep as number | null | undefined) ?? null,
            requestedAt: snap.data()?.requestedAt ?? null,
          }
        }))
      })
      const unsubStats = onSnapshot(doc(getDb(), 'usageStats', code), snap => {
        setRows(prev => ({ ...prev, [code]: { ...(prev[code] ?? { code, completedSteps: [] }), code, userName: snap.data()?.userName } }))
      })
      const unsubDevice = onSnapshot(doc(getDb(), 'deviceStatus', code), snap => {
        const d = snap.data()
        setRows(prev => ({
          ...prev,
          [code]: {
            ...(prev[code] ?? { code, completedSteps: [] }),
            code,
            deviceStatus: d ? { screen: d.screen, renderedStep: d.renderedStep ?? null } : null,
          }
        }))
      })
      return () => { unsubConfig(); unsubStats(); unsubDevice() }
    })
    return () => unsubs.forEach(u => u())
  }, [codes])

  function saveCodes() {
    const parsed = parseCodes(rawInput)
    setCodes(parsed)
    localStorage.setItem(STORAGE_KEY, parsed.join('\n'))
    setEditing(false)
  }

  async function sendToAll(payload: Record<string, any>, stepForSpinner?: number) {
    if (!codes.length) return
    if (stepForSpinner !== undefined) setSendingStep(stepForSpinner)
    await Promise.all(codes.map(code => setDoc(doc(getDb(), 'tutorialConfig', code), { ...payload, requestedAt: new Date() }, { merge: true })))
    setSendingStep(null)
  }

  async function resetProgress(code: string) {
    if (!confirm(`${code}의 완료 체크(✓)를 전부 초기화할까요?`)) return
    setResettingCode(code)
    await setDoc(doc(getDb(), 'tutorialConfig', code), { completedSteps: [], liveProgress: null }, { merge: true })
    setResettingCode(null)
  }

  async function runStepNow(code: string, step: number) {
    setRunningStep({ code, step })
    await setDoc(doc(getDb(), 'tutorialConfig', code), { steps: [step], requestedAt: new Date() }, { merge: true })
    setRunningStep(null)
  }

  async function runAction(code: string, step: number, type: string) {
    setRunningAction({ code, step, type })
    await setDoc(doc(getDb(), 'tutorialConfig', code), { remoteActionType: type, remoteActionStep: step, requestedAt: new Date() }, { merge: true })
    setRunningAction(null)
  }

  async function sendActionToAll(step: number, type: string) {
    if (!codes.length) return
    setSendingAction({ step, type })
    await Promise.all(codes.map(code => setDoc(doc(getDb(), 'tutorialConfig', code), { remoteActionType: type, remoteActionStep: step, requestedAt: new Date() }, { merge: true })))
    setSendingAction(null)
  }

  async function setFlagForAll(key: string, next: boolean) {
    if (!codes.length) return
    setFlagSending(key)
    await Promise.all(codes.map(code => setDoc(doc(getDb(), 'featureFlags', code), { [key]: next }, { merge: true })))
    setGroupFlags(prev => ({ ...prev, [key]: next }))
    setFlagSending(null)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>
      <div style={{ height: 56, background: '#1d1d1f', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <a href="/tracking/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← 목록</a>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px' }}>그룹 교육 관리</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 20 }}>{codes.length}대</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing(v => !v)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: F, color: 'rgba(255,255,255,0.7)' }}>
          코드 목록 편집
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

        {editing && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1d1d1f' }}>이번 교육에 참여하는 계정 코드 붙여넣기 (쉼표/줄바꿈 구분)</div>
            <textarea value={rawInput} onChange={e => setRawInput(e.target.value)} rows={5}
              placeholder={'예)\nAB12CD\nEF34GH\n...'}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d2d2d7', fontFamily: M, fontSize: 13, resize: 'vertical' }} />
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={saveCodes} style={{ ...smallBtn, background: '#0071e3' }}>저장하고 불러오기</button>
            </div>
          </div>
        )}

        {!editing && codes.length > 0 && (
          <>
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>전체 일괄 제어 — {codes.length}대 전부에 동시 전송</div>
                <div style={{ flex: 1 }} />
                <button onClick={() => sendToAll({ steps: [0] }, 0)} disabled={sendingStep !== null || !!sendingAction} style={{ ...smallBtn, background: '#8e8e93' }}>
                  {sendingStep === 0 ? '전송 중...' : '전체 대기화면으로'}
                </button>
                <button onClick={() => sendToAll({ steps: [10] }, 10)} disabled={sendingStep !== null || !!sendingAction} style={{ ...smallBtn, background: '#34c759' }}>
                  {sendingStep === 10 ? '전송 중...' : '전체 대기 해제(키보드로)'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tutorialStepsList.map(s => {
                  const isCalibrationStep = s.n <= 3
                  const isTutorialStep = s.n >= 4
                  const busy = sendingStep !== null || !!sendingAction
                  const actionSending = (type: string) => sendingAction?.step === s.n && sendingAction.type === type
                  return (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e5ea', borderRadius: 10, background: '#fafafc' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{s.n}. {s.label}</div>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontFamily: M }}>{s.desc}</div>
                      </div>
                      {isCalibrationStep && (
                        <>
                          <button type="button" onClick={() => sendActionToAll(s.n, 'practice')} disabled={busy}
                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#34c759' }}>
                            {actionSending('practice') ? '전송 중...' : '직접 해보기'}
                          </button>
                          <button type="button" onClick={() => sendActionToAll(s.n, 'retry')} disabled={busy}
                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#ff3b30' }}>
                            {actionSending('retry') ? '전송 중...' : '다시 하기'}
                          </button>
                        </>
                      )}
                      {isTutorialStep && (
                        <>
                          <button type="button" onClick={() => sendActionToAll(s.n, 'retry')} disabled={busy}
                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#ff3b30' }}>
                            {actionSending('retry') ? '전송 중...' : '다시 해보기'}
                          </button>
                          <button type="button" onClick={() => sendActionToAll(s.n, 'advance')} disabled={busy}
                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#34c759' }}>
                            {actionSending('advance') ? '전송 중...' : '다음 단계'}
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => sendToAll({ steps: [s.n] }, s.n)} disabled={busy}
                        style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#0071e3' }}>
                        {sendingStep === s.n ? '전송 중...' : '지금 실행'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>모드 접근 제어 — {codes.length}대 전부에 동시 적용</div>
              <p style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12 }}>아직 배우지 않은 모드로 넘어가지 못하도록 전체 일괄로 막거나 열어줍니다.</p>
              <div style={{ border: '1px solid #d2d2d7', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                {MODE_FLAGS.map((f, i) => {
                  const enabled = f.key in groupFlags ? groupFlags[f.key] : f.defaultOn
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i === MODE_FLAGS.length - 1 ? 'none' : '1px solid #f0f0f5', background: enabled ? '#fff' : '#fafafa' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: enabled ? '#1d1d1f' : '#aeaeb2' }}>{f.label}</div>
                        <div style={{ fontSize: 10.5, fontFamily: M, color: '#aeaeb2', marginTop: 2 }}>{f.morse}</div>
                      </div>
                      <button disabled={flagSending === f.key} onClick={() => setFlagForAll(f.key, !enabled)}
                        style={{ position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: enabled ? '#34c759' : '#d1d1d6', opacity: flagSending === f.key ? 0.5 : 1, flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 3, left: enabled ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>개별 기능 관리 — {codes.length}대 전부에 동시 적용</div>
              <p style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12 }}>각 기능의 모스부호 입력이 실행되지 않도록 전체 일괄로 차단합니다.</p>
              <div style={{ border: '1px solid #d2d2d7', borderRadius: 12, overflow: 'hidden' }}>
                {FEATURE_FLAGS.map((f, i) => {
                  const enabled = f.key in groupFlags ? groupFlags[f.key] : f.defaultOn
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i === FEATURE_FLAGS.length - 1 ? 'none' : '1px solid #f0f0f5', background: enabled ? '#fff' : '#fafafa' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: enabled ? '#1d1d1f' : '#aeaeb2' }}>{f.label}</div>
                        <div style={{ fontSize: 10.5, fontFamily: M, color: '#aeaeb2', marginTop: 2 }}>{f.morse}</div>
                      </div>
                      <button disabled={flagSending === f.key} onClick={() => setFlagForAll(f.key, !enabled)}
                        style={{ position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: enabled ? '#34c759' : '#d1d1d6', opacity: flagSending === f.key ? 0.5 : 1, flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 3, left: enabled ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>참여자 진행 상태</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f2f2f7' }}>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em' }}>코드 / 이름</th>
                    {tutorialStepsList.map(s => (
                      <th key={s.n} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: '#8e8e93', whiteSpace: 'nowrap' }}>{s.n}. {s.short}</th>
                    ))}
                    <th style={{ padding: '10px 20px', width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {codes.map(code => {
                    const row = rows[code]
                    const done = row?.completedSteps ?? []
                    const expanded = expandedCode === code
                    return (
                      <React.Fragment key={code}>
                        <tr style={{ borderBottom: '1px solid #f7f7f7', cursor: 'pointer' }} onClick={() => setExpandedCode(expanded ? null : code)}>
                          <td style={{ padding: '13px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: '#1d1d1f' }}>{row?.userName || '(가입 대기 중)'}</span>
                              {(() => {
                                const rs = reflectionStatus(row ?? { code, completedSteps: [] })
                                return <span title={rs.label} style={{ width: 7, height: 7, borderRadius: '50%', background: rs.color, flexShrink: 0 }} />
                              })()}
                            </div>
                            <div style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M, marginTop: 1 }}>{code}</div>
                          </td>
                          {tutorialStepsList.map(s => {
                            const isDone = done.includes(s.n)
                            const lp = row?.liveProgress
                            const inProgress = !isDone && lp && lp.step === s.n && lp.count > 0
                            return (
                              <td key={s.n} style={{ padding: '13px 8px', textAlign: 'center' }}>
                                {isDone ? (
                                  <span style={{ fontSize: 14, color: '#34c759' }}>✓</span>
                                ) : inProgress ? (
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ff9500', fontFamily: M }}>{lp!.count}/{lp!.total}</span>
                                ) : (
                                  <span style={{ fontSize: 14, color: '#d1d1d6' }}>·</span>
                                )}
                              </td>
                            )
                          })}
                          <td style={{ padding: '13px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); resetProgress(code) }} disabled={resettingCode === code}
                              style={{ fontSize: 11, color: '#ff3b30', background: 'none', border: '1px solid #ffd7d3', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', marginRight: 10 }}>
                              {resettingCode === code ? '초기화 중...' : '체크 초기화'}
                            </button>
                            <span style={{ fontSize: 11, color: '#0071e3' }}>{expanded ? '개별 제어 접기 ▲' : '개별 제어 펼치기 ▼'}</span>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={tutorialStepsList.length + 2} style={{ padding: '16px 20px 20px', background: '#fafafc' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {tutorialStepsList.map(s => {
                                  const stepDone = done.includes(s.n)
                                  const isCalibrationStep = s.n <= 3
                                  // 지금 그 참여자 화면에 실제로 떠 있는 단계일 때만 "다시 해보기"/"다음 단계" 표시
                                  const isTutorialStep = s.n >= 4 && row?.activeStep === s.n
                                  const stepRunning = runningStep?.code === code && runningStep.step === s.n
                                  const actionRunning = (type: string) => runningAction?.code === code && runningAction.step === s.n && runningAction.type === type
                                  const anyBusy = (runningStep?.code === code) || (runningAction?.code === code)
                                  return (
                                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e5ea', borderRadius: 10, background: '#fff' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{s.n}. {s.label}</div>
                                        <div style={{ fontSize: 11, color: '#8e8e93', fontFamily: M }}>{s.desc}</div>
                                      </div>
                                      {stepDone && <span style={{ fontSize: 11, fontWeight: 700, color: '#34c759', fontFamily: M, flexShrink: 0 }}>✓ 완료</span>}
                                      {isCalibrationStep && (
                                        <>
                                          <button type="button" onClick={() => runAction(code, s.n, 'practice')} disabled={anyBusy}
                                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#34c759' }}>
                                            {actionRunning('practice') ? '실행 중...' : '직접 해보기'}
                                          </button>
                                          <button type="button" onClick={() => runAction(code, s.n, 'retry')} disabled={anyBusy}
                                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#ff3b30' }}>
                                            {actionRunning('retry') ? '실행 중...' : '다시 하기'}
                                          </button>
                                        </>
                                      )}
                                      {isTutorialStep && (
                                        <>
                                          <button type="button" onClick={() => runAction(code, s.n, 'retry')} disabled={anyBusy}
                                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#ff3b30' }}>
                                            {actionRunning('retry') ? '실행 중...' : '다시 해보기'}
                                          </button>
                                          <button type="button" onClick={() => runAction(code, s.n, 'advance')} disabled={anyBusy}
                                            style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#34c759' }}>
                                            {actionRunning('advance') ? '실행 중...' : '다음 단계'}
                                          </button>
                                        </>
                                      )}
                                      <button type="button" onClick={() => runStepNow(code, s.n)} disabled={anyBusy}
                                        style={{ ...smallBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0, background: '#0071e3' }}>
                                        {stepRunning ? '실행 중...' : '지금 실행'}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                              <div style={{ marginTop: 10 }}>
                                <a href={`/tracking/patients/${code}`} style={{ fontSize: 11, color: '#8e8e93', textDecoration: 'none' }}>전체 관리 페이지로 이동 →</a>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!editing && codes.length === 0 && (
          <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>먼저 "코드 목록 편집"으로 참여자 코드를 등록하세요.</div>
        )}
      </div>
    </div>
  )
}
