import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './event.module.css';

const title = '행사 안내 | 모스픽';
const description = '아산나눔재단 비스콘과 스마일게이트 지스타 안내를 만나보세요.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://morspeak.com/event' },
  openGraph: { title, description, url: 'https://morspeak.com/event' },
  twitter: { card: 'summary', title, description },
};

const events = [
  {
    organizer: '아산나눔재단',
    title: '비스콘 2026',
    action: '참관 안내 및 신청',
    href: 'https://asan-nanum.org/notice/biscon-2026-visitor-registration/',
  },
  {
    organizer: '스마일게이트',
    title: '지스타',
    action: '희망스튜디오 캠페인 안내',
    href: 'https://www.heemangstudio.org/hope/campaignView/0000001001',
  },
];

export default function EventPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="모스픽 홈페이지">
            morspeak<span aria-hidden="true">.</span>
          </Link>
        </header>
        <main>
          <h1 className={styles.title}>행사 안내</h1>
          <p className={styles.description}>궁금한 행사를 선택해 주세요.</p>
          <ul className={styles.events}>
            {events.map((event) => (
              <li key={event.href}>
                <a className={styles.card} href={event.href}>
                  <span className={styles.organizer}>{event.organizer}</span>
                  <h2 className={styles.eventTitle}>{event.title}</h2>
                  <span className={styles.action}>
                    {event.action}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </main>
        <footer className={styles.footer}>작은 움직임, 더 큰 가능성.</footer>
      </div>
    </div>
  );
}
