'use client';

import { useState, useRef } from 'react';
import FeatureCarousel, { CarouselCard } from './FeatureCarousel';
import { useCarouselPadLeft } from '@/lib/useCarouselPadLeft';

interface Props {
  id?: string;
  eyebrow: string;
  headline: string;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const padLeft = useCarouselPadLeft();

  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  return (
    <>
      <div id={id} style={{ height: '150vh' }}>
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

        {/* 어두운 오버레이 */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.4) 100%)' }} />

        {/* 텍스트 중앙 */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 40px',
        }}>
          <p style={{
            fontSize: '15px', color: 'rgba(255,255,255,0.8)',
            marginBottom: '16px', letterSpacing: '0.02em',
          }}>
            {eyebrow}
          </p>
          <h2 style={{
            fontSize: 'clamp(36px, 6.5vw, 76px)', fontWeight: 700,
            color: '#fff', letterSpacing: '-0.022em', lineHeight: 1.08,
            maxWidth: '700px', wordBreak: 'keep-all',
          }}>
            {headline}
          </h2>
        </div>

        {/* 일시정지/재생 버튼 - 우상단 */}
        <button
          onClick={togglePause}
          style={{
            position: 'absolute', top: '72px', right: '24px',
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

        {/* 인용 텍스트 - 우하단 */}
        {citation && (
          <p style={{
            position: 'absolute', bottom: '24px', right: '24px',
            color: 'rgba(255,255,255,0.75)', fontSize: '12px',
            letterSpacing: '-0.01em', textDecoration: 'none',
          }}>
            {citation} ↗
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
          {cards && cards.length > 0 && <FeatureCarousel cards={cards} />}
        </section>
      )}
    </>
  );
}
