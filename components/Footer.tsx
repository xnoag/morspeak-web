'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DARK_PAGES = new Set(['/', '/eng', '/jpn']);

const content = {
  ko: { copyright: 'Copyright © 2025 Morspeak. 모든 권리 보유.', legal: '법률 관련 정책' },
  en: { copyright: 'Copyright © 2025 Morspeak. All rights reserved.', legal: 'Legal Policies' },
  jp: { copyright: 'Copyright © 2025 Morspeak. All rights reserved.', legal: '法的ポリシー' },
};

function getLang(pathname: string): 'ko' | 'en' | 'jp' {
  if (pathname.startsWith('/eng') || pathname === '/articleeng') return 'en';
  if (pathname.startsWith('/jpn') || pathname === '/articlejpn') return 'jp';
  return 'ko';
}

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/avp')) return null;

  const isDark = DARK_PAGES.has(pathname);
  const lang = getLang(pathname);
  const c = content[lang];

  if (isDark) {
    return (
      <footer
        className="py-8 px-6"
        style={{
          background: '#111',
          borderTop: '1px solid rgba(245,245,247,0.08)',
        }}
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[13px]" style={{ color: 'rgba(245,245,247,0.4)', letterSpacing: '-0.3px' }}>
            {c.copyright}
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/legalpolicies"
              target="_blank"
              className="text-[13px] hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(100,180,255,0.8)' }}
            >
              {c.legal}
            </Link>
            <a
              href="mailto:hello@morspeak.com"
              className="text-[13px] hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(245,245,247,0.4)' }}
            >
              hello@morspeak.com
            </a>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white py-8 px-6 border-t border-[#f0f0f0]">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-[13px] text-ms-footer-text" style={{ letterSpacing: '-0.3px' }}>
          {c.copyright}
        </span>
        <div className="flex items-center gap-5">
          <Link
            href="/legalpolicies"
            target="_blank"
            className="text-[13px] text-ms-link hover:opacity-80 transition-opacity"
          >
            {c.legal}
          </Link>
          <a href="mailto:hello@morspeak.com" className="text-[13px] text-ms-footer-text hover:opacity-80 transition-opacity">
            hello@morspeak.com
          </a>
        </div>
      </div>
    </footer>
  );
}
