'use client';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/kr/app/%EB%AA%A8%EC%8A%A4%ED%94%BD/id6743996900';

const NAV_LINKS = [
  { label: '소개', href: '#overview' },
  { label: '기능', href: '#features' },
  { label: '아티클', href: '/articles' },
  { label: '문의', href: '/contact' },
];


const langOptions = [
  { code: 'ko', label: '한국어', href: '/' },
  { code: 'en', label: 'English', href: '/eng' },
  { code: 'jp', label: '日本語', href: '/jpn' },
];

export default function VisionProNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = pathname.startsWith('/eng') ? 'en' : pathname.startsWith('/jpn') ? 'jp' : 'ko';
  const currentLabel = langOptions.find(l => l.code === currentLang)?.label ?? '한국어';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { label: '소개', href: '#overview', active: pathname === '/' },
    { label: '아티클', href: '/articles', active: pathname === '/articles' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: '0', zIndex: 9998,
      height: '68px',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 40px',
        gap: '16px',
      }}>
        {/* 왼쪽: 로고 */}
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', transition: 'transform 0.2s ease' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Image src="/morspeak-logo2.svg" alt="Morspeak" width={129} height={36} priority />
        </a>

        <div />

        {/* 오른쪽: 메뉴 + 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '24px' }}>
          {/* 언어 선택 */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '13px', lineHeight: 1, color: '#1d1d1f', background: 'none', border: 'none',
              cursor: 'pointer', opacity: 0.75, padding: 0, margin: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7 1c-2 2-2 8 0 12M7 1c2 2 2 8 0 12M1 7h12" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              <span>{currentLabel}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                minWidth: '110px', borderRadius: '12px', overflow: 'hidden',
                background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100,
              }}>
                {langOptions.map(opt => (
                  <button key={opt.code} onClick={() => { router.push(opt.href); setLangOpen(false); }} style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer',
                    color: currentLang === opt.code ? '#1d1d1f' : '#888',
                    fontWeight: currentLang === opt.code ? 600 : 400,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.15)' }} />

          {navLinks.map(link => (
            <a key={link.label} href={link.href} style={{
              fontSize: '13px',
              color: '#1d1d1f',
              textDecoration: link.active ? 'underline' : 'none',
              textDecorationThickness: '1.5px',
              textUnderlineOffset: '4px',
              opacity: link.active ? 1 : 0.75,
              fontWeight: link.active ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = link.active ? '1' : '0.75')}
            >{link.label}</a>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="/contact" style={{
            fontSize: '13px', color: '#fff', textDecoration: 'none',
            background: '#FF8D28', padding: '0 16px', borderRadius: '980px',
            whiteSpace: 'nowrap', height: '34px', display: 'inline-flex', alignItems: 'center',
            transition: 'transform 0.2s ease, background 0.2s ease',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#FF9230'; el.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#FF8D28'; el.style.transform = 'scale(1)'; }}
          >
            기부하기
          </a>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={{
            fontSize: '13px', color: '#fff', textDecoration: 'none',
            background: '#0071e3', padding: '0 16px', borderRadius: '980px', whiteSpace: 'nowrap',
            height: '34px', display: 'inline-flex', alignItems: 'center',
            transition: 'transform 0.2s ease, background 0.2s ease',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#0077ed'; el.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = '#0071e3'; el.style.transform = 'scale(1)'; }}
          >
            사용신청
          </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
