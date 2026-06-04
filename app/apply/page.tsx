'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BlinkDetect, { BlinkProfile } from './BlinkDetect';

type Step = 'intro' | 'consent' | 'form' | 'detect' | 'complete';

interface FormData {
  patientName: string;
  caregiverName: string;
  caregiverContact: string;
  region: string;
  subRegion: string;
  communicationMethod: string;
  communicationMethodOther: string;
}

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const COMM_METHODS = ['추측', '직접 의사소통', '글자판', '안구마우스', '소통이 어려운 상태', '기타'];

const SUB_REGIONS: Record<string, string[]> = {
  '서울': ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구'],
  '경기': ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','양평군','가평군','연천군'],
  '인천': ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'],
  '부산': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
  '대구': ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'],
  '광주': ['동구','서구','남구','북구','광산구'],
  '대전': ['동구','중구','서구','유성구','대덕구'],
  '울산': ['중구','남구','동구','북구','울주군'],
  '세종': ['세종시'],
  '강원': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충북': ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충남': ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전북': ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전남': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경북': ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경남': ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주': ['제주시','서귀포시'],
};

const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
};

const font = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif';
const blue = '#1C1C1E';
const green = '#3A3A3C';
const lbl = '#000';
const lbl2 = 'rgba(60,60,67,0.6)';
const sep = 'rgba(60,60,67,0.18)';
const bg = '#F2F2F7';

const prevStepMap: Partial<Record<Step, Step>> = {
  consent: 'intro', form: 'consent', detect: 'form',
};

