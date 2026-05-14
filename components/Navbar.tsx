'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import MorspeakLogo from '@/components/MorspeakLogo';
import { useState, useRef, useEffect } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/kr/app/%EB%AA%A8%EC%8A%A4%ED%94%BD/id6743996900';

const DARK_PAGES = new Set(['/', '/eng', '/jpn']);

const configs = {
  ko: {
    home: '/',
    links: [
      { href: '/#about', label: '소개' },
      { href: '/article', label: '아티클' },
    ],
    contact: { href: '/contact', label: '협력 문의하기' },
    install: '설치하기',
  },
  en: {
    home: '/eng',
    links: [
      { href: '/eng#about', label: 'About' },
      { href: '/articleeng', label: 'Articles' },
    ],
    contact: { href: '/contact', label: 'Contact for Collaboration' },
    install: 'Install',
  },
  jp: {
    home: '/jpn',
    links: [
      { href: '/jpn#about', label: '紹介' },
      { href: '/articlejpn', label: '記事' },
    ],
    contact: { href: '/contact', label: 'お問い合わせ' },
    install: 'インストール',
  },
};

const langOptions = [
  { code: 'ko' as const, label: '한국어' },
  { code: 'en' as const, label: 'English' },
  { code: 'jp' as const, label: '日本語' },
];

function getTargetPath(currentPath: string, targetLang: 'ko' | 'en' | 'jp'): string {
  const currentLang =
    currentPath.startsWith('/eng') || currentPath === '/articleeng'
      ? 'en'
      : currentPath.startsWith('/jpn') || currentPath === '/articlejpn'
      ? 'jp'
      : 'ko';

  if (currentLang === targetLang) return currentPath;

  const homeMap: Record<string, string> = { ko: '/', en: '/eng', jp: '/jpn' };
  const articleMap: Record<string, string> = { ko: '/article', en: '/articleeng', jp: '/articlejpn' };

  if (['/','eng','/jpn'].some(p => currentPath === p)) return homeMap[targetLang];
  if (['/article','/articleeng','/articlejpn'].includes(currentPath)) return articleMap[targetLang];
  return homeMap[targetLang];
}

function getLang(pathname: string): 'ko' | 'en' | 'jp' {
  if (pathname.startsWith('/eng') || pathname === '/articleeng') return 'en';
  if (pathname.startsWith('/jpn') || pathname === '/articlejpn') return 'jp';
  return 'ko';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/avp') || pathname === '/') return null;

  const lang = getLang(pathname);
  const config = configs[lang];
  const isDark = DARK_PAGES.has(pathname);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLangSelect(targetLang: 'ko' | 'en' | 'jp') {
    setOpen(false);
    router.push(getTargetPath(pathname, targetLang));
  }

  const textColor = isDark ? 'rgba(245,245,247,0.85)' : '#222222';
  const borderColor = isDark ? 'rgba(245,245,247,0.25)' : '#222222';
  const navBg = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(252,252,252,0.6)';
  const dropdownBg = isDark ? '#1d1d1f' : '#ffffff';
  const dropdownBorder = isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0';

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{
        background: navBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <Link href={config.home} aria-label="Morspeak 홈">
        <MorspeakLogo />
      </Link>

      <div className="hidden md:flex items-center gap-6">
        {config.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13px] hover:opacity-60 transition-opacity"
            style={{ color: textColor, letterSpacing: '-0.6px' }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[13px] hover:opacity-60 transition-opacity px-2 py-1"
            style={{ color: textColor, letterSpacing: '-0.3px' }}
            aria-label="언어 선택"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 1c-2 2-2 8 0 12M7 1c2 2 2 8 0 12M1 7h12" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span>{langOptions.find((l) => l.code === lang)?.label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
              <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[120px] rounded-xl overflow-hidden"
              style={{
                background: dropdownBg,
                border: `1px solid ${dropdownBorder}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
              }}
            >
              {langOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => handleLangSelect(option.code)}
                  className="w-full text-left px-4 py-3 text-[13px] transition-colors"
                  style={{
                    color: lang === option.code ? textColor : isDark ? 'rgba(245,245,247,0.5)' : '#888',
                    fontWeight: lang === option.code ? 600 : 400,
                    letterSpacing: '-0.3px',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Link
          href={config.contact.href}
          className="hidden sm:inline-flex text-[13px] px-4 py-2 rounded-full border hover:opacity-60 transition-opacity"
          style={{ color: textColor, borderColor, letterSpacing: '-0.3px' }}
        >
          {config.contact.label}
        </Link>
        <Link
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] px-4 py-2 rounded-full text-white hover:opacity-90 transition-opacity"
          style={{ background: 'rgba(0,122,255,0.9)', letterSpacing: '-0.3px' }}
        >
          {config.install}
        </Link>
      </div>
    </nav>
  );
}
