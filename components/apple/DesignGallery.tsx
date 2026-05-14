'use client';

import { useRef, useState, useEffect } from 'react';
import { useCarouselPadLeft } from '@/lib/useCarouselPadLeft';

const BASE_IMG = 'https://www.apple.com/v/apple-vision-pro/k/images/overview/design/drawer';
const BASE_VID = 'https://www.apple.com/105/media/us/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';

interface DesignCard {
  video?: string;
  image: string;
  body: string;
  bodyBold?: string;
}

const cards: DesignCard[] = [
  {
    video: `${BASE_VID}/drawer-design-innovation/large.mp4`,
    image: `${BASE_IMG}/design_innovation_startframe__4mig33ckaf6y_large.jpg`,
    body: 'Apple Vision Pro는 우리가 고성능, 모바일 그리고 웨어러블 기기에 있어 수십 년간 이룬 혁신을 바탕으로 한 결과물입니다. 첨단 기술과 우아한 형태가 착용할 때마다 놀라운 경험을 선사하죠.',
    bodyBold: '우아한 형태',
  },
  {
    image: `${BASE_IMG}/dual_knit_band__cuhpalc1t9ea_large.jpg`,
    body: '새로운 듀얼 니트 밴드는 부드러우면서 통기성이 뛰어난 스트랩과 균형 잡힌 디자인을 결합해 당신이 좋아하는 공간 경험에 더 오래 몰입할 수 있도록 해줍니다.',
    bodyBold: '듀얼 니트 밴드',
  },
  {
    video: `${BASE_VID}/drawer-design-headband/large.mp4`,
    image: `${BASE_IMG}/headband_startframe__dd6bzq5p6lqq_large.jpg`,
    body: '두 가지 방식으로 작동하는 핏 다이얼은 밴드 상부 및 하부 스트랩을 각각 손쉽게 조절해 자신에게 꼭 맞는 편안한 핏으로 바꿀 수 있도록 해주죠.',
    bodyBold: '핏 다이얼',
  },
  {
    video: `${BASE_VID}/drawer-design-light-seal/large.mp4`,
    image: `${BASE_IMG}/light_seal_startframe__edlebmd6r1aq_large.jpg`,
    body: '라이트실은 알루미늄 합금 프레임에 자석으로 부착되고 얼굴 모양에 맞게 부드럽게 구부러져, 정밀한 핏을 제공하는 동시에 외부에서 들어오는 미광을 차단해 줍니다.',
    bodyBold: '라이트실',
  },
  {
    image: `${BASE_IMG}/spatial_audio__fc9n50cxmcmm_large.jpg`,
    body: '귀에 가깝게 위치한 스피커가 주변 환경의 소리와 자연스럽게 조화를 이루는 풍성한 공간 음향을 선사하는 동시에 늘 주변 상황을 인지할 수 있도록 해주죠.',
    bodyBold: '공간 음향',
  },
  {
    image: `${BASE_IMG}/digital_crown__glqazc7c6qeu_large.jpg`,
    body: 'Digital Crown을 누르면 \'홈 보기\'가 표시되고, \'환경\' 기능 사용 시 Digital Crown을 돌리면 몰입감을 조절할 수 있습니다.',
    bodyBold: 'Digital Crown',
  },
  {
    image: `${BASE_IMG}/battery__cjkato9jqdjm_large.jpg`,
    body: 'Apple Vision Pro는 주머니에 쏙 들어가는 알루미늄 마감 외장 배터리로 구동됩니다. 최대 2.5시간의 일반 사용과 최대 3시간의 동영상 재생을 지원하죠.¹',
    bodyBold: '배터리',
  },
  {
    image: `${BASE_IMG}/optical_inserts__dlbxctpips66_large.jpg`,
    body: 'ZEISS Optical Inserts를 당신의 시력 처방에 따라 맞춤 제작할 수 있으며,² 렌즈에 자석 방식으로 부착되어 또렷한 시각과 정밀한 눈 추적 성능을 지원합니다.',
    bodyBold: 'ZEISS Optical Inserts',
  },
  {
    image: `${BASE_IMG}/solo_knit_band__duemuduoceoi_large.jpg`,
    body: '별도로 판매되는 솔로 니트 밴드는 편안한 쿠션감과 통기성, 신축성을 제공합니다.',
    bodyBold: '솔로 니트 밴드',
  },
];

function boldify(text: string, keyword?: string) {
  if (!keyword) return text;
  const idx = text.indexOf(keyword);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ fontWeight: 600, color: '#1d1d1f' }}>{keyword}</strong>
      {text.slice(idx + keyword.length)}
    </>
  );
}

const CARD_WIDTH = 740;
const GAP = 12;

export default function DesignGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const padLeft = useCarouselPadLeft();

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
    <section style={{ background: '#fff', padding: '80px 0' }}>
      {/* 헤더 — 카드와 같은 좌측 정렬 */}
      <div style={{
        paddingLeft: `${padLeft}px`, paddingRight: '22px', marginBottom: '48px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: '#1d1d1f',
          letterSpacing: '-0.022em', lineHeight: 1.05,
        }}>
          보다 자세히 들여다보기.
        </h2>
        <a
          href="/105/media/us/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/ar/apple-vision-pro-dual-knit.usdz"
          rel="ar"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '17px', color: '#0066cc', textDecoration: 'none', whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2.5L17 6.5V13.5L10 17.5L3 13.5V6.5L10 2.5Z" stroke="#0066cc" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M10 2.5V17.5M3 6.5L10 10.5L17 6.5" stroke="#0066cc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          AR로 보기
        </a>
      </div>

      {/* 카드 행 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: `${GAP}px`,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingLeft: `${padLeft}px`,
          scrollPaddingLeft: `${padLeft}px`,
          paddingRight: '22px',
          paddingBottom: '8px',
        }}
        className="no-scrollbar"
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              flex: `0 0 min(${CARD_WIDTH}px, calc(100vw - 44px))`,
              scrollSnapAlign: 'start',
              background: '#f5f5f7',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {card.video ? (
              <video
                autoPlay muted loop playsInline
                style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
              >
                <source src={card.video} type="video/mp4" />
                <img src={card.image} alt="" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} />
              </video>
            ) : (
              <img
                src={card.image}
                alt=""
                style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ padding: '24px 28px 32px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em' }}>
                {boldify(card.body, card.bodyBold)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ← → 버튼 — 우측 하단 (카드 우측 끝에 정렬) */}
      <div style={{
        paddingLeft: `${padLeft}px`,
        paddingRight: '22px',
        marginTop: '20px',
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
            transition: 'background 0.2s', opacity: atStart ? 0.5 : 1,
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
            transition: 'background 0.2s', opacity: atEnd ? 0.5 : 1,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M2 2L8 8L2 14" stroke="#3c3c43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  );
}