function Layout({ children, footer, onBack }: { children: React.ReactNode; footer: React.ReactNode; onBack?: () => void }) {
  return (
    <div style={{ minHeight: '100svh', background: bg, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: onBack ? '20px 20px 0' : '52px 20px 0', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {children}
      </div>
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
  const [form, setForm] = useState<FormData>({ patientName: '', caregiverName: '', caregiverContact: '', region: '', subRegion: '', communicationMethod: '', communicationMethodOther: '' });
  const [consents, setConsents] = useState({ privacy: false, video: false, marketing: false });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const goBack = () => { const p = prevStepMap[step]; if (p) setStep(p); };

  const handleDetectComplete = useCallback(async (profile: BlinkProfile) => {
    setIsUploading(true);
    setSubmitError('');
    try {
      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
      await addDoc(collection(db, 'screening_results'), {
        patientName: form.patientName,
        caregiverName: form.caregiverName,
        caregiverContact: form.caregiverContact,
        region: form.region,
        subRegion: form.subRegion ?? '',
        communicationMethod: form.communicationMethod === '기타' ? `기타: ${form.communicationMethodOther}` : (form.communicationMethod ?? ''),
        passed: true,
        dotDashBoundary: profile.boundary,
        shortDurations: profile.shortDurations,
        longDurations: profile.longDurations,
        deviceType,
        createdAt: serverTimestamp(),
      });
      setStep('complete');
    } catch (e) {
      console.error(e);
      setSubmitError('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  }, [form]);

  const needsSubRegion = form.region && SUB_REGIONS[form.region]?.length > 1;
  const commValid = form.communicationMethod && (form.communicationMethod !== '기타' || form.communicationMethodOther.trim());
  const isFormValid = !!(form.patientName && form.caregiverName && form.caregiverContact.length === 13 && form.region && (!needsSubRegion || form.subRegion) && commValid);
  const primaryBtn = (disabled?: boolean): React.CSSProperties => ({ padding: '16px', borderRadius: 980, border: 'none', background: disabled ? 'rgba(60,60,67,0.12)' : blue, color: disabled ? lbl2 : '#fff', fontSize: 17, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: font });
  const prevBtn: React.CSSProperties = { padding: '16px 20px', borderRadius: 980, border: `1.5px solid ${sep}`, background: '#fff', color: lbl2, fontSize: 17, fontWeight: 500, cursor: 'pointer', fontFamily: font };

  // ── INTRO ─────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Image src="/morspeak-logo2.svg" alt="Morspeak" width={148} height={42} priority style={{ marginBottom: 40 }} />
        <h1 style={{ fontSize: 32, fontWeight: 700, color: lbl, letterSpacing: '-0.5px', marginBottom: 16 }}>모스픽 사용 적합성 검사</h1>
        <p style={{ fontSize: 18, fontWeight: 400, color: lbl, lineHeight: 1.75 }}>
          모스픽을 활용하려면 눈 깜빡임이 원활해야 합니다. 짧은 테스트 후 사용 가능 여부를 안내해드릴게요.
        </p>
        <p style={{ fontSize: 14, color: lbl2, marginTop: 12 }}>약 3분 소요</p>
        <p style={{ fontSize: 14, color: lbl2, marginTop: 6 }}>카메라로 눈 깜빡임을 실시간 감지합니다.</p>
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
          ['수집 항목', '환우 이름, 보호자 이름·연락처, 거주 지역, 소통 방법'],
          ['수집 목적', '모스픽 앱 적합성 평가 및 결과 안내'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 파기'],
          ['제3자 제공', '없음'],
        ],
        fullText: `모스픽(이하 "회사")은 모스픽 사용 적합성 검사 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.\n\n수집하는 개인정보 항목은 환우 이름, 보호자 이름, 보호자 연락처, 거주 지역, 현재 소통 방법이며, 이는 모스픽 앱 적합성 평가 및 결과 안내 연락 목적으로만 활용됩니다.\n\n수집된 개인정보는 평가 완료 후 1년간 보관되며, 보유 기간 만료 시 즉시 파기됩니다. 제3자 제공 및 처리 위탁은 없습니다.\n\n귀하는 개인정보 수집·이용에 동의하지 않으실 권리가 있으나, 동의하지 않으실 경우 테스트 참여가 어렵습니다. 문의는 hello@morspeak.com으로 연락해주세요.`,
      },
      {
        key: 'video' as const, required: true, title: '카메라 및 눈 깜빡임 데이터 수집 동의',
        rows: [
          ['수집 항목', '카메라 영상 및 눈 깜빡임 측정값 (실시간 처리)'],
          ['수집 목적', '눈 깜빡임 패턴 분석을 통한 모스픽 사용 가능 여부 평가'],
          ['보유 기간', '평가 완료 후 1년, 이후 즉시 삭제'],
          ['제3자 제공', '없음'],
        ],
        fullText: `본 테스트 과정에서 카메라를 통해 환우의 눈 깜빡임을 실시간으로 감지합니다. 영상 자체는 저장되지 않으며, 눈 깜빡임의 지속 시간 등 측정값만 분석에 사용됩니다.\n\n수집된 데이터는 모스픽 앱 사용 가능 여부를 판단하기 위한 목적으로만 활용되며, 모스픽 내부 담당자 외에는 접근이 불가합니다.\n\n데이터는 평가 완료 후 1년이 경과하면 즉시 삭제됩니다. 삭제를 원하시는 경우 hello@morspeak.com으로 연락해주세요.`,
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

        <div style={{ background: 'rgba(60,60,67,0.05)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.6, margin: 0 }}>
            환우분이 직접 동의하기 어려운 경우, <strong style={{ color: lbl }}>보호자가 환우를 대신하여 동의</strong>할 수 있습니다.
          </p>
        </div>

        <button onClick={toggleAll} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, padding: '15px 16px', cursor: 'pointer', marginBottom: 12, fontFamily: font }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: lbl }}>전체 동의</span>
          <Check checked={allChecked} />
        </button>

        <div style={{ height: 1, background: sep, marginBottom: 12 }} />

        {items.map(item => (
          <div key={item.key} style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setConsents(c => ({ ...c, [item.key]: !c[item.key] }))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: lbl }}>{item.title}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: item.required ? '#FF3B30' : lbl2, background: item.required ? 'rgba(255,59,48,0.1)' : 'rgba(60,60,67,0.08)', padding: '2px 7px', borderRadius: 20 }}>
                  {item.required ? '필수' : '선택'}
                </span>
                <button onClick={e => { e.stopPropagation(); setExpanded(ex => ({ ...ex, [item.key]: !ex[item.key] })); }}
                  style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.45)', background: 'rgba(60,60,67,0.07)', padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: font }}>
                  {expanded[item.key] ? '접기' : '전체 보기'}
                </button>
              </div>
              <Check checked={consents[item.key]} />
            </div>
            <div style={{ borderTop: `1px solid ${sep}` }}>
              {item.rows.map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderTop: i > 0 ? `1px solid ${sep}` : 'none', background: 'rgba(60,60,67,0.02)' }}>
                  <span style={{ fontSize: 13, color: lbl2, minWidth: 64, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, color: lbl, lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
            {expanded[item.key] && (
              <div style={{ borderTop: `1px solid ${sep}`, padding: '14px 16px', background: 'rgba(60,60,67,0.02)' }}>
                <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' as const }}>{item.fullText}</p>
              </div>
            )}
          </div>
        ))}

        <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.6, marginTop: 12, marginBottom: 8 }}>
          필수 항목에 동의하지 않으시면 테스트에 참여하실 수 없습니다. 문의는 hello@morspeak.com으로 연락해주세요.
        </p>
      </Layout>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────
  if (step === 'form') return (
    <Layout
      onBack={goBack}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setStep('consent')} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
          <button style={{ ...primaryBtn(!isFormValid), flex: 1 }} disabled={!isFormValid} onClick={() => setStep('detect')}>다음</button>
        </div>
      }
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>정보 입력</h1>
      <p style={{ fontSize: 15, color: lbl2, marginBottom: 24 }}>보호자가 입력해주세요.</p>

      <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>환우 이름</label>
          <input type="text" placeholder="홍길동" value={form.patientName}
            onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }} />
        </div>
        <div style={{ height: 1, background: sep, margin: '0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>보호자 이름</label>
          <input type="text" placeholder="홍보호" value={form.caregiverName}
            onChange={e => setForm(f => ({ ...f, caregiverName: e.target.value }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }} />
        </div>
        <div style={{ height: 1, background: sep, margin: '0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>연락처</label>
          <input type="tel" placeholder="010-0000-0000" value={form.caregiverContact}
            onChange={e => setForm(f => ({ ...f, caregiverContact: formatPhone(e.target.value) }))}
            maxLength={13}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }} />
        </div>
        <div style={{ height: 1, background: sep, margin: '0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>거주 지역</label>
          <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value, subRegion: '' }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: form.region ? lbl : lbl2, padding: '15px 0', background: 'transparent', fontFamily: font, appearance: 'none' as const, cursor: 'pointer' }}>
            <option value="">선택</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {form.region && SUB_REGIONS[form.region] && (
          <>
            <div style={{ height: 1, background: sep, margin: '0 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>시/구/군</label>
              <select value={form.subRegion} onChange={e => setForm(f => ({ ...f, subRegion: e.target.value }))}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: form.subRegion ? lbl : lbl2, padding: '15px 0', background: 'transparent', fontFamily: font, appearance: 'none' as const, cursor: 'pointer' }}>
                <option value="">선택</option>
                {SUB_REGIONS[form.region].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>소통 방법</label>
          <select value={form.communicationMethod}
            onChange={e => setForm(f => ({ ...f, communicationMethod: e.target.value, communicationMethodOther: '' }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: form.communicationMethod ? lbl : lbl2, padding: '15px 0', background: 'transparent', fontFamily: font, appearance: 'none' as const, cursor: 'pointer' }}>
            <option value="">선택해주세요</option>
            {COMM_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {form.communicationMethod === '기타' && (
          <>
            <div style={{ height: 1, background: sep, margin: '0 16px' }} />
            <div style={{ padding: '0 16px' }}>
              <input placeholder="직접 입력해주세요" value={form.communicationMethodOther}
                onChange={e => setForm(f => ({ ...f, communicationMethodOther: e.target.value }))}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font, boxSizing: 'border-box' as const }} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );

  // ── DETECT ────────────────────────────────────────────────────
  if (step === 'detect') return (
    <>
      <BlinkDetect
        onComplete={handleDetectComplete}
        onBack={() => setStep('form')}
      />
      {isUploading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
          <p style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>저장 중...</p>
        </div>
      )}
      {submitError && (
        <div style={{ position: 'fixed', bottom: 40, left: 20, right: 20, zIndex: 9999, background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', fontFamily: font }}>
          <p style={{ fontSize: 15, color: '#FF3B30', marginBottom: 12 }}>{submitError}</p>
          <button onClick={() => setSubmitError('')} style={{ fontSize: 14, color: lbl2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font }}>닫기</button>
        </div>
      )}
    </>
  );

  // ── COMPLETE ──────────────────────────────────────────────────
  if (step === 'complete') return (
    <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="32" height="25" viewBox="0 0 32 25" fill="none"><path d="M2 12.5l10 10L30 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 12 }}>테스트 완료</h1>
        <p style={{ fontSize: 17, color: lbl2, lineHeight: 1.7 }}>
          눈 깜빡임 감지 테스트를 완료해 주셔서 감사합니다.<br /><br />
          모스픽 팀에서 결과를 확인한 후 <strong style={{ color: lbl }}>{form.caregiverContact}</strong>으로 연락드리겠습니다.<br />
          평균 <strong style={{ color: lbl }}>1~2일 이내</strong>에 안내 문자를 보내드립니다.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.35)', marginTop: 20 }}>창을 닫으셔도 됩니다.</p>
      </div>
    </div>
  );

  return null;
}
