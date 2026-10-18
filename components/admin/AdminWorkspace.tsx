'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminPath } from '@/lib/admin-navigation';
import './workspace.css';

const WorkspaceContext = createContext({ active: false, path: (path: string) => path, navigate: (path: string) => { location.href = path; }, setUnsaved: (value: boolean) => { void value; } });
export const useAdminWorkspace = () => useContext(WorkspaceContext);

const sections = [
  { title: '대상자 관리', items: [['screening', '스크리닝·선정', 'screen'], ['tracking', '사용 현황', 'chart'], ['group', '그룹 교육', 'group']] },
  { title: '운영', items: [['survey', '설문 관리', 'survey'], ['survey-map', '설문 마인드맵', 'map'], ['training', '교육 신청', 'calendar'], ['waitlist', '대기자', 'list'], ['reviews', '후기', 'file'], ['inquiries', '문의', 'inbox']] },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    screen: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 2 2 5-5M8 16h8"/></>,
    chart: <><path d="M4 4v16h16M8 16v-5m5 5V7m5 9v-7"/></>,
    group: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m0-15a3 3 0 0 1 0 6m3 3a6 6 0 0 1 3 5"/></>,
    survey: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
    map: <><rect x="9" y="3" width="6" height="5" rx="1"/><path d="M12 8v5M5 16v-3h14v3"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h3"/></>,
    list: <><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/></>,
    file: <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h5"/></>,
    inbox: <><path d="m3 14 3-9h12l3 9v6H3zM3 14h5l2 3h4l2-3h5"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/></>,
    home: <><path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    logout: <><path d="M10 4H4v16h6m4-4 4-4-4-4m-6 4h12"/></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.file}</svg>;
}

export default function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const current = sections.flatMap(s => s.items).find(([id]) => pathname === `/admin/workspace/${id}` || pathname.startsWith(`/admin/workspace/${id}/`));

  useEffect(() => {
    if (!profile) return;
    profileRef.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node) && !profileButton.current?.contains(event.target as Node)) setProfile(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setProfile(false); profileButton.current?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [profile]);

  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [unsaved]);

  function canLeave() {
    if (!unsaved || confirm('저장하지 않은 입력이 있습니다. 저장하지 않고 이동할까요?')) { setUnsaved(false); return true; }
    return false;
  }

  async function logout() {
    if (!canLeave() || loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try {
      const result = await fetch('/api/admin/logout', { method: 'POST' });
      if (!result.ok) throw new Error();
      localStorage.removeItem('morspeak_admin_authed');
      router.replace('/admin/login'); router.refresh();
    } catch { setLogoutError('로그아웃하지 못했습니다. 다시 시도해 주세요.'); setLoggingOut(false); }
  }

  return <WorkspaceContext.Provider value={{ active: true, path: adminPath, navigate: path => router.push(adminPath(path)), setUnsaved }}>
    <div className={`gaon-theme admin-workspace${menuOpen ? '' : ' menu-collapsed'}`}>
      <div className="admin-titlebar"><button className="admin-icon" title="메뉴 표시 전환" aria-label="메뉴 표시 전환" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu"/></button><span>Morspeak</span><span className="admin-titlebar-context">관리자</span></div>
      <nav className="admin-rail" aria-label="작업 공간">
        <Link className="admin-icon admin-home" href="/admin/workspace/tracking" aria-label="사용 현황" title="사용 현황" onClick={e => { if (!canLeave()) e.preventDefault(); }}><Icon name="home"/><i/></Link>
        <div className="admin-rail-bottom"><button ref={profileButton} className="admin-icon" aria-label="계정 메뉴" title="계정" aria-haspopup="menu" aria-expanded={profile} onClick={() => setProfile(!profile)}><Icon name="account"/></button></div>
      </nav>
      <div className="admin-workspace-surface">
        <aside className="admin-menu" aria-label="관리 메뉴">
          <label className="admin-menu-search"><Icon name="search"/><input aria-label="메뉴 검색" placeholder="메뉴 검색" value={search} onChange={e => setSearch(e.target.value)}/></label>
          {sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.items.filter(([, title]) => title.includes(search.trim())).map(([id, title, icon]) => <Link key={id} href={`/admin/workspace/${id}`} prefetch={false} aria-current={current?.[0] === id ? 'page' : undefined} onClick={e => { if (!canLeave()) e.preventDefault(); else if (window.innerWidth < 760) setMenuOpen(false); }}><Icon name={icon}/><span>{title}</span></Link>)}</section>)}
          {search && !sections.flatMap(s => s.items).some(([, title]) => title.includes(search.trim())) && <p className="admin-menu-empty">일치하는 메뉴가 없습니다.</p>}
        </aside>
        <main className="admin-main" id="admin-content" aria-label={current?.[1] || '관리 작업'}>{children}</main>
      </div>
      {profile && <div ref={profileRef} className="admin-profile" tabIndex={-1} role="menu" aria-label="계정"><p>관리자 계정</p><button role="menuitem" disabled={loggingOut} onClick={logout}><Icon name="logout"/>{loggingOut ? '로그아웃 중…' : '로그아웃'}</button>{logoutError && <p role="alert">{logoutError}</p>}</div>}
    </div>
  </WorkspaceContext.Provider>;
}
