'use client';

import { useState, useRef, useEffect } from 'react';
import FeatureCarousel, { CarouselCard } from './FeatureCarousel';
import { useCarouselPadLeft } from '@/lib/useCarouselPadLeft';

interface Props {
  id?: string;
  eyebrow?: string;
  headline?: string;
  heroVideo: string;
  heroImage?: string;
  body?: string;
  link?: { label: string; href: string };
  cards?: CarouselCard[];
  citation?: string;
}

export default function FullscreenVideoSection({
  id, eyebrow, headline, heroVideo, heroImage, body, link, cards, citation,
}: Props) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const userPausedRef = useRef(false);
  const padLeft = useCarouselPadLeft();

  useEffect(() => {
    const v = videoRef.current;
    const section = sectionRef.current;
    if (!v || !section) return;

    v.pause();

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (userPausedRef.current) return;
          timer = setTimeout(() => {
            v.currentTime = 0;
            v.muted = true;
            v.play().then(() => {
              if (!isSafari) {
                v.muted = false;
                setMuted(false);
              }
            }).catch(() => {});
          }, 750);
        } else {
          clearTimeout(timer);
          v.pause();
          v.muted = true;
          setMuted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);

  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      userPausedRef.current = false;
      v.play();
      setPaused(false);
    } else {
      userPausedRef.current = true;
      v.pause();
      setPaused(true);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <>
      <div id={id} ref={sectionRef} style={{ height: '150vh' }}>
      <section
        style={{ position: 'sticky', top: '68px', height: 'calc(100vh - 68px)', overflow: 'hidden', background: '#000' }}
      >
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          poster={heroImage}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* 우상단 컨트롤 */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
          {/* 음소거 토글 */}
          <button
            onClick={toggleMute}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(80,80,80,0.55)', backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            aria-label={muted ? '소리 켜기' : '음소거'}
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l1.98 2L21 18.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>

          {/* 일시정지/재생 */}
          <button
            onClick={togglePause}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(80,80,80,0.55)', backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            aria-label={paused ? '재생' : '일시정지'}
          >
            {paused ? (
              <svg width="11" height="13" viewBox="0 0 11 13" fill="white">
                <path d="M0.5 1.5l9 5-9 5V1.5z" />
              </svg>
            ) : (
              <svg width="11" height="13" viewBox="0 0 11 13" fill="white">
                <rect x="0.5" y="1" width="3.2" height="11" rx="1.2" />
                <rect x="7.3" y="1" width="3.2" height="11" rx="1.2" />
              </svg>
            )}
          </button>
        </div>

        {/* 인용 텍스트 - 우하단 */}
        {citation && (
          <p style={{
            position: 'absolute', bottom: '20px', right: '20px',
            color: 'rgba(255,255,255,0.75)', fontSize: '12px',
            letterSpacing: '-0.01em',
          }}>
            {citation}
          </p>
        )}
      </section>
      </div>

      {/* 카드 + 본문 섹션 (있을 경우) */}
      {(body || (cards && cards.length > 0)) && (
        <section style={{ background: '#fff', padding: '48px 0', borderTop: '1px solid #d2d2d7' }}>
          {/* 본문 텍스트 — 캐러셀과 동일한 padLeft로 정렬 */}
          {(body || link) && (
            <div style={{ paddingLeft: `${padLeft}px`, paddingRight: '22px', marginBottom: cards && cards.length > 0 ? '48px' : '0' }}>
              {body && (
                <p style={{
                  fontSize: '19px', color: '#1d1d1f', lineHeight: 1.7,
                  letterSpacing: '-0.01em', marginBottom: link ? '16px' : '0',
                  maxWidth: '700px',
                }}>
                  {body}
                </p>
              )}
              {link && (
                <a
                  href={link.href}
                  style={{ fontSize: '19px', color: '#0066cc', textDecoration: 'none', display: 'block' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {link.label} ›
                </a>
              )}
            </div>
          )}
          {/* 캐러셀 — 풀 뷰포트 너비 */}
          {cards && cards.length > 0 && <FeatureCarousel cards={cards} sectionVideo={heroVideo} sectionTitle={citation} sectionBody={body} />}
        </section>
      )}
    </>
  );
}
