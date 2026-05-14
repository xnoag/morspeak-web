'use client';

import { useRef, useState } from 'react';
import { useCarouselPadLeft } from '@/lib/useCarouselPadLeft';

export interface CarouselCard {
  title: string;
  body: string;
  callout?: string;
  link?: { label: string; href: string };
  bg?: string;
  image?: string;
  video?: string;
}

export default function FeatureCarousel({ cards }: { cards: CarouselCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const padLeft = useCarouselPadLeft();

  const CARD_WIDTH = 740;
  const GAP = 12;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 8);
  };

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * (CARD_WIDTH + GAP), behavior: 'smooth' });
  };

  return (
    <div>
      {/* Card row */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: `${GAP}px`,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: `${padLeft}px`,
          scrollPaddingLeft: `${padLeft}px`,
          paddingRight: '22px',
          paddingBottom: '4px',
        }}
        className="no-scrollbar"
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              flex: `0 0 min(${CARD_WIDTH}px, calc(100vw - 44px))`,
              scrollSnapAlign: 'start',
              background: card.bg ?? '#fff',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 이미지 or 비디오 */}
            {card.video ? (
              <video
                autoPlay muted loop playsInline
                poster={card.image}
                style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
              >
                <source src={card.video} type="video/mp4" />
              </video>
            ) : card.image ? (
              <img
                src={card.image}
                alt={card.title}
                style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
              />
            ) : null}

            {/* 텍스트 */}
            <div style={{ padding: '20px 24px 28px 0', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em' }}>
                <strong style={{ color: '#1d1d1f', fontWeight: 600 }}>{card.title}</strong>
                {card.body ? ` ${card.body}` : ''}
              </p>
              {card.callout && (
                <p style={{ fontSize: '12px', color: '#1d1d1f', fontWeight: 500, marginTop: '8px' }}>{card.callout}</p>
              )}
              {card.link && (
                <a
                  href={card.link.href}
                  style={{ fontSize: '14px', color: '#0066cc', textDecoration: 'none', display: 'block', marginTop: '10px' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {card.link.label} ›
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ← → 네비게이션 버튼 — 우측 하단 */}
      <div style={{
        maxWidth: '980px', margin: '20px auto 0', padding: '0 22px',
        display: 'flex', justifyContent: 'flex-end', gap: '8px',
      }}>
        <button
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          aria-label="이전"
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: atStart ? '#e8e8ed' : '#d1d1d6',
            border: 'none', cursor: atStart ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            opacity: atStart ? 0.5 : 1,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 14L2 8L8 2" stroke="#3c3c43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          aria-label="다음"
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: atEnd ? '#e8e8ed' : '#d1d1d6',
            border: 'none', cursor: atEnd ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            opacity: atEnd ? 0.5 : 1,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M2 2L8 8L2 14" stroke="#3c3c43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
