'use client'

export default function GuardianDownload() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f2f2f7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system,'SF Pro Display',sans-serif",
      padding: '40px 24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
      }}>
        {/* 아이콘 */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg,#34c759,#30b04d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(52,199,89,0.35)',
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 6v20M12 18l8 8 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 32h24" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1c1c1e', margin: '0 0 8px', letterSpacing: '-.5px' }}>
          Morspeak 보호자 앱
        </h1>
        <p style={{ fontSize: 15, color: '#636366', margin: '0 0 32px', lineHeight: 1.6 }}>
          환우와 실시간으로 소통하고<br/>호출 알림을 받을 수 있습니다.
        </p>

        {/* 다운로드 버튼 */}
        <a
          href="/MorspeakCare.apk"
          download="MorspeakCare.apk"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'linear-gradient(135deg,#34c759,#30b04d)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 14,
            padding: '16px 28px',
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 16,
            boxShadow: '0 4px 16px rgba(52,199,89,0.4)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v11M5 9l5 5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 16h14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          APK 다운로드 (Android)
        </a>

        <p style={{ fontSize: 12, color: '#aeaeb2', margin: '0 0 28px' }}>버전 1.0 · 9.5 MB</p>

        {/* 설치 안내 */}
        <div style={{
          background: '#f9f9fb',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3c', margin: '0 0 12px' }}>설치 방법</p>
          {[
            'APK 파일을 다운로드합니다',
            '다운로드한 파일을 열어 설치를 진행합니다',
            '알 수 없는 앱 설치 허용이 필요한 경우: 세부정보 더보기 → 무시하고 설치하기',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 2 ? 8 : 0 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#34c759', color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: '#636366', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: '#aeaeb2' }}>
        © 2025 Morspeak · <a href="/" style={{ color: '#aeaeb2' }}>홈으로</a>
      </p>
    </div>
  )
}
