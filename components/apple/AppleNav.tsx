'use client';

const links = ['스토어','Mac','iPad','iPhone','Watch','Vision','AirPods','TV 및 홈','엔터테인먼트','액세서리','고객지원'];

export default function AppleNav() {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: '44px',
      background: 'rgba(22,22,23,0.9)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <nav style={{ width: '100%', maxWidth: '980px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
        <a href="#" aria-label="Apple" style={{ color: '#f5f5f7', display: 'flex', alignItems: 'center' }}>
          <svg width="15" height="18" viewBox="0 0 814 1000" fill="currentColor">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 134.4-317.3 266.8-317.3 99.8 0 165.6 67.6 239.8 67.6 70.9 0 144.7-72.5 248.4-72.5zm-194.3-87.9c32.1-36.7 55.9-88.4 55.9-140.1 0-7.1-.6-14.3-1.9-20.1-53.3 2-116.8 35.4-154.6 77.6-28.2 31.6-55.2 83.3-55.2 135.7 0 7.7 1.3 15.5 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 47.8 0 109.7-31.9 140.3-72.5z"/>
          </svg>
        </a>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {links.map(link => (
            <a key={link} href="#" style={{ color: 'rgba(245,245,247,0.85)', fontSize: '12px', textDecoration: 'none', padding: '0 8px', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.5')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >{link}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#" aria-label="검색" style={{ color: 'rgba(245,245,247,0.85)', display: 'flex' }}>
            <svg width="15" height="44" viewBox="0 0 15 44" fill="currentColor">
              <path d="M14.298 27.202l-3.87-3.87a6.227 6.227 0 001.472-4.023A6.354 6.354 0 005.567 13a6.354 6.354 0 00-6.333 6.309 6.354 6.354 0 006.333 6.308 6.22 6.22 0 003.97-1.429l3.88 3.88a.762.762 0 001.08 0 .762.762 0 000-1.066zM5.567 24.117a4.82 4.82 0 01-4.8-4.808 4.82 4.82 0 014.8-4.809 4.82 4.82 0 014.8 4.809 4.82 4.82 0 01-4.8 4.808z"/>
            </svg>
          </a>
          <a href="#" aria-label="쇼핑 백" style={{ color: 'rgba(245,245,247,0.85)', display: 'flex' }}>
            <svg width="15" height="44" viewBox="0 0 15 44" fill="currentColor">
              <path d="M11.8 13.517h-1.2a3.1 3.1 0 00-6.2 0H3.2A2.201 2.201 0 001 15.717v10.4a2.201 2.201 0 002.2 2.2h8.6a2.201 2.201 0 002.2-2.2v-10.4a2.201 2.201 0 00-2.2-2.2zM7.5 11.917a1.6 1.6 0 011.6 1.6H5.9a1.6 1.6 0 011.6-1.6zm4.3 14.2H3.2a.7.7 0 01-.7-.7v-10.4a.7.7 0 01.7-.7h1.2v1.6a.75.75 0 001.5 0v-1.6h3.2v1.6a.75.75 0 001.5 0v-1.6h1.2a.7.7 0 01.7.7v10.4a.7.7 0 01-.7.7z"/>
            </svg>
          </a>
        </div>
      </nav>
    </header>
  );
}
