'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const APK_URL = 'https://storage.googleapis.com/morspeak-a5e46.firebasestorage.app/releases/morspeak-screening-v1.0.apk';
const APP_STORE_URL = ''; // iOS 출시 후 업데이트

type Platform = 'ios' | 'android' | 'unknown';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'unknown';
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [showApkGuide, setShowApkGuide] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const font = '-apple-system, "Pretendard Variable", "SF Pro Display", BlinkMacSystemFont, sans-serif';
  const dark = '#1c1e25';
  const sub = '#6e6e6e';
  const border = 'rgba(60,60,67,0.14)';
  const bg = '#f9f9f9';

  return (
    <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font }}>
      {/* Hero */}
      <div style={{ background: '#fff', padding: '52px 24px 0', maxWidth: 560, margin: '0 auto' }}>
        <Image src="/morspeak-logo2.svg" alt="Morspeak" width={130} height={37} priority style={{ marginBottom: 28 }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: dark, letterSpacing: '-0.4px', marginBottom: 28 }}>모스픽 사용 적합성 검사</h1>

        <p style={{ fontSize: 17, color: dark, lineHeight: 1.75, marginBottom: 8 }}>
          모스픽은 눈 깜빡임만으로 의사소통하는 ALS 환우용 보조기기입니다.
        </p>
        <p style={{ fontSize: 16, color: sub, lineHeight: 1.7, marginBottom: 32 }}>
          이 앱은 환우가 모스픽을 사용할 수 있는지 <strong style={{ color: dark }}>사전 적합성 검사</strong>를 진행합니다.
          보호자가 환우와 함께 약 <strong style={{ color: dark }}>3분</strong>간 진행해주세요.
        </p>

        {/* Steps */}
        <div style={{ background: bg, borderRadius: 16, padding: '20px 20px', marginBottom: 36 }}>
          {[
            { n: '1', text: '아래에서 스마트폰에 맞는 앱을 다운로드합니다.' },
            { n: '2', text: '앱을 실행 후 환우 정보를 입력합니다.' },
            { n: '3', text: '안내에 따라 눈 깜빡임 검사를 진행합니다.' },
            { n: '4', text: '결과를 제출하면 모스픽 팀이 1~2일 내 연락드립니다.' },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: n === '4' ? 0 : 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: dark, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {n}
              </div>
              <p style={{ fontSize: 15, color: dark, lineHeight: 1.6, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download Cards */}
      <div style={{ padding: '0 24px 16px', maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: sub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>다운로드</p>

        {/* iOS Card */}
        <div style={{
          border: `1.5px solid ${platform === 'ios' ? dark : border}`,
          borderRadius: 18,
          padding: '20px 20px',
          marginBottom: 12,
          background: platform === 'ios' ? '#f7f7f9' : '#fff',
          position: 'relative',
        }}>
          {platform === 'ios' && (
            <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 11, fontWeight: 700, background: dark, color: '#fff', padding: '3px 9px', borderRadius: 20, letterSpacing: '0.04em' }}>
              내 기기
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="#000"/>
              <path d="M14 6C10.5 6 8 9.5 8 13c0 4 2.5 9 6 9s6-5 6-9c0-3.5-2.5-7-6-7zm0 2c2.5 0 4 2.5 4 5s-1.5 7-4 7-4-4-4-7c0-2.5 1.5-5 4-5z" fill="white"/>
              <circle cx="11" cy="8" r="1.5" fill="white"/>
            </svg>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: dark, margin: 0 }}>iPhone / iPad</p>
              <p style={{ fontSize: 13, color: sub, margin: 0 }}>iOS 16 이상</p>
            </div>
          </div>

          {APP_STORE_URL ? (
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 0', borderRadius: 12, background: dark, color: '#fff', fontSize: 16, fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1l2.5 5 5.5.8-4 3.9.9 5.5L9 13.5 4.1 16.2l.9-5.5-4-3.9 5.5-.8L9 1z" fill="white"/></svg>
              App Store에서 다운로드
            </a>
          ) : (
            <div style={{ padding: '13px 0', borderRadius: 12, background: 'rgba(60,60,67,0.08)', textAlign: 'center' as const }}>
              <p style={{ fontSize: 15, color: sub, margin: 0, fontWeight: 500 }}>App Store 심사 진행 중</p>
              <p style={{ fontSize: 13, color: 'rgba(110,110,110,0.7)', margin: '3px 0 0' }}>곧 이용 가능합니다</p>
            </div>
          )}
        </div>

        {/* Android Card */}
        <div style={{
          border: `1.5px solid ${platform === 'android' ? dark : border}`,
          borderRadius: 18,
          padding: '20px 20px',
          marginBottom: 8,
          background: platform === 'android' ? '#f7f7f9' : '#fff',
          position: 'relative',
        }}>
          {platform === 'android' && (
            <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 11, fontWeight: 700, background: dark, color: '#fff', padding: '3px 9px', borderRadius: 20, letterSpacing: '0.04em' }}>
              내 기기
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="#3ddc84"/>
              <path d="M7 17h14v1.5a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5V17zm0-6h14v6H7v-6zm2.5-4l1.5-2.5M18.5 7L17 4.5M8 11h.01M20 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 11a5 5 0 0110 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: dark, margin: 0 }}>Android</p>
              <p style={{ fontSize: 13, color: sub, margin: 0 }}>Android 7.0 이상</p>
            </div>
          </div>

          <a href={APK_URL} download="morspeak-screening.apk"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 0', borderRadius: 12, background: dark, color: '#fff', fontSize: 16, fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' as const }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10m0 0l-3.5-3.5M9 12l3.5-3.5M3 15h12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            APK 파일 다운로드
          </a>

          <button onClick={() => setShowApkGuide(v => !v)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 0 0', fontFamily: font }}>
            <span style={{ fontSize: 13, color: sub }}>설치 방법 보기</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: showApkGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M3 5l4 4 4-4" stroke="#6e6e6e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showApkGuide && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: bg, borderRadius: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: dark, marginBottom: 10 }}>Android APK 설치 방법</p>
              {[
                '위 버튼으로 APK 파일을 다운로드합니다.',
                '다운로드한 파일을 탭합니다.',
                '"앱을 설치할 수 없습니다" 경고가 뜨면 세부정보 더보기를 탭한 뒤 무시하고 설치하기를 탭합니다.',
                '"알 수 없는 앱 설치" 허용 화면이 뜨면 이 출처 허용을 켠 후 뒤로 가서 설치를 탭합니다.',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i === 3 ? 0 : 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sub, minWidth: 16 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: dark, lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'rgba(110,110,110,0.7)', textAlign: 'center' as const, marginTop: 8, lineHeight: 1.6 }}>
          검사 결과는 제출 즉시 모스픽 팀에 전달됩니다.
        </p>
      </div>

      {/* Footer note */}
      <div style={{ padding: '24px 24px 60px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ background: bg, borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 13, color: sub, lineHeight: 1.7, margin: 0 }}>
            문의: <a href="mailto:gaon@morspeak.com" style={{ color: dark, fontWeight: 600 }}>gaon@morspeak.com</a>
            <br />
            검사 결과 및 개인정보 처리에 관한 사항은{' '}
            <a href="/legalpolicies" style={{ color: '#0099ff', textDecoration: 'underline' }}>개인정보처리방침</a>을 확인해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
