'use client';

const footerColumns = [
  { title: '쇼핑 및 알아보기', links: ['스토어','Mac','iPad','iPhone','Watch','Vision','AirPods','TV 및 홈','AirTag','액세서리'] },
  { title: 'Apple 지갑', links: ['지갑','Apple Pay'] },
  { title: '계정', links: ['Apple 계정 관리','Apple Store 계정','iCloud.com'] },
  { title: '엔터테인먼트', links: ['Apple One','Apple TV+','Apple Music','Apple Arcade','Apple 팟캐스트','Apple Books','App Store'] },
  { title: 'Apple Store', links: ['매장 찾기','Genius Bar','Today at Apple','그룹 예약','Apple 캠프','Apple Store 앱','인증 리퍼비쉬 제품','Apple Trade In','할부 방식','주문 상태','쇼핑 도움말'] },
  { title: '비즈니스', links: ['Apple과 비즈니스','비즈니스를 위한 제품 쇼핑하기'] },
  { title: '교육', links: ['Apple과 교육','초중고용 제품 쇼핑하기','대학 생활을 위한 제품 쇼핑하기'] },
  { title: 'Apple의 가치관', links: ['손쉬운 사용','교육','환경','개인정보 보호','공급망 혁신'] },
  { title: 'Apple 정보', links: ['Newsroom','Apple 리더십','채용 안내','윤리 및 규정 준수','이벤트','Apple 연락처'] },
];

export default function AppleFooter() {
  return (
    <footer style={{ background: '#1d1d1f' }}>
      <div style={{ borderBottom: '1px solid #424245', padding: '16px 22px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: '#6e6e73', lineHeight: 1.7 }}>
            다양한 쇼핑 방법:{' '}
            <a href="#" style={{ color: '#6e6e73', textDecoration: 'underline' }}>Apple Store를 방문</a>하거나,{' '}
            <a href="#" style={{ color: '#6e6e73', textDecoration: 'underline' }}>리셀러</a>를 찾아보거나, 080-330-8877번으로 전화하세요.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '40px 22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '32px 24px' }}>
          {footerColumns.map(col => (
            <div key={col.title}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f7', marginBottom: '12px' }}>{col.title}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{ fontSize: '12px', color: '#6e6e73', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f7')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6e6e73')}
                    >{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #424245', padding: '16px 22px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6e6e73' }}>Copyright © 2026 Apple Inc. 모든 권리 보유.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {['개인정보 처리방침','웹 사이트 이용 약관','판매 및 환불','법적 고지','사이트 맵'].map(link => (
              <a key={link} href="#" style={{ fontSize: '12px', color: '#6e6e73', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f7')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6e6e73')}
              >{link}</a>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#6e6e73' }}>한국</p>
        </div>
      </div>
    </footer>
  );
}
